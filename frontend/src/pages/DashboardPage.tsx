import { useCallback, useEffect, useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Monitor, Wifi, WifiOff, MapPin, Image, CalendarClock, Activity, Layers, ArrowRight, RefreshCw
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../api/dashboard';
import { devicesApi } from '../api/devices';
import { zonesApi } from '../api/zones';
import StatCard from '../components/ui/StatCard';
import LiveMap from '../components/map/LiveMap';
import type { DeviceLocationMarker, WsEvent, WsDeviceTelemetry, AuditLog } from '../types';
import { useWebSocket } from '../hooks/useWebSocket';

import DeviceAdRotationCard from '../components/devices/DeviceAdRotationCard';

function formatTime(ts: string) {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return ts;
  }
}

function formatDate(ts: string) {
  try {
    return new Date(ts).toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export default function DashboardPage() {
  const [wsConnected, setWsConnected] = useState(false);
  const [liveDevices, setLiveDevices] = useState<DeviceLocationMarker[]>([]);
  const [liveLogs, setLiveLogs] = useState<AuditLog[]>([]);
  // Default to DEV002 — always in Delhi NCR zone with rotating ads
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('DEV002');
  // Fresh REST-fetched playlist for the selected device
  const [freshPlaylist, setFreshPlaylist] = useState<any[] | null>(null);
  const [freshZoneName, setFreshZoneName] = useState<string | null>(null);
  const [freshSlotDuration, setFreshSlotDuration] = useState<number>(3);
  const [playlistFetchTick, setPlaylistFetchTick] = useState(0);
  const fetchingRef = useRef<string>('');

  const { data: overview, refetch: refetchOverview } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: dashboardApi.getOverview,
    refetchInterval: 15_000,
  });

  const { data: locations } = useQuery({
    queryKey: ['device-locations'],
    queryFn: devicesApi.locations,
    refetchInterval: 15_000,
  });

  const { data: zones } = useQuery({
    queryKey: ['zones'],
    queryFn: zonesApi.list,
    refetchInterval: 30_000,
  });

  const { data: zoneStats, refetch: refetchZoneStats } = useQuery({
    queryKey: ['zone-stats'],
    queryFn: dashboardApi.getZoneStats,
    refetchInterval: 10_000,
  });

  const { data: serverLogs } = useQuery({
    queryKey: ['dashboard-logs'],
    queryFn: () => dashboardApi.getLogs(30),
    refetchInterval: 15_000,
  });

  // Keep live logs synced with server logs initial/refreshed state
  useEffect(() => {
    if (serverLogs) {
      setLiveLogs(serverLogs);
    }
  }, [serverLogs]);

  // Seed live devices from initial fetch
  useEffect(() => {
    if (locations) setLiveDevices(locations);
  }, [locations]);

  const handleWsMessage = useCallback(
    (event: WsEvent) => {
      setWsConnected(true);
      const nowIso = new Date().toISOString();

      if (event.event === 'DEVICE_TELEMETRY') {
        const telem = event as WsDeviceTelemetry;
        const deviceId = telem.device_id;
        if (!deviceId) return;

        setLiveDevices((prev) => {
          const exists = prev.find((d) => d.device_id === deviceId);
          if (exists) {
            return prev.map((d) =>
              d.device_id === deviceId
                ? {
                    ...d,
                    name: telem.name || d.name,
                    device_type: telem.device_type || d.device_type,
                    fleet_name: telem.fleet_name || d.fleet_name,
                    latitude: telem.latitude,
                    longitude: telem.longitude,
                    location_name: telem.location_name || d.location_name,
                    status: telem.status,
                    current_zone: telem.current_zone || telem.zone_name,
                    current_content_title: telem.active_content_title,
                    current_content_url: telem.active_content_url,
                    playlist: telem.playlist || d.playlist,
                    slot_duration: telem.slot_duration || d.slot_duration,
                  }
                : d
            );
          } else {
            return [
              ...prev,
              {
                device_id: deviceId,
                name: telem.name || deviceId,
                device_type: telem.device_type || 'BUS',
                fleet_name: telem.fleet_name,
                latitude: telem.latitude,
                longitude: telem.longitude,
                location_name: telem.location_name,
                status: telem.status,
                current_zone: telem.current_zone || telem.zone_name,
                current_content_title: telem.active_content_title,
                current_content_url: telem.active_content_url,
                playlist: telem.playlist || [],
                slot_duration: telem.slot_duration || 3,
              },
            ];
          }
        });

        // Add live activity log item for visual feedback
        const locLabel = telem.location_name || `${telem.latitude.toFixed(3)}, ${telem.longitude.toFixed(3)}`;
        const zoneLabel = telem.zone_name || telem.current_zone || 'Transit';
        const contentLabel = telem.active_content_title ? ` · Showing: ${telem.active_content_title}` : '';
        const msg = `${deviceId} @ ${locLabel} (${zoneLabel})${contentLabel}`;

        setLiveLogs((prev) => [
          {
            id: Date.now(),
            device_id: deviceId,
            event_type: 'LOCATION_UPDATED',
            message: msg,
            timestamp: nowIso,
          },
          ...prev.slice(0, 49),
        ]);

        refetchZoneStats();
      } else if (event.event === 'PLAYLIST_UPDATED') {
        const plEvent = event as any;
        const devId = plEvent.device_id;
        if (devId) {
          setLiveDevices((prev) =>
            prev.map((d) =>
              d.device_id === devId
                ? {
                    ...d,
                    current_zone: plEvent.zone_name || d.current_zone,
                    playlist: plEvent.playlist || d.playlist,
                    slot_duration: plEvent.slot_duration || d.slot_duration,
                  }
                : d
            )
          );
          // Immediately update freshPlaylist for the selected device — fixes stale state bug
          if (devId === selectedDeviceId) {
            if (plEvent.playlist) setFreshPlaylist(plEvent.playlist);
            if (plEvent.zone_name) setFreshZoneName(plEvent.zone_name);
            if (plEvent.slot_duration) setFreshSlotDuration(plEvent.slot_duration);
          }
        }
      } else if (event.event === 'ZONE_CHANGED') {
        // Backend emits ZONE_CHANGED to dashboard; update selected device zone immediately
        const zcEvent = event as any;
        const devId = zcEvent.device_id;
        if (devId && devId === selectedDeviceId) {
          if (zcEvent.zone_name) setFreshZoneName(zcEvent.zone_name);
        }
      } else if (event.event === 'DEVICE_STATUS_CHANGED') {
        const devId = event.device_id;
        if (!devId) return;
        setLiveDevices((prev) =>
          prev.map((d) =>
            d.device_id === devId ? { ...d, status: event.status } : d
          )
        );

        refetchOverview();
        refetchZoneStats();
      }
    },
    [refetchOverview, refetchZoneStats, selectedDeviceId, setFreshPlaylist, setFreshZoneName, setFreshSlotDuration]
  );

  useWebSocket({
    onMessage: handleWsMessage,
    onOpen: () => setWsConnected(true),
    onClose: () => setWsConnected(false),
  });

  const onlineCount = liveDevices.filter((d) => d.status === 'ONLINE').length;
  const offlineCount = liveDevices.filter((d) => d.status !== 'ONLINE').length;

  const selectedDevice =
    liveDevices.find((d) => d.device_id === selectedDeviceId) ||
    liveDevices.find((d) => d.device_id === 'DEV002') ||
    liveDevices[0];

  // Fetch fresh playlist via REST whenever selected device changes
  useEffect(() => {
    if (!selectedDeviceId) return;
    fetchingRef.current = selectedDeviceId;
    setFreshPlaylist(null); // show spinner briefly
    devicesApi.getPlaylist(selectedDeviceId)
      .then((res) => {
        if (fetchingRef.current !== selectedDeviceId) return; // stale
        setFreshPlaylist(res.playlist || []);
        setFreshZoneName(res.zone_name || null);
        setFreshSlotDuration(res.slot_duration || 3);
        // Also inject into liveDevices so WebSocket updates merge correctly
        setLiveDevices((prev) =>
          prev.map((d) =>
            d.device_id === selectedDeviceId
              ? { ...d, playlist: res.playlist || d.playlist, current_zone: res.zone_name || d.current_zone, slot_duration: res.slot_duration || d.slot_duration }
              : d
          )
        );
      })
      .catch(() => setFreshPlaylist([])); // fallback to empty on error
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDeviceId, playlistFetchTick]);

  // Zone-aware device picker groups
  const demoMovers = ['BUS-001', 'BUS-002', 'BUS-003', 'BUS-004', 'BUS-005', 'BUS-006', 'BUS-007'];
  // Key fixed-zone devices (always in a zone, always rotating)
  const zoneFixedDevices = ['DEV002', 'DEV003', 'KIOSK-04', 'LED-09', 'STATION-101', 'BILLBOARD-002'];

  return (
    <>
      {/* Stat Cards */}
      <div className="stat-grid">
        <StatCard
          label="Total Devices"
          value={overview?.total_devices ?? liveDevices.length}
          sub="Fleet displays registered"
          icon={<Monitor size={22} />}
          color="#3b82f6"
        />
        <StatCard
          label="Online"
          value={overview?.online_devices ?? onlineCount}
          sub="Transmitting telemetry"
          icon={<Wifi size={22} />}
          color="#22c55e"
        />
        <StatCard
          label="Offline"
          value={overview?.offline_devices ?? offlineCount}
          sub="No recent heartbeat"
          icon={<WifiOff size={22} />}
          color="#ef4444"
        />
        <StatCard
          label="Geo Zones"
          value={overview?.total_zones ?? zones?.length ?? 0}
          sub="Active geofence areas"
          icon={<MapPin size={22} />}
          color="#8b5cf6"
        />
        <StatCard
          label="Content Items"
          value={overview?.total_contents ?? 0}
          sub="Assigned media campaigns"
          icon={<Image size={22} />}
          color="#f59e0b"
        />
        <StatCard
          label="Active Schedules"
          value={overview?.active_schedules ?? 0}
          sub="Running time slots"
          icon={<CalendarClock size={22} />}
          color="#06b6d4"
        />
      </div>

      {/* Map + Ad Rotation & Telemetry Grid */}
      <div className="map-logs-grid" style={{ gridTemplateColumns: '1fr 420px' }}>
        {/* Live Fleet Map */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '14px 18px', borderBottom: 'var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
            <div>
              <div className="card-title">Live Fleet Movement Map</div>
              <div className="card-subtitle">Smooth real-time GPS positions, slow route transit & geofence zones</div>
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {liveDevices.filter(d => d.latitude != null).length} active displays
              </span>
              <div className={`ws-indicator ${wsConnected ? '' : 'offline'}`}>
                <span className="dot" />
                {wsConnected ? 'Live' : 'Polling'}
              </div>
            </div>
          </div>

          {/* Device Selector — Zone-Fixed (always rotating) + Moving Buses */}
          <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
            {/* Zone-fixed rotating devices */}
            <div style={{ padding: '6px 16px 4px', display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#22c55e', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.5px', minWidth: 'fit-content' }}>
                ● Zone Devices (Rotating Ads):
              </span>
              {zoneFixedDevices.map((id) => {
                const isSel = selectedDevice?.device_id === id;
                const dev = liveDevices.find(d => d.device_id === id);
                const zLabel = dev?.current_zone || freshZoneName || '…';
                const adCount = isSel && freshPlaylist ? freshPlaylist.length : (dev?.playlist?.length ?? 0);
                return (
                  <button
                    key={id}
                    onClick={() => setSelectedDeviceId(id)}
                    style={{
                      padding: '3px 10px',
                      borderRadius: '99px',
                      fontSize: '11px',
                      fontWeight: isSel ? 700 : 500,
                      background: isSel ? '#22c55e' : 'rgba(34, 197, 94, 0.1)',
                      color: isSel ? '#0f172a' : '#86efac',
                      border: isSel ? '1px solid #22c55e' : '1px solid rgba(34, 197, 94, 0.25)',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>{id}</span>
                    <span style={{ fontSize: '9px', opacity: 0.85 }}>({adCount} ads · {zLabel})</span>
                  </button>
                );
              })}
            </div>
            {/* Moving buses */}
            <div style={{ padding: '4px 16px 6px', display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.5px', minWidth: 'fit-content' }}>
                ○ Moving Buses:
              </span>
              {demoMovers.map((id) => {
                const isSel = selectedDevice?.device_id === id;
                const dev = liveDevices.find(d => d.device_id === id);
                const zLabel = dev?.current_zone || 'Transit';
                return (
                  <button
                    key={id}
                    onClick={() => setSelectedDeviceId(id)}
                    style={{
                      padding: '3px 9px',
                      borderRadius: '99px',
                      fontSize: '11px',
                      fontWeight: isSel ? 700 : 500,
                      background: isSel ? '#38bdf8' : 'rgba(255, 255, 255, 0.06)',
                      color: isSel ? '#0f172a' : '#cbd5e1',
                      border: isSel ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <span>{id}</span>
                    <span style={{ fontSize: '9px', opacity: 0.85 }}>({zLabel})</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="map-container" style={{ flex: 1, minHeight: '500px' }}>
            <LiveMap
              devices={liveDevices}
              zones={zones ?? []}
              selectedDeviceId={selectedDevice?.device_id}
              onSelectDevice={(d) => setSelectedDeviceId(d.device_id)}
            />
          </div>
        </div>

        {/* Right Column: Live 3s Ad Rotation Inspector + Live Activity Feed */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Selected Device Live Ad Rotation Card */}
          {selectedDevice && (
            <DeviceAdRotationCard
              playlist={freshPlaylist !== null ? freshPlaylist : (selectedDevice.playlist || [])}
              slotDuration={freshPlaylist !== null ? freshSlotDuration : (selectedDevice.slot_duration || 3)}
              currentZoneName={freshZoneName !== null ? freshZoneName : selectedDevice.current_zone}
              deviceId={selectedDevice.device_id}
              deviceName={selectedDevice.name}
              deviceType={selectedDevice.device_type}
              status={selectedDevice.status}
              locationName={selectedDevice.location_name}
              showInspectorHeader={true}
            />
          )}
          {/* Manual Refresh button */}
          {selectedDevice && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setPlaylistFetchTick((t) => t + 1)}
                style={{ fontSize: '11px', gap: '5px' }}
              >
                <RefreshCw size={12} /> Refresh Playlist
              </button>
            </div>
          )}

          {/* Real-time Activity Feed */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', flex: 1, maxHeight: '380px' }}>
            <div className="card-header">
              <div>
                <div className="card-title">Live Telemetry Feed</div>
                <div className="card-subtitle">Zone transitions & content updates</div>
              </div>
              <Activity size={18} style={{ color: 'var(--text-muted)' }} />
            </div>
            <div className="log-list" style={{ overflowY: 'auto', flex: 1 }}>
              {liveLogs.length === 0 && (
                <div className="empty-state" style={{ padding: '24px 0' }}>
                  <Activity size={28} />
                  <p>Awaiting device telemetry...</p>
                </div>
              )}
              {liveLogs.map((log) => {
                const dotColor =
                  log.event_type === 'ZONE_TRANSITION' || log.event_type === 'ZONE_ENTERED' ? '#8b5cf6' :
                  log.event_type === 'CONTENT_TRANSITION' || log.event_type === 'CONTENT_ASSIGNED' ? '#3b82f6' :
                  log.event_type === 'AD_IMPRESSION' ? '#10b981' :
                  log.event_type === 'DEVICE_ONLINE' || log.event_type === 'DEVICE_CONNECTED' ? '#22c55e' :
                  log.event_type === 'DEVICE_OFFLINE' ? '#ef4444' :
                  '#38bdf8';
                return (
                  <div className="log-item" key={log.id}>
                    <div className="log-dot" style={{ background: dotColor }} />
                    <div className="log-body">
                      <div className="log-msg" style={{ fontSize: '12px', lineHeight: 1.4 }}>{log.message}</div>
                      <div className="log-meta">
                        {log.device_id && <strong style={{ color: 'var(--text-primary)' }}>{log.device_id} · </strong>}
                        {formatDate(log.timestamp)} {formatTime(log.timestamp)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Zone Overview Section */}
      <div className="card" style={{ marginTop: '20px' }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} style={{ color: 'var(--accent-blue)' }} />
              Active Zone Distribution
            </div>
            <div className="card-subtitle">Real-time device population across geofenced coverage regions</div>
          </div>
          <Link to="/zones" className="btn btn-secondary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            Manage Zones <ArrowRight size={14} />
          </Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', marginTop: '12px' }}>
          {(!zoneStats || zoneStats.length === 0) ? (
            <div className="empty-state" style={{ gridColumn: '1 / -1', padding: '24px 0' }}>
              <p>No active zones registered.</p>
            </div>
          ) : (
            zoneStats.map((zs) => {
              const zoneDetails = zones?.find(z => z.id === zs.zone_id);
              const assignedContentTitle = zoneDetails?.assigned_content_id
                ? `Assigned Campaign #${zoneDetails.assigned_content_id}`
                : 'Default Fallback';

              return (
                <div
                  key={zs.zone_id}
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius)',
                    background: 'var(--bg-hover)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: zs.color || '#3b82f6',
                          boxShadow: `0 0 8px ${zs.color || '#3b82f6'}88`,
                        }}
                      />
                      <span style={{ fontWeight: 600, fontSize: '15px' }}>{zs.name}</span>
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background: zs.online_count && zs.online_count > 0 ? 'rgba(34, 197, 94, 0.15)' : 'var(--bg-surface)',
                        color: zs.online_count && zs.online_count > 0 ? '#22c55e' : 'var(--text-muted)',
                        fontWeight: 600
                      }}
                    >
                      {zs.online_count || 0} Online
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: '4px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Total Devices Inside:</span>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>{zs.device_count}</span>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '8px' }}>
                    {assignedContentTitle}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}

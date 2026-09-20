import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Monitor, Wifi, WifiOff, MapPin, Image, CalendarClock, Activity, Layers, ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { dashboardApi } from '../api/dashboard';
import { devicesApi } from '../api/devices';
import { zonesApi } from '../api/zones';
import StatCard from '../components/ui/StatCard';
import LiveMap from '../components/map/LiveMap';
import type { DeviceLocationMarker, WsEvent, WsDeviceTelemetry, AuditLog } from '../types';
import { useWebSocket } from '../hooks/useWebSocket';

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
    [refetchOverview, refetchZoneStats]
  );

  useWebSocket({
    onMessage: handleWsMessage,
    onOpen: () => setWsConnected(true),
    onClose: () => setWsConnected(false),
  });

  const onlineCount = liveDevices.filter((d) => d.status === 'ONLINE').length;
  const offlineCount = liveDevices.filter((d) => d.status !== 'ONLINE').length;

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

      {/* Map + Activity Grid */}
      <div className="map-logs-grid">
        {/* Live Fleet Map */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: 'var(--glass-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="card-title">Live Fleet Movement Map</div>
              <div className="card-subtitle">Real-time GPS positions, routes & geofence zones</div>
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
          <div className="map-container">
            <LiveMap devices={liveDevices} zones={zones ?? []} />
          </div>
        </div>

        {/* Real-time Activity Feed */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="card-header">
            <div>
              <div className="card-title">Live Telemetry Feed</div>
              <div className="card-subtitle">Zone transitions & content updates</div>
            </div>
            <Activity size={18} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div className="log-list" style={{ maxHeight: 420, overflowY: 'auto' }}>
            {liveLogs.length === 0 && (
              <div className="empty-state" style={{ padding: '30px 0' }}>
                <Activity size={32} />
                <p>Awaiting device telemetry...</p>
              </div>
            )}
            {liveLogs.map((log) => {
              const dotColor =
                log.event_type === 'ZONE_TRANSITION' || log.event_type === 'ZONE_ENTERED' ? '#8b5cf6' :
                log.event_type === 'CONTENT_TRANSITION' || log.event_type === 'CONTENT_ASSIGNED' ? '#3b82f6' :
                log.event_type === 'DEVICE_ONLINE' || log.event_type === 'DEVICE_CONNECTED' ? '#22c55e' :
                log.event_type === 'DEVICE_OFFLINE' ? '#ef4444' :
                '#10b981';
              return (
                <div className="log-item" key={log.id}>
                  <div className="log-dot" style={{ background: dotColor }} />
                  <div className="log-body">
                    <div className="log-msg" style={{ fontSize: '13px', lineHeight: 1.4 }}>{log.message}</div>
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

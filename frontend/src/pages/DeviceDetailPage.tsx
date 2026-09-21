import { useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, RefreshCw, RotateCcw, Monitor, MapPin, Film,
  Clock, ShieldCheck, Activity, Copy, Check, ExternalLink,
  Bus, Train, Tv2, LayoutGrid, Radio, Cpu, Layers
} from 'lucide-react';
import { devicesApi } from '../api/devices';
import { zonesApi } from '../api/zones';
import DeviceStatusBadge from '../components/devices/DeviceStatusBadge';
import LiveMap from '../components/map/LiveMap';
import DeviceAdRotationCard from '../components/devices/DeviceAdRotationCard';
import type { DeviceLocationMarker, WsEvent } from '../types';
import { useWebSocket } from '../hooks/useWebSocket';

function formatDate(ts?: string | null) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString([], {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  } catch {
    return ts;
  }
}

function DeviceTypeIcon({ type }: { type: string }) {
  const s = { size: 16 };
  switch (type) {
    case 'BUS': return <Bus {...s} />;
    case 'TRAIN': return <Train {...s} />;
    case 'STATION': return <Radio {...s} />;
    case 'DIGITAL_SIGNAGE': return <Tv2 {...s} />;
    case 'KIOSK': return <LayoutGrid {...s} />;
    case 'LED_SCREEN': return <Monitor {...s} />;
    default: return <Cpu {...s} />;
  }
}

export default function DeviceDetailPage() {
  const { device_id } = useParams<{ device_id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  // Live state updated immediately via WebSocket (overrides REST cache on zone change)
  const [livePlaylist, setLivePlaylist] = useState<any[] | null>(null);
  const [liveZoneName, setLiveZoneName] = useState<string | null>(null);
  const [liveSlotDuration, setLiveSlotDuration] = useState<number | null>(null);

  const { data: device, isLoading, error, refetch } = useQuery({
    queryKey: ['device-detail', device_id],
    queryFn: () => devicesApi.get(device_id!),
    enabled: !!device_id,
    refetchInterval: 8_000,
  });

  const { data: allZones } = useQuery({
    queryKey: ['zones'],
    queryFn: zonesApi.list,
  });

  // Handle incoming real-time telemetry if it relates to this device
  const handleWsMessage = useCallback((event: WsEvent) => {
    if (event.device_id !== device_id) return;
    const e = event as any;
    if (e.event === 'PLAYLIST_UPDATED' || e.type === 'PLAYLIST_UPDATED') {
      // Immediately update playlist without waiting for REST refetch
      if (e.playlist) setLivePlaylist(e.playlist);
      if (e.zone_name) setLiveZoneName(e.zone_name);
      if (e.slot_duration) setLiveSlotDuration(e.slot_duration);
      console.log(`[PLAYER] ${device_id}: received PLAYLIST_UPDATED → zone=${e.zone_name}, items=${(e.playlist || []).length}`);
    }
    // Always trigger a refetch to sync rest of device metadata
    refetch();
  }, [device_id, refetch]);

  useWebSocket({ onMessage: handleWsMessage });

  const actionMutation = useMutation({
    mutationFn: (action: string) => devicesApi.executeAction(device_id!, action),
    onSuccess: (_, action) => {
      setActionSuccess(`Command "${action}" dispatched successfully!`);
      setTimeout(() => setActionSuccess(null), 3500);
      qc.invalidateQueries({ queryKey: ['device-detail', device_id] });
    },
  });

  const handleCopyToken = () => {
    if (device?.token) {
      navigator.clipboard.writeText(device.token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="card" style={{ padding: '60px', textAlign: 'center' }}>
        <span className="spinner" style={{ width: 32, height: 32 }} />
        <p style={{ marginTop: '16px', color: 'var(--text-secondary)' }}>Loading device telemetry…</p>
      </div>
    );
  }

  if (error || !device) {
    return (
      <div className="card" style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ color: 'var(--accent-red)', fontSize: '18px', fontWeight: 600 }}>Device Not Found</div>
        <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
          Could not locate device with ID &quot;{device_id}&quot;.
        </p>
        <button className="btn btn-secondary btn-sm" style={{ marginTop: '16px' }} onClick={() => navigate('/devices')}>
          <ArrowLeft size={14} /> Back to Devices
        </button>
      </div>
    );
  }

  // Build marker for LiveMap
  const mapMarkers: DeviceLocationMarker[] = device.current_lat != null && device.current_lon != null ? [{
    device_id: device.device_id,
    name: device.name,
    device_type: device.device_type,
    latitude: device.current_lat,
    longitude: device.current_lon,
    location_name: device.location_name,
    status: device.status,
    current_zone: device.current_zone?.name,
    current_content_title: device.active_content?.title,
    current_content_url: device.active_content?.file_url,
  }] : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* ── Top Navigation & Actions Bar ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/devices')}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={14} /> Back
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '22px', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                {device.name}
              </h1>
              <DeviceStatusBadge status={device.status} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '13px', color: 'var(--text-muted)' }}>
              <span style={{ fontFamily: 'monospace', color: 'var(--accent-blue)', fontWeight: 600 }}>{device.device_id}</span>
              <span>·</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <DeviceTypeIcon type={device.device_type} />
                {device.device_type.replace('_', ' ')}
              </span>
              {device.fleet && (
                <>
                  <span>·</span>
                  <span>Fleet: <strong style={{ color: 'var(--text-secondary)' }}>{device.fleet.name}</strong></span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Remote Actions Bar */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => actionMutation.mutate('RESTART_PLAYER')}
            disabled={actionMutation.isPending}
            title="Restart edge player container/process"
          >
            <RotateCcw size={14} /> Restart Player
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => actionMutation.mutate('SYNC_CONTENT')}
            disabled={actionMutation.isPending}
            title="Force immediate cache revalidation & media download"
          >
            <RefreshCw size={14} /> Sync Content
          </button>
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => actionMutation.mutate('REFRESH_CONFIG')}
            disabled={actionMutation.isPending}
            title="Reload heartbeat interval & token configs"
          >
            <ShieldCheck size={14} /> Refresh Config
          </button>
          <a
            href={`http://127.0.0.1:8000/player/${device.device_id}?device_id=${device.device_id}&token=${device.token || ''}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <ExternalLink size={14} /> Open Edge Player
          </a>
        </div>
      </div>

      {actionSuccess && (
        <div
          style={{
            padding: '10px 16px',
            background: 'rgba(34, 197, 94, 0.15)',
            border: '1px solid #22c55e',
            color: '#22c55e',
            borderRadius: 'var(--radius)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Check size={16} /> {actionSuccess}
        </div>
      )}

      {/* ── Main Content Grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        
        {/* Left Column: GPS & Live Position */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Map Card */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: 'var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={16} style={{ color: 'var(--accent-blue)' }} /> Current GPS Position
                </div>
                <div className="card-subtitle">
                  {device.location_name || 'Coordinates tracking'}
                </div>
              </div>
              <span style={{ fontSize: '12px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                {device.current_lat?.toFixed(4)}, {device.current_lon?.toFixed(4)}
              </span>
            </div>
            <div style={{ height: '280px', width: '100%', position: 'relative' }}>
              {device.current_lat != null && device.current_lon != null ? (
                <LiveMap devices={mapMarkers} zones={allZones ?? []} />
              ) : (
                <div className="empty-state" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                  <MapPin size={32} />
                  <p>No GPS telemetry received yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Device Telemetry Details */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Telemetry & System Metadata</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '13px' }}>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>Last Heartbeat</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatDate(device.last_seen)}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>Heartbeat Interval</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{device.refresh_interval || 10} seconds</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>Registered Date</span>
                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatDate(device.created_at)}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase' }}>Current Geofence</span>
                <span style={{ fontWeight: 600, color: device.current_zone ? 'var(--accent-green)' : 'var(--text-muted)' }}>
                  {device.current_zone?.name || 'Transit Area / Outside'}
                </span>
              </div>
            </div>

            {/* Token section */}
            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', display: 'block', marginBottom: '6px' }}>
                Device Authentication Token
              </span>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  type="password"
                  readOnly
                  value={device.token || '—'}
                  className="form-input"
                  style={{ fontFamily: 'monospace', fontSize: '12px', margin: 0 }}
                />
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={handleCopyToken}
                  title="Copy token to clipboard"
                  style={{ whiteSpace: 'nowrap' }}
                >
                  {copied ? <Check size={14} style={{ color: '#22c55e' }} /> : <Copy size={14} />}
                  {copied ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: Currently Playing Media & Decision Reason */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Live Ad Rotation & Content Inspector */}
          <DeviceAdRotationCard
            playlist={livePlaylist !== null ? livePlaylist : (device.playlist || (device.active_content ? [{
              campaign_id: null,
              content_id: device.active_content.id,
              title: device.active_content.title,
              file_url: device.active_content.file_url,
              media_type: device.active_content.media_type,
              duration: device.active_content.duration,
              priority: 5,
              description: device.active_content.description
            }] : []))}
            slotDuration={liveSlotDuration !== null ? liveSlotDuration : (device.slot_duration || 3)}
            currentZoneName={liveZoneName !== null ? liveZoneName : device.current_zone?.name}
            deviceId={device.device_id}
            deviceName={device.name}
            deviceType={device.device_type}
            status={device.status}
            locationName={device.location_name}
            showInspectorHeader={false}
          />

          {/* Activity Log for this Device */}
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div className="card-header">
              <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={16} style={{ color: 'var(--accent-blue)' }} /> Device Audit History
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {device.recent_logs?.length || 0} events recorded
              </span>
            </div>

            <div className="log-list" style={{ maxHeight: 260, overflowY: 'auto' }}>
              {(!device.recent_logs || device.recent_logs.length === 0) ? (
                <div className="empty-state" style={{ padding: '20px 0' }}>
                  <p>No audit records found for this display.</p>
                </div>
              ) : (
                device.recent_logs.map((l) => (
                  <div className="log-item" key={l.id}>
                    <div
                      className="log-dot"
                      style={{
                        background:
                          l.event_type === 'ZONE_TRANSITION' ? '#8b5cf6' :
                          l.event_type === 'CONTENT_TRANSITION' ? '#3b82f6' :
                          l.event_type === 'DEVICE_ONLINE' ? '#22c55e' :
                          l.event_type === 'DEVICE_OFFLINE' ? '#ef4444' :
                          '#10b981'
                      }}
                    />
                    <div className="log-body">
                      <div className="log-msg" style={{ fontSize: '12px' }}>{l.message}</div>
                      <div className="log-meta">{formatDate(l.timestamp)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

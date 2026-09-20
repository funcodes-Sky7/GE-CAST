import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Trash2, Edit2, Monitor, RefreshCw, Search, Filter,
  ChevronLeft, ChevronRight, Bus, Train, MapPin, Tv2, LayoutGrid, Radio,
  Cpu, X, Eye, Activity, AlertTriangle, Wifi, WifiOff, List, Map, ExternalLink
} from 'lucide-react';
import { devicesApi } from '../api/devices';
import { contentApi } from '../api/content';
import { zonesApi } from '../api/zones';
import DeviceStatusBadge from '../components/devices/DeviceStatusBadge';
import DeviceSummaryCards from '../components/devices/DeviceSummaryCards';
import LiveMap from '../components/map/LiveMap';
import Modal from '../components/ui/Modal';
import { useWebSocket } from '../hooks/useWebSocket';
import type {
  DeviceListItem, DeviceCreateInput, DeviceQueryParams, DeviceStats, DeviceDetail,
  DeviceLocationMarker, WsEvent,
} from '../types';


// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(ts?: string | null) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString([], {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

const DEVICE_TYPES = ['BUS', 'TRAIN', 'STATION', 'DIGITAL_SIGNAGE', 'KIOSK', 'LED_SCREEN'];

function DeviceTypeIcon({ type }: { type: string }) {
  const s = { size: 14 };
  switch (type) {
    case 'BUS':           return <Bus {...s} />;
    case 'TRAIN':         return <Train {...s} />;
    case 'STATION':       return <Radio {...s} />;
    case 'DIGITAL_SIGNAGE': return <Tv2 {...s} />;
    case 'KIOSK':         return <LayoutGrid {...s} />;
    case 'LED_SCREEN':    return <Monitor {...s} />;
    default:              return <Cpu {...s} />;
  }
}

// ─── Register Modal ─────────────────────────────────────────────────────────

function RegisterModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<DeviceCreateInput>({
    device_id: '',
    name: '',
    device_type: 'DIGITAL_SIGNAGE',
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: devicesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['devices'] });
      onClose();
    },
    onError: (e: any) => setError(e.response?.data?.detail ?? 'Failed to register device'),
  });

  return (
    <Modal
      title="Register New Device"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={() => mutation.mutate(form)}
            disabled={mutation.isPending || !form.device_id || !form.name}
          >
            {mutation.isPending ? <span className="spinner" /> : <Plus size={15} />}
            Register Device
          </button>
        </>
      }
    >
      {error && <div className="login-error" style={{ marginBottom: '16px' }}>{error}</div>}
      <div className="form-group">
        <label className="form-label">Device ID *</label>
        <input
          className="form-input"
          value={form.device_id}
          onChange={(e) => setForm({ ...form, device_id: e.target.value })}
          placeholder="e.g. BUS-042"
        />
      </div>
      <div className="form-group">
        <label className="form-label">Display Name *</label>
        <input
          className="form-input"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Route 42 Bus Screen"
        />
      </div>
      <div className="form-group">
        <label className="form-label">Device Type *</label>
        <select
          className="form-select"
          value={form.device_type}
          onChange={(e) => setForm({ ...form, device_type: e.target.value as any })}
        >
          {DEVICE_TYPES.map((t) => (
            <option key={t} value={t}>{t.replace('_', ' ')}</option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label className="form-label">Refresh Interval (sec)</label>
        <input
          type="number"
          className="form-input"
          min={5}
          max={3600}
          value={form.refresh_interval ?? 30}
          onChange={(e) => setForm({ ...form, refresh_interval: Number(e.target.value) })}
        />
      </div>
    </Modal>
  );
}

// ─── Edit Modal ──────────────────────────────────────────────────────────────

function EditModal({ device, onClose }: { device: DeviceListItem; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: contents } = useQuery({ queryKey: ['content'], queryFn: contentApi.list });

  const [form, setForm] = useState({
    name: device.name,
    refresh_interval: device.refresh_interval,
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (data: Partial<DeviceListItem>) => devicesApi.update(device.device_id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['devices'] });
      onClose();
    },
    onError: (e: any) => setError(e.response?.data?.detail ?? 'Update failed'),
  });

  return (
    <Modal
      title={`Edit — ${device.name}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={() => mutation.mutate(form)}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? <span className="spinner" /> : <Edit2 size={15} />}
            Save Changes
          </button>
        </>
      }
    >
      {error && <div className="login-error" style={{ marginBottom: '16px' }}>{error}</div>}
      <div className="form-group">
        <label className="form-label">Display Name</label>
        <input
          className="form-input"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </div>
      <div className="form-group">
        <label className="form-label">Refresh Interval (seconds)</label>
        <input
          type="number"
          className="form-input"
          min={5}
          max={3600}
          value={form.refresh_interval}
          onChange={(e) => setForm({ ...form, refresh_interval: Number(e.target.value) })}
        />
      </div>
    </Modal>
  );
}

// ─── Device Detail Drawer ────────────────────────────────────────────────────

function DeviceDrawer({ deviceId, onClose }: { deviceId: string; onClose: () => void }) {
  const navigate = useNavigate();
  const { data: device, isLoading } = useQuery<DeviceDetail>({
    queryKey: ['device-detail', deviceId],
    queryFn: () => devicesApi.get(deviceId),
    refetchInterval: 10_000,
  });

  const qc = useQueryClient();

  const actionMutation = useMutation({
    mutationFn: (action: string) => devicesApi.executeAction(deviceId, action),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['device-detail', deviceId] }),
  });

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        display: 'flex', justifyContent: 'flex-end',
      }}
    >
      {/* Backdrop */}
      <div
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)' }}
        onClick={onClose}
      />
      {/* Panel */}
      <div
        style={{
          position: 'relative', width: 420, background: 'var(--bg-card)',
          borderLeft: 'var(--glass-border)', height: '100%', overflowY: 'auto',
          padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button className="btn btn-secondary btn-sm" onClick={onClose}><X size={14} /></button>
          <div>
            <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
              {device?.name ?? deviceId}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Device Quick View</div>
          </div>
          <button
            className="btn btn-secondary btn-sm"
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}
            onClick={() => { onClose(); navigate(`/devices/${deviceId}`); }}
            title="Open dedicated device page"
          >
            <ExternalLink size={13} /> Full Page
          </button>
        </div>


        {isLoading && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            <span className="spinner" style={{ width: 28, height: 28 }} />
          </div>
        )}

        {device && (
          <>
            {/* Status + ID */}
            <div className="card" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <DeviceStatusBadge status={device.status} />
                <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--accent-blue)' }}>
                  {device.device_id}
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px' }}>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '2px' }}>Type</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-primary)', fontWeight: 500 }}>
                    <DeviceTypeIcon type={device.device_type} />
                    {device.device_type.replace('_', ' ')}
                  </div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '2px' }}>Last Seen</div>
                  <div style={{ color: 'var(--text-primary)' }}>{formatDate(device.last_seen)}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '2px' }}>Fleet</div>
                  <div style={{ color: 'var(--text-primary)' }}>{device.fleet?.name ?? '—'}</div>
                </div>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '11px', marginBottom: '2px' }}>Refresh</div>
                  <div style={{ color: 'var(--text-primary)' }}>{device.refresh_interval}s</div>
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="card" style={{ padding: '14px 16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                <MapPin size={14} /> Location
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                {device.current_lat != null && device.current_lon != null
                  ? `${device.current_lat.toFixed(5)}, ${device.current_lon.toFixed(5)}`
                  : 'No GPS data'}
              </div>
              {device.current_zone && (
                <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--accent-blue)' }}>
                  Zone: <strong>{device.current_zone.name}</strong>
                </div>
              )}
            </div>

            {/* Content */}
            {device.active_content && (
              <div className="card" style={{ padding: '14px 16px' }}>
                <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Now Playing
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {device.active_content.title}
                </div>
                {device.assignment_reason && (
                  <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    {device.assignment_reason}
                  </div>
                )}
              </div>
            )}

            {/* Remote Actions */}
            <div>
              <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '10px' }}>
                Remote Actions
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {[
                  { action: 'RESTART_PLAYER', label: 'Restart Player' },
                  { action: 'SYNC_CONTENT', label: 'Sync Content' },
                  { action: 'REFRESH_CONFIG', label: 'Refresh Config' },
                ].map(({ action, label }) => (
                  <button
                    key={action}
                    className="btn btn-secondary btn-sm"
                    onClick={() => actionMutation.mutate(action)}
                    disabled={actionMutation.isPending}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Activity Logs */}
            {device.recent_logs && device.recent_logs.length > 0 && (
              <div>
                <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)', marginBottom: '10px' }}>
                  Recent Activity
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {device.recent_logs.slice(0, 10).map((log) => (
                    <div
                      key={log.id}
                      style={{
                        background: 'var(--bg-hover)',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        fontSize: '12px',
                      }}
                    >
                      <div style={{ color: 'var(--text-primary)', marginBottom: '2px' }}>{log.message || log.event_type}</div>
                      <div style={{ color: 'var(--text-muted)' }}>{formatDate(log.timestamp)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function DevicesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<'table' | 'map'>('table');
  const [showRegister, setShowRegister] = useState(false);
  const [editDevice, setEditDevice] = useState<DeviceListItem | null>(null);
  const [detailDeviceId, setDetailDeviceId] = useState<string | null>(null);

  // Filter state
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const params: DeviceQueryParams = {
    page,
    page_size: 25,
    search: search || undefined,
    device_type: typeFilter || undefined,
    status: statusFilter || undefined,
    sort_by: 'last_seen',
    sort_order: 'desc',
  };

  const { data, isLoading } = useQuery({
    queryKey: ['devices', params],
    queryFn: () => devicesApi.listPaginated(params),
    refetchInterval: 15_000,
    placeholderData: (prev) => prev,
  });

  const { data: mapLocations } = useQuery({
    queryKey: ['device-locations'],
    queryFn: devicesApi.locations,
    refetchInterval: 8_000, // fallback REST poll — WS is primary
  });

  const { data: zones } = useQuery({
    queryKey: ['zones'],
    queryFn: zonesApi.list,
  });

  // ── Live device location state merged from WebSocket telemetry ──────────────
  // Starts from the REST snapshot and gets patched in real-time by WS events.
  const [liveLocations, setLiveLocations] = useState<DeviceLocationMarker[]>([]);

  // Seed liveLocations whenever the REST snapshot arrives / refreshes
  useEffect(() => {
    if (mapLocations && mapLocations.length > 0) {
      setLiveLocations(mapLocations);
    }
  }, [mapLocations]);

  // WebSocket handler — patch individual device entries on DEVICE_TELEMETRY
  const handleWsMessage = useCallback((evt: WsEvent) => {
    if (evt.event !== 'DEVICE_TELEMETRY') return;
    const telem = evt as any;
    setLiveLocations((prev) => {
      const idx = prev.findIndex((d) => d.device_id === telem.device_id);
      const updated: DeviceLocationMarker = {
        device_id: telem.device_id,
        name: telem.name ?? (idx >= 0 ? prev[idx].name : telem.device_id),
        device_type: telem.device_type ?? (idx >= 0 ? prev[idx].device_type : undefined),
        fleet_name: telem.fleet_name ?? (idx >= 0 ? prev[idx].fleet_name : undefined),
        latitude: telem.latitude ?? (idx >= 0 ? prev[idx].latitude : null),
        longitude: telem.longitude ?? (idx >= 0 ? prev[idx].longitude : null),
        location_name: telem.location_name ?? (idx >= 0 ? prev[idx].location_name : undefined),
        status: telem.status ?? (idx >= 0 ? prev[idx].status : 'OFFLINE'),
        // Accurately update zone & content even when exiting zone or changing ad
        current_zone: 'zone_name' in telem ? telem.zone_name : ('current_zone' in telem ? telem.current_zone : (idx >= 0 ? prev[idx].current_zone : null)),
        current_content_title: 'active_content_title' in telem ? telem.active_content_title : (idx >= 0 ? prev[idx].current_content_title : null),
        current_content_url: 'active_content_url' in telem ? telem.active_content_url : (idx >= 0 ? prev[idx].current_content_url : null),
        last_seen: telem.last_seen ?? new Date().toISOString(),
      };
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updated;
        return next;
      }
      return [...prev, updated];
    });
  }, []);

  useWebSocket({ onMessage: handleWsMessage });


  const deleteMutation = useMutation({
    mutationFn: devicesApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['devices'] }),
  });

  const handleDelete = useCallback((d: DeviceListItem) => {
    if (confirm(`Delete device "${d.name}" (${d.device_id})? This cannot be undone.`)) {
      deleteMutation.mutate(d.device_id);
    }
  }, [deleteMutation]);

  const devices = data?.items ?? [];
  const stats: DeviceStats | undefined = data?.stats;
  const totalPages = data?.total_pages ?? 1;

  return (
    <>
      {/* ── Header ── */}
      <div className="page-header">
        <div>
          <div className="page-title">DEVICES</div>
          <div className="page-subtitle">
            Manage and monitor your fleet of {data?.total ?? 0} display devices
          </div>
        </div>
        <div className="action-row">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => qc.invalidateQueries({ queryKey: ['devices'] })}
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={() => setShowRegister(true)}>
            <Plus size={15} /> Register Device
          </button>
        </div>
      </div>

      {/* ── Summary Cards ── */}
      {stats && <DeviceSummaryCards stats={stats} />}

      {/* ── Filter Bar ── */}
      <div className="card" style={{ padding: '14px 18px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: '180px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="form-input"
              style={{ paddingLeft: '32px', margin: 0 }}
              placeholder="Search by ID, name, location, fleet…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>

          {/* Type Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={13} style={{ color: 'var(--text-muted)' }} />
            <select
              className="form-select"
              style={{ minWidth: '140px', margin: 0 }}
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Types</option>
              {DEVICE_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
          </div>

          {/* Status Filter */}
          <select
            className="form-select"
            style={{ minWidth: '130px', margin: 0 }}
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          >
            <option value="">All Statuses</option>
            <option value="ONLINE">Online</option>
            <option value="OFFLINE">Offline</option>
            <option value="WARNING">Warning</option>
          </select>

          {/* Clear filters */}
          {(search || typeFilter || statusFilter) && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => { setSearch(''); setTypeFilter(''); setStatusFilter(''); setPage(1); }}
            >
              <X size={13} /> Clear
            </button>
          )}

          {/* Live count */}
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {data?.total ?? 0} device{(data?.total ?? 0) !== 1 ? 's' : ''}
          </span>

          {/* View Mode Toggle: Table / Map */}
          <div style={{ display: 'flex', background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', padding: '2px', marginLeft: 'auto' }}>
            <button
              type="button"
              className="btn btn-sm"
              style={{
                padding: '4px 10px',
                fontSize: '12px',
                background: viewMode === 'table' ? 'var(--bg-hover)' : 'transparent',
                color: viewMode === 'table' ? 'var(--text-primary)' : 'var(--text-muted)',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
              onClick={() => setViewMode('table')}
            >
              <List size={13} /> Table
            </button>
            <button
              type="button"
              className="btn btn-sm"
              style={{
                padding: '4px 10px',
                fontSize: '12px',
                background: viewMode === 'map' ? 'var(--bg-hover)' : 'transparent',
                color: viewMode === 'map' ? 'var(--text-primary)' : 'var(--text-muted)',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
              onClick={() => setViewMode('map')}
            >
              <Map size={13} /> Map View
            </button>
          </div>
        </div>
      </div>

      {/* ── View Rendering (Map vs Table) ── */}
      {viewMode === 'map' ? (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: 'var(--glass-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="card-title">Live Fleet Map View</div>
              <div className="card-subtitle">Geographic visualization of all active displays and geofences</div>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {mapLocations?.length ?? 0} displays mapped
            </span>
          </div>
          <div className="map-container" style={{ height: '580px' }}>
            <LiveMap devices={liveLocations.length > 0 ? liveLocations : (mapLocations ?? [])} zones={zones ?? []} />
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-wrapper">
            {isLoading && devices.length === 0 ? (
              <div className="empty-state">
                <span className="spinner" style={{ width: 28, height: 28 }} />
                <p>Loading devices…</p>
              </div>
            ) : devices.length === 0 ? (
              <div className="empty-state">
                <Monitor size={40} />
                <p>No devices found</p>
                <button className="btn btn-primary" style={{ marginTop: '12px' }} onClick={() => setShowRegister(true)}>
                  <Plus size={14} /> Register your first device
                </button>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Device</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Location</th>
                    <th>Zone</th>
                    <th>Content</th>
                    <th>Last Seen</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {devices.map((d) => (
                    <tr key={d.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/devices/${d.device_id}`)}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '13px' }}>{d.name}</div>
                        <div style={{ fontFamily: 'monospace', color: 'var(--accent-blue)', fontSize: '11px' }}>{d.device_id}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                          <DeviceTypeIcon type={d.device_type} />
                          {d.device_type.replace('_', ' ')}
                        </div>
                      </td>
                      <td><DeviceStatusBadge status={d.status} /></td>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {d.current_lat != null && d.current_lon != null
                          ? `${d.current_lat.toFixed(4)}, ${d.current_lon.toFixed(4)}`
                          : d.location_name ?? '—'}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {d.current_zone?.name
                          ? <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={11} />{d.current_zone.name}</span>
                          : '—'}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {d.active_content?.title
                          ? <span className="truncate" style={{ maxWidth: '160px', display: 'block' }}>{d.active_content.title}</span>
                          : '—'}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{formatDate(d.last_seen)}</td>
                      <td>
                        <div className="action-row" style={{ justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                          <button
                            className="btn btn-secondary btn-sm"
                            title="Quick Drawer View"
                            onClick={() => setDetailDeviceId(d.device_id)}
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            title="Edit"
                            onClick={() => setEditDevice(d)}
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            title="Delete"
                            onClick={() => handleDelete(d)}
                            disabled={deleteMutation.isPending}
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 20px', borderTop: 'var(--glass-border)', fontSize: '13px',
              color: 'var(--text-muted)',
            }}>
              <span>Page {page} of {totalPages} ({data?.total} total)</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  className="btn btn-secondary btn-sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}


      {/* ── Modals / Drawers ── */}
      {showRegister && <RegisterModal onClose={() => setShowRegister(false)} />}
      {editDevice && <EditModal device={editDevice} onClose={() => setEditDevice(null)} />}
      {detailDeviceId && (
        <DeviceDrawer deviceId={detailDeviceId} onClose={() => setDetailDeviceId(null)} />
      )}
    </>
  );
}

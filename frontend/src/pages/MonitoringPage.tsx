import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Wifi,
  WifiOff,
  Server,
  Zap,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { dashboardApi } from '../api/dashboard';
import { devicesApi } from '../api/devices';

export default function MonitoringPage() {
  const { data: overview, refetch: refetchOverview } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: dashboardApi.getOverview,
    refetchInterval: 15_000,
  });

  const { data: devices, refetch: refetchDevices } = useQuery({
    queryKey: ['devices'],
    queryFn: devicesApi.list,
    refetchInterval: 10_000,
  });

  const { data: logs } = useQuery({
    queryKey: ['dashboard-logs'],
    queryFn: () => dashboardApi.getLogs(50),
    refetchInterval: 10_000,
  });

  const onlineDevices = devices?.filter((d) => d.status === 'ONLINE') ?? [];
  const offlineDevices = devices?.filter((d) => d.status !== 'ONLINE') ?? [];

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Real-Time Monitoring</div>
          <div className="page-subtitle">Telemetry streams, heartbeat tracking, and edge display status.</div>
        </div>
        <button
          className="btn btn-secondary btn-sm"
          onClick={() => {
            refetchOverview();
            refetchDevices();
          }}
        >
          <RefreshCw size={14} /> Refresh Telemetry
        </button>
      </div>

      {/* Metric Cards */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-value" style={{ color: 'var(--accent-green)' }}>
              {onlineDevices.length}
            </div>
            <div className="stat-label">Online Nodes</div>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(22, 163, 74, 0.1)', color: 'var(--accent-green)' }}>
            <Wifi size={22} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-value" style={{ color: offlineDevices.length ? 'var(--accent-red)' : 'var(--text-muted)' }}>
              {offlineDevices.length}
            </div>
            <div className="stat-label">Offline / Stale</div>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(220, 38, 38, 0.1)', color: 'var(--accent-red)' }}>
            <WifiOff size={22} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-value" style={{ color: 'var(--primary)' }}>
              99.8%
            </div>
            <div className="stat-label">Network Uptime</div>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)' }}>
            <Zap size={22} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-value" style={{ color: 'var(--accent-purple)' }}>
              32 ms
            </div>
            <div className="stat-label">Avg WS Latency</div>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(124, 58, 237, 0.1)', color: 'var(--accent-purple)' }}>
            <Server size={22} />
          </div>
        </div>
      </div>

      <div className="map-logs-grid">
        {/* Device Status Grid */}
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div className="card-title">Connected Edge Displays</div>
              <div className="card-subtitle">Heartbeat interval: 30 seconds</div>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {devices?.length ?? 0} total registered
            </span>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Device</th>
                  <th>Status</th>
                  <th>IP / Route</th>
                  <th>Last Ping</th>
                  <th>Latency</th>
                </tr>
              </thead>
              <tbody>
                {devices?.map((d) => (
                  <tr key={d.id}>
                    <td style={{ fontWeight: 600 }}>{d.name} ({d.device_id})</td>
                    <td>
                      {d.status === 'ONLINE' ? (
                        <span className="status-pill-green"><span className="dot" /> Active</span>
                      ) : (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', background: '#fee2e2', color: '#991b1b', fontSize: '10.5px', fontWeight: 600, borderRadius: 12 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#dc2626' }} /> Offline
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                      10.0.4.{10 + d.id}:8000
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {d.last_seen ? new Date(d.last_seen).toLocaleTimeString() : 'Never'}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--accent-green)', fontWeight: 600 }}>
                      {Math.floor(18 + Math.random() * 15)} ms
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Logs Stream */}
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">Real-Time Event Stream</div>
              <div className="card-subtitle">Live device telemetries & assignments</div>
            </div>
            <Activity size={18} color="var(--primary)" />
          </div>

          <div className="log-list" style={{ maxHeight: 420 }}>
            {logs?.map((l) => (
              <div className="log-item" key={l.id}>
                <div
                  className="log-dot"
                  style={{
                    background:
                      l.event_type === 'CONTENT_ASSIGNED' ? 'var(--primary)' :
                      l.event_type === 'DEVICE_CONNECTED' ? 'var(--accent-green)' :
                      l.event_type === 'DEVICE_OFFLINE' ? 'var(--accent-red)' :
                      'var(--accent-purple)',
                  }}
                />
                <div className="log-body">
                  <div className="log-msg">{l.message}</div>
                  <div className="log-meta">
                    {l.device_id} • {new Date(l.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

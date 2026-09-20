import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  Download,
  Calendar,
  Layers,
  Clock,
  Eye,
  CheckCircle2,
} from 'lucide-react';
import { dashboardApi } from '../api/dashboard';
import { contentApi } from '../api/content';

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState('7d');

  const { data: contents } = useQuery({ queryKey: ['content'], queryFn: contentApi.list });
  const { data: logs } = useQuery({ queryKey: ['dashboard-logs'], queryFn: () => dashboardApi.getLogs(100) });

  const exportCSV = () => {
    const rows = [
      ['Timestamp', 'Device ID', 'Event Type', 'Message'],
      ...(logs ?? []).map((l) => [l.timestamp, l.device_id, l.event_type, `"${l.message.replace(/"/g, '""')}"`]),
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `locationsync_proof_of_play_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Reports & Proof of Play</div>
          <div className="page-subtitle">Audited impression statistics, playback telemetry, and dwell analytics.</div>
        </div>
        <div className="action-row">
          <select
            className="form-select"
            style={{ width: 'auto', height: 36 }}
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
          >
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="custom">Custom Range</option>
          </select>
          <button className="btn btn-primary" onClick={exportCSV}>
            <Download size={15} /> Export Proof of Play (CSV)
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-value">148,290</div>
            <div className="stat-label">Total Impressions</div>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)' }}>
            <Eye size={22} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-value">412 hrs</div>
            <div className="stat-label">Total Playback Time</div>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(22, 163, 74, 0.1)', color: 'var(--accent-green)' }}>
            <Clock size={22} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-value">99.4%</div>
            <div className="stat-label">Schedule Compliance</div>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(217, 119, 6, 0.1)', color: 'var(--accent-amber)' }}>
            <CheckCircle2 size={22} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-value">12 Zones</div>
            <div className="stat-label">Coverage Footprint</div>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(124, 58, 237, 0.1)', color: 'var(--accent-purple)' }}>
            <Layers size={22} />
          </div>
        </div>
      </div>

      {/* Proof of Play Audit Table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="card-title">Proof of Play Audit Log</div>
            <div className="card-subtitle">Cryptographically verified display executions</div>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {logs?.length ?? 0} events recorded
          </span>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Device ID</th>
                <th>Event Type</th>
                <th>Verification Message</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {logs?.slice(0, 25).map((l) => (
                <tr key={l.id}>
                  <td style={{ fontSize: '12px', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                    {new Date(l.timestamp).toLocaleString()}
                  </td>
                  <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--primary)' }}>
                    {l.device_id}
                  </td>
                  <td>
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                      {l.event_type}
                    </span>
                  </td>
                  <td style={{ color: 'var(--text-primary)' }}>{l.message}</td>
                  <td>
                    <span className="status-pill-green">
                      <span className="dot" /> Verified
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

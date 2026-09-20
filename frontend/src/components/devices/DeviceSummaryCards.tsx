import React from 'react';
import { Monitor, Wifi, WifiOff, AlertTriangle, MapPin } from 'lucide-react';
import type { DeviceStats } from '../../types/device';

interface Props {
  stats?: DeviceStats;
}

export default function DeviceSummaryCards({ stats }: Props) {
  const total   = stats?.total_devices   ?? 0;
  const online  = stats?.online_devices  ?? 0;
  const offline = stats?.offline_devices ?? 0;
  const warning = stats?.warning_devices ?? 0;
  const zones   = stats?.active_zones    ?? 0;

  return (
    <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: '20px' }}>
      <div className="stat-card">
        <div className="stat-info">
          <div className="stat-value">{total}</div>
          <div className="stat-label">Total Devices</div>
        </div>
        <div className="stat-icon" style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }}>
          <Monitor size={22} />
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-info">
          <div className="stat-value" style={{ color: '#16a34a' }}>{online}</div>
          <div className="stat-label">Online</div>
        </div>
        <div className="stat-icon" style={{ background: 'rgba(22, 163, 74, 0.1)', color: '#16a34a' }}>
          <Wifi size={22} />
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-info">
          <div className="stat-value" style={{ color: offline > 0 ? '#dc2626' : 'var(--text-muted)' }}>
            {offline}
          </div>
          <div className="stat-label">Offline</div>
        </div>
        <div className="stat-icon" style={{ background: 'rgba(220, 38, 38, 0.1)', color: '#dc2626' }}>
          <WifiOff size={22} />
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-info">
          <div className="stat-value" style={{ color: warning > 0 ? '#d97706' : 'var(--text-muted)' }}>
            {warning}
          </div>
          <div className="stat-label">Warning</div>
        </div>
        <div className="stat-icon" style={{ background: 'rgba(217, 119, 6, 0.1)', color: '#d97706' }}>
          <AlertTriangle size={22} />
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-info">
          <div className="stat-value" style={{ color: '#7c3aed' }}>{zones}</div>
          <div className="stat-label">Active Zones</div>
        </div>
        <div className="stat-icon" style={{ background: 'rgba(124, 58, 237, 0.1)', color: '#7c3aed' }}>
          <MapPin size={22} />
        </div>
      </div>
    </div>
  );
}

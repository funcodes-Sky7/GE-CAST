import type { ReactNode, CSSProperties } from 'react';

interface StatCardProps {
  label: string;
  value: number | string;
  sub?: string;
  icon: ReactNode;
  color?: string;
}

export default function StatCard({ label, value, sub, icon, color = '#3b82f6' }: StatCardProps) {
  return (
    <div className="stat-card" style={{ '--stat-color': color } as CSSProperties}>
      <div className="stat-icon" style={{ color }}>
        {icon}
      </div>
      <div className="stat-body">
        <div className="stat-label">{label}</div>
        <div className="stat-value" style={{ color }}>{value}</div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </div>
  );
}

import type { DeviceStatus } from '../../types';

interface StatusBadgeProps {
  status: DeviceStatus | string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const cls =
    status === 'ONLINE' ? 'badge badge-online badge-pulse' :
    status === 'OFFLINE' ? 'badge badge-offline' :
    'badge badge-unknown';
  return <span className={cls}>{status}</span>;
}

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'blue' | 'green' | 'red' | 'amber' | 'unknown';
}

export function Badge({ children, variant = 'blue' }: BadgeProps) {
  const cls = {
    blue: 'badge badge-blue',
    green: 'badge badge-online',
    red: 'badge badge-offline',
    amber: 'badge badge-amber',
    unknown: 'badge badge-unknown',
  }[variant];
  return <span className={cls}>{children}</span>;
}

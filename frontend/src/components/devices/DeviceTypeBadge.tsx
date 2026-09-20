import React from 'react';
import { Bus, Train, Building, Tv, Tablet, Monitor } from 'lucide-react';
import type { DeviceType } from '../../types/device';

interface Props {
  type: DeviceType | string;
}

export default function DeviceTypeBadge({ type }: Props) {
  const norm = (type || 'BUS').toUpperCase();

  let Icon = Bus;
  let label = 'Bus Display';
  let color = '#2563eb';
  let bg = '#eff6ff';

  if (norm === 'TRAIN') {
    Icon = Train;
    label = 'Train Display';
    color = '#7c3aed';
    bg = '#f5f3ff';
  } else if (norm === 'STATION') {
    Icon = Building;
    label = 'Station Display';
    color = '#0284c7';
    bg = '#f0f9ff';
  } else if (norm === 'DIGITAL_SIGNAGE') {
    Icon = Tv;
    label = 'Digital Signage';
    color = '#d97706';
    bg = '#fffbeb';
  } else if (norm === 'KIOSK') {
    Icon = Tablet;
    label = 'Kiosk';
    color = '#059669';
    bg = '#ecfdf5';
  } else if (norm === 'LED_SCREEN') {
    Icon = Monitor;
    label = 'LED Screen';
    color = '#db2777';
    bg = '#fdf2f8';
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '3px 8px',
        borderRadius: '6px',
        fontSize: '11.5px',
        fontWeight: 600,
        background: bg,
        color: color,
      }}
    >
      <Icon size={12} />
      {label}
    </span>
  );
}

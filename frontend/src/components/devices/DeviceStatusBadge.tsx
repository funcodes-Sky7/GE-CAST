import React from 'react';
import type { DeviceStatus } from '../../types/device';

interface Props {
  status: DeviceStatus | string;
}

export default function DeviceStatusBadge({ status }: Props) {
  const norm = (status || '').toUpperCase();

  if (norm === 'ONLINE') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '3px 9px',
          borderRadius: '12px',
          fontSize: '11.5px',
          fontWeight: 600,
          background: '#dcfce7',
          color: '#166534',
          border: '1px solid #bbf7d0',
        }}
      >
        <span style={{ fontSize: '10px' }}>●</span> Online
      </span>
    );
  }

  if (norm === 'WARNING') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '3px 9px',
          borderRadius: '12px',
          fontSize: '11.5px',
          fontWeight: 600,
          background: '#fef3c7',
          color: '#92400e',
          border: '1px solid #fde68a',
        }}
      >
        <span style={{ fontSize: '10px' }}>▲</span> Warning
      </span>
    );
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '3px 9px',
        borderRadius: '12px',
        fontSize: '11.5px',
        fontWeight: 600,
        background: '#fee2e2',
        color: '#991b1b',
        border: '1px solid #fecaca',
      }}
    >
      <span style={{ fontSize: '10px' }}>○</span> Offline
    </span>
  );
}

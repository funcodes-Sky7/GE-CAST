import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Bell, ChevronDown, LogOut, User as UserIcon } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useWebSocket } from '../../hooks/useWebSocket';

interface TopBarProps {
  wsConnected?: boolean;
}

export default function TopBar({ wsConnected: propWsConnected }: TopBarProps) {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [internalWsConnected, setInternalWsConnected] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  useWebSocket({
    onOpen: () => setInternalWsConnected(true),
    onClose: () => setInternalWsConnected(false),
  });

  const wsConnected = propWsConnected !== undefined ? propWsConnected : internalWsConnected;


  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="topbar">
      {/* Center / Left Search Bar */}
      <div style={{ flex: 1, maxWidth: 460 }}>
        <div style={{ position: 'relative', width: '100%' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: 14,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            className="form-input"
            style={{
              paddingLeft: '38px',
              paddingRight: '50px',
              height: '38px',
              borderRadius: '10px',
              background: 'var(--bg-hover)',
              borderColor: 'var(--border)',
              fontSize: '13px',
            }}
            placeholder="Search devices, content, zones, or settings..."
          />
          <span
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              fontSize: '11px',
              fontWeight: 600,
              padding: '2px 6px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              color: 'var(--text-muted)',
            }}
          >
            ⌘ K
          </span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Live Stream Indicator */}
        <div className={`ws-indicator ${wsConnected ? '' : 'offline'}`} title="Real-time WebSocket telemetry">
          <span className="dot" />
          {wsConnected ? 'Live' : 'Polling'}
        </div>

        {/* Notifications Bell */}
        <div style={{ position: 'relative' }}>
          <button
            style={{
              background: 'var(--bg-hover)',
              border: '1px solid var(--border)',
              width: 38,
              height: 38,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              position: 'relative',
              transition: 'all 0.15s',
            }}
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell size={17} />
            <span
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: 'var(--accent-red)',
              }}
            />
          </button>

          {showNotifications && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 46,
                width: 280,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                boxShadow: 'var(--shadow-md)',
                padding: '12px',
                zIndex: 100,
              }}
            >
              <div style={{ fontSize: '13px', fontWeight: 600, borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                Notifications
              </div>
              <div style={{ padding: '10px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                • DEV001 synced with Zone A<br />
                • Summer Sale morning broadcast active<br />
                • Geocast heartbeat: 4 displays verified
              </div>
            </div>
          )}
        </div>

        {/* User Pill Dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '4px 10px 4px 4px',
              background: 'transparent',
              border: 'none',
              borderRadius: '24px',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'var(--primary)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: '14px',
              }}
            >
              {user?.full_name?.[0]?.toUpperCase() ?? 'A'}
            </div>
            <div style={{ textAlign: 'left', lineHeight: 1.2 }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {user?.full_name ?? 'Admin'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                System Administrator
              </div>
            </div>
            <ChevronDown size={14} color="var(--text-muted)" />
          </button>

          {showUserMenu && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 48,
                width: 180,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                boxShadow: 'var(--shadow-md)',
                padding: '6px',
                zIndex: 100,
              }}
            >
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  navigate('/settings');
                }}
                className="dropdown-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: '13px',
                  border: 'none',
                  background: 'none',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  borderRadius: '6px',
                }}
              >
                <UserIcon size={14} /> Profile & Settings
              </button>
              <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
              <button
                onClick={handleLogout}
                className="dropdown-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '8px 10px',
                  fontSize: '13px',
                  border: 'none',
                  background: 'none',
                  color: 'var(--accent-red)',
                  cursor: 'pointer',
                  borderRadius: '6px',
                }}
              >
                <LogOut size={14} /> Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

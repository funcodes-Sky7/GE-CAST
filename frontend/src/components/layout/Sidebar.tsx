import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Home,
  Monitor,
  Edit3,
  Hexagon,
  Calendar,
  Bell,
  BarChart2,
  Settings,
  MapPin,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard',  icon: Home,     label: 'Overview'   },
  { to: '/devices',    icon: Monitor,  label: 'Devices'    },
  { to: '/content',    icon: Edit3,    label: 'Content'    },
  { to: '/zones',      icon: Hexagon,  label: 'Zones'      },
  { to: '/schedules',  icon: Calendar, label: 'Schedule'   },
  { to: '/monitoring', icon: Bell,     label: 'Monitoring' },
  { to: '/reports',    icon: BarChart2,label: 'Reports'    },
  { to: '/settings',   icon: Settings, label: 'Settings'   },
];

const STORAGE_KEY = 'geocast_sidebar_collapsed';

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try { return localStorage.getItem(STORAGE_KEY) === 'true'; }
    catch { return false; }
  });

  // Keep CSS variable in sync so the rest of the layout adjusts
  useEffect(() => {
    const w = collapsed ? '64px' : '250px';
    document.documentElement.style.setProperty('--sidebar-w', w);
    try { localStorage.setItem(STORAGE_KEY, String(collapsed)); }
    catch {}
  }, [collapsed]);

  const toggle = () => setCollapsed(c => !c);

  return (
    <aside
      className="sidebar"
      style={{
        width: collapsed ? '64px' : '250px',
        transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1)',
        position: 'relative',
        overflow: 'visible',  /* let toggle button peek out */
      }}
    >
      {/* ── Brand Header ─────────────────────────────── */}
      <div
        className="sidebar-logo"
        style={{
          padding: collapsed ? '18px 0' : '20px 20px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          overflow: 'hidden',
          gap: '10px',
        }}
      >
        {/* Logo icon always visible */}
        <div
          style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
            flexShrink: 0,
          }}
        >
          <MapPin size={20} />
        </div>

        {/* Text — hidden when collapsed */}
        {!collapsed && (
          <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.3px', lineHeight: 1.1 }}>
              LocationSync
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Right Content. Right Place.
            </div>
          </div>
        )}
      </div>

      {/* ── Collapse Toggle Button ─────────────────────
          Sits on the right edge, half inside / half outside the sidebar */}
      <button
        onClick={toggle}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        style={{
          position: 'absolute',
          top: '22px',
          right: '-13px',
          width: '26px',
          height: '26px',
          borderRadius: '50%',
          border: '1.5px solid var(--border-subtle, rgba(255,255,255,0.1))',
          background: 'var(--bg-card)',
          backdropFilter: 'blur(8px)',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 200,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          transition: 'background 0.15s, color 0.15s, transform 0.15s',
          padding: 0,
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-blue)';
          (e.currentTarget as HTMLButtonElement).style.color = '#fff';
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.1)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-card)';
          (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-secondary)';
          (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
        }}
      >
        {collapsed
          ? <ChevronRight size={14} />
          : <ChevronLeft  size={14} />}
      </button>

      {/* ── Navigation ────────────────────────────────── */}
      <nav
        className="sidebar-nav"
        style={{ padding: collapsed ? '12px 8px' : '12px 10px' }}
      >
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}  /* tooltip when collapsed */
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            style={{
              justifyContent: collapsed ? 'center' : 'flex-start',
              padding: collapsed ? '10px 0' : '10px 12px',
              gap: collapsed ? 0 : '10px',
            }}
          >
            <Icon size={18} style={{ flexShrink: 0 }} />
            {!collapsed && (
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden' }}>
                {label}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

    </aside>
  );
}

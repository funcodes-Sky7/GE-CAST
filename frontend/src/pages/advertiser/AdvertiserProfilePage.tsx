import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Radio, User, Mail, Building, Phone, Shield,
  LogOut, LayoutDashboard, Megaphone
} from 'lucide-react';
import { advertiserAuthApi } from '../../api/advertiserAuth';
import { useAdvertiserAuthStore, type AdvertiserUser } from '../../store/advertiserAuthStore';

export default function AdvertiserProfilePage() {
  const navigate = useNavigate();
  const { user: storedUser, logout, setUser } = useAdvertiserAuthStore();
  const [profile, setProfile] = useState<AdvertiserUser | null>(storedUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    advertiserAuthApi.me()
      .then((data) => {
        setProfile(data);
        setUser(data);
      })
      .catch((err) => {
        console.error('Failed to load profile', err);
      })
      .finally(() => setLoading(false));
  }, [setUser]);

  const handleLogout = () => {
    logout();
    navigate('/advertiser/login');
  };

  return (
    <div className="adv-dash-layout">
      {/* ── Sidebar ──────────────────────────────────────────── */}
      <aside className="adv-sidebar">
        <div className="adv-sidebar-logo">
          <Radio size={22} />
          <span>GEOCAST</span>
        </div>
        <div className="adv-sidebar-portal-badge">Advertiser Portal</div>

        <nav className="adv-sidebar-nav">
          <Link to="/advertiser/dashboard" className="adv-nav-item">
            <LayoutDashboard size={17} /> Dashboard
          </Link>
          <Link to="/advertiser/campaigns" className="adv-nav-item">
            <Megaphone size={17} /> Campaigns
          </Link>
          <Link to="/advertiser/profile" className="adv-nav-item adv-nav-item--active">
            <User size={17} /> Profile
          </Link>
        </nav>

        <div className="adv-sidebar-footer">
          <div className="adv-sidebar-user">
            <div className="adv-sidebar-avatar">
              {profile?.full_name?.[0]?.toUpperCase() ?? 'A'}
            </div>
            <div className="adv-sidebar-user-info">
              <p className="adv-sidebar-user-name">{profile?.full_name}</p>
              <p className="adv-sidebar-user-company">{profile?.company_name}</p>
            </div>
          </div>
          <button className="adv-logout-btn" onClick={handleLogout}>
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main content ─────────────────────────────────────── */}
      <main className="adv-dash-main">
        <header className="adv-dash-header">
          <div>
            <h1 className="adv-dash-title">Advertiser Profile</h1>
            <p className="adv-dash-subtitle">View and verify your account credentials and business details.</p>
          </div>
        </header>

        {loading ? (
          <div className="adv-loading">
            <span className="spinner" /> Loading profile...
          </div>
        ) : (
          <div style={{ maxWidth: '640px' }} className="adv-section">
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', paddingBottom: '20px', borderBottom: '1px solid var(--border)' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--primary)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                fontWeight: 700
              }}>
                {profile?.full_name?.[0]?.toUpperCase() ?? 'A'}
              </div>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {profile?.full_name}
                </h2>
                <span className="adv-status-badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', marginTop: '4px' }}>
                  ADVERTISER ACCOUNT
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Building size={18} style={{ color: 'var(--text-muted)' }} />
                <div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Company Name</p>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {profile?.company_name || '—'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Mail size={18} style={{ color: 'var(--text-muted)' }} />
                <div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Email Address</p>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {profile?.email}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Phone size={18} style={{ color: 'var(--text-muted)' }} />
                <div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Phone Number</p>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {profile?.phone || 'Not provided'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Shield size={18} style={{ color: 'var(--text-muted)' }} />
                <div>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Account ID</p>
                  <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    ADV-UID-{profile?.id}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

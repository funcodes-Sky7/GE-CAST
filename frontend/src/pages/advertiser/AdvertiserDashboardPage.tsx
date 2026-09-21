import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Radio, LogOut, LayoutDashboard, Megaphone,
  TrendingUp, Clock, CheckCircle2, PauseCircle, Plus, User
} from 'lucide-react';
import { useAdvertiserAuthStore } from '../../store/advertiserAuthStore';
import { campaignApi, type DashboardStats, type Campaign } from '../../api/advertiserAuth';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: string;
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  return (
    <div className="adv-stat-card" style={{ borderTopColor: color }}>
      <div className="adv-stat-icon" style={{ color }}>{icon}</div>
      <div className="adv-stat-value">{value}</div>
      <div className="adv-stat-label">{label}</div>
    </div>
  );
}

const STATUS_COLOR: Record<string, string> = {
  active: '#10b981',
  scheduled: '#3b82f6',
  draft: '#6b7280',
  completed: '#8b5cf6',
  paused: '#f59e0b',
};

export default function AdvertiserDashboardPage() {
  const navigate  = useNavigate();
  const { user, logout } = useAdvertiserAuthStore();

  const [stats, setStats]         = useState<DashboardStats | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    Promise.all([campaignApi.stats(), campaignApi.list()])
      .then(([s, c]) => { setStats(s); setCampaigns(c); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
          <Link to="/advertiser/dashboard" className="adv-nav-item adv-nav-item--active">
            <LayoutDashboard size={17} /> Dashboard
          </Link>
          <Link to="/advertiser/campaigns" className="adv-nav-item">
            <Megaphone size={17} /> Campaigns
          </Link>
          <Link to="/advertiser/profile" className="adv-nav-item">
            <User size={17} /> Profile
          </Link>
        </nav>

        <div className="adv-sidebar-footer">
          <div className="adv-sidebar-user">
            <div className="adv-sidebar-avatar">
              {user?.full_name?.[0]?.toUpperCase() ?? 'A'}
            </div>
            <div className="adv-sidebar-user-info">
              <p className="adv-sidebar-user-name">{user?.full_name}</p>
              <p className="adv-sidebar-user-company">{user?.company_name}</p>
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
            <h1 className="adv-dash-title">Dashboard</h1>
            <p className="adv-dash-subtitle">
              Welcome back, <strong>{user?.full_name}</strong> — {user?.company_name}
            </p>
          </div>
          <Link to="/advertiser/campaigns/new" className="adv-btn-primary adv-btn-sm">
            <Plus size={15} /> New Campaign
          </Link>
        </header>

        {loading ? (
          <div className="adv-loading">
            <span className="spinner" /> Loading your data…
          </div>
        ) : (
          <>
            {/* Stats row */}
            <div className="adv-stats-grid">
              <StatCard icon={<Megaphone size={22} />}  label="Total Campaigns"     value={stats?.total_campaigns ?? 0}     color="#6366f1" />
              <StatCard icon={<TrendingUp size={22} />}  label="Active"              value={stats?.active_campaigns ?? 0}    color="#10b981" />
              <StatCard icon={<Clock size={22} />}       label="Scheduled"           value={stats?.scheduled_campaigns ?? 0} color="#3b82f6" />
              <StatCard icon={<CheckCircle2 size={22} />} label="Completed"          value={stats?.completed_campaigns ?? 0} color="#8b5cf6" />
              <StatCard icon={<PauseCircle size={22} />} label="Paused"              value={stats?.paused_campaigns ?? 0}    color="#f59e0b" />
            </div>

            {/* Recent campaigns */}
            <div className="adv-section">
              <div className="adv-section-header">
                <h2 className="adv-section-title">Your Campaigns</h2>
                <Link to="/advertiser/campaigns" className="adv-link-sm">View all →</Link>
              </div>

              {campaigns.length === 0 ? (
                <div className="adv-empty-state">
                  <Megaphone size={40} strokeWidth={1.2} />
                  <p>You don't have any campaigns yet.</p>
                  <Link to="/advertiser/campaigns/new" className="adv-btn-primary adv-btn-sm">
                    <Plus size={14} /> Create your first campaign
                  </Link>
                </div>
              ) : (
                <div className="adv-table-wrap">
                  <table className="adv-table">
                    <thead>
                      <tr>
                        <th>Campaign Name</th>
                        <th>Status</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaigns.slice(0, 8).map((c) => (
                        <tr key={c.id}>
                          <td>
                            <Link to={`/advertiser/campaigns/${c.id}`} className="adv-link">
                              {c.name}
                            </Link>
                          </td>
                          <td>
                            <span
                              className="adv-status-badge"
                              style={{ background: STATUS_COLOR[c.status] + '22', color: STATUS_COLOR[c.status] }}
                            >
                              {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                            </span>
                          </td>
                          <td>{c.start_date ? new Date(c.start_date).toLocaleDateString() : '—'}</td>
                          <td>{c.end_date   ? new Date(c.end_date).toLocaleDateString()   : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

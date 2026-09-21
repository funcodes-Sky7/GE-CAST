import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Radio, ArrowLeft, Megaphone, Calendar, MapPin,
  Trash2, LogOut, LayoutDashboard, User, Eye,
  ExternalLink, Film, Image as ImageIcon, X
} from 'lucide-react';
import { campaignApi, type Campaign } from '../../api/advertiserAuth';
import { useAdvertiserAuthStore } from '../../store/advertiserAuthStore';

const STATUS_COLOR: Record<string, string> = {
  active: '#10b981',
  scheduled: '#3b82f6',
  draft: '#6b7280',
  completed: '#8b5cf6',
  paused: '#f59e0b',
};

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, logout } = useAdvertiserAuthStore();
  const qc = useQueryClient();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');
  const [showFullModal, setShowFullModal] = useState(false);

  const campaignId = Number(id);

  const loadCampaign = () => {
    if (!campaignId) return;
    setLoading(true);
    campaignApi.get(campaignId)
      .then(setCampaign)
      .catch((err) => {
        setError(err.response?.data?.detail ?? 'Campaign not found');
      })
      .finally(() => setLoading(false));
  };

  useEffect(loadCampaign, [campaignId]);

  const handleStatusChange = async (newStatus: string) => {
    if (!campaign) return;
    setUpdating(true);
    try {
      const updated = await campaignApi.update(campaign.id, { status: newStatus });
      setCampaign(updated);
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!campaign || !confirm('Are you sure you want to delete this campaign?')) return;
    try {
      await campaignApi.delete(campaign.id);
      // Invalidate all caches that depend on this campaign so Admin content
      // page, dashboard, and device rotation cards update immediately.
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['campaigns'] }),
        qc.invalidateQueries({ queryKey: ['content'] }),
        qc.invalidateQueries({ queryKey: ['dashboard-overview'] }),
        qc.invalidateQueries({ queryKey: ['device-detail'] }),
      ]);
      navigate('/advertiser/campaigns');
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Failed to delete campaign');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/advertiser/login');
  };

  const isVideo = !!(campaign?.media_url && campaign.media_url.match(/\.(mp4|webm|mov|avi|mkv)$/i));

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
          <Link to="/advertiser/campaigns" className="adv-nav-item adv-nav-item--active">
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
        <div style={{ marginBottom: '20px' }}>
          <Link to="/advertiser/campaigns" className="adv-back-link">
            <ArrowLeft size={16} /> Back to Campaigns
          </Link>
        </div>

        {error && <div className="adv-alert adv-alert-error">{error}</div>}

        {loading ? (
          <div className="adv-loading">
            <span className="spinner" /> Loading campaign details...
          </div>
        ) : !campaign ? (
          <div className="adv-empty-state">
            <p>Campaign not found or you do not have permission to view it.</p>
            <Link to="/advertiser/campaigns" className="adv-btn-primary adv-btn-sm">
              Back to Campaigns
            </Link>
          </div>
        ) : (
          <div style={{ maxWidth: '880px' }}>
            <header className="adv-dash-header">
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <h1 className="adv-dash-title">{campaign.name}</h1>
                  <span
                    className="adv-status-badge"
                    style={{
                      background: STATUS_COLOR[campaign.status] + '22',
                      color: STATUS_COLOR[campaign.status],
                      fontSize: '13px',
                      padding: '4px 12px'
                    }}
                  >
                    {campaign.status.toUpperCase()}
                  </span>
                </div>
                <p className="adv-dash-subtitle">
                  Campaign ID #{campaign.id} • Created on {new Date(campaign.created_at).toLocaleDateString()}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  className="adv-btn-primary adv-btn-sm"
                  style={{ background: '#ef4444' }}
                  onClick={handleDelete}
                >
                  <Trash2 size={14} /> Delete Campaign
                </button>
              </div>
            </header>

            {/* Campaign Overview Card */}
            <div className="adv-section">
              <div className="adv-section-header">
                <h2 className="adv-section-title">Overview & Status Control</h2>
              </div>

              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                {campaign.description || 'No description provided.'}
              </p>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Change Status:
                </span>
                {['active', 'paused', 'completed', 'draft'].map((st) => (
                  <button
                    key={st}
                    disabled={updating || campaign.status === st}
                    onClick={() => handleStatusChange(st)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                      background: campaign.status === st ? 'rgba(37, 99, 235, 0.12)' : 'var(--bg-surface)',
                      color: campaign.status === st ? 'var(--primary)' : 'var(--text-secondary)',
                      fontWeight: campaign.status === st ? 600 : 400,
                      cursor: campaign.status === st ? 'default' : 'pointer',
                      fontSize: '12.5px',
                    }}
                  >
                    {st.charAt(0).toUpperCase() + st.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Prominent Media Creative Preview Section */}
            <div className="adv-section" style={{ marginTop: '20px' }}>
              <div className="adv-section-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Eye size={18} style={{ color: 'var(--primary)' }} />
                  <h2 className="adv-section-title">Campaign Media Creative Preview</h2>
                </div>
                {campaign.media_url && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="adv-btn-primary adv-btn-sm"
                      style={{ width: 'auto', background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                      onClick={() => setShowFullModal(true)}
                    >
                      <Eye size={14} /> Fullscreen Preview
                    </button>
                    <a
                      href={campaign.media_url}
                      target="_blank"
                      rel="noreferrer"
                      className="adv-btn-primary adv-btn-sm"
                      style={{ width: 'auto', background: 'var(--bg-hover)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
                    >
                      <ExternalLink size={14} /> Open in Tab
                    </a>
                  </div>
                )}
              </div>

              {campaign.media_url ? (
                <div>
                  <div style={{
                    background: '#090d16',
                    borderRadius: 'var(--radius)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                    position: 'relative',
                    minHeight: '260px',
                    boxShadow: 'inset 0 2px 8px rgba(0, 0, 0, 0.4)',
                  }}>
                    {isVideo ? (
                      <video
                        src={campaign.media_url}
                        controls
                        autoPlay
                        loop
                        muted
                        style={{
                          maxHeight: '440px',
                          maxWidth: '100%',
                          borderRadius: '8px',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.5)'
                        }}
                      />
                    ) : (
                      <img
                        src={campaign.media_url}
                        alt="Campaign Creative"
                        style={{
                          maxHeight: '440px',
                          maxWidth: '100%',
                          objectFit: 'contain',
                          borderRadius: '8px',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                          cursor: 'zoom-in',
                        }}
                        onClick={() => setShowFullModal(true)}
                      />
                    )}
                  </div>

                  <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Asset Location: <code style={{ color: 'var(--primary)', wordBreak: 'break-all' }}>{campaign.media_url}</code>
                    </p>
                    <span className="adv-status-badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontSize: '11px' }}>
                      ✓ Transferred to Admin Content Library
                    </span>
                  </div>
                </div>
              ) : (
                <div style={{
                  border: '2px dashed var(--border)',
                  borderRadius: 'var(--radius)',
                  padding: '40px 24px',
                  textAlign: 'center',
                  background: 'rgba(37, 99, 235, 0.02)',
                }}>
                  <ImageIcon size={38} style={{ color: 'var(--text-muted)', marginBottom: '10px' }} />
                  <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    No media asset attached to this campaign
                  </p>
                  <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    This campaign does not have an attached media creative.
                  </p>
                </div>
              )}
            </div>

            {/* Target Zones & Schedule */}
            <div className="adv-section" style={{ marginTop: '20px' }}>
              <div className="adv-section-header">
                <h2 className="adv-section-title">Targeting & Schedule</h2>
              </div>

              <div className="adv-form-row">
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <MapPin size={16} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Target Zone IDs:</span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {campaign.zone_ids ? `Zones: ${campaign.zone_ids}` : 'Broadcasted to all general zones'}
                  </p>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <Calendar size={16} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Schedule:</span>
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Start: {campaign.start_date ? new Date(campaign.start_date).toLocaleString() : 'Immediate'}<br />
                    End: {campaign.end_date ? new Date(campaign.end_date).toLocaleString() : 'Ongoing'}
                  </p>
                </div>
              </div>
            </div>

            {/* Fullscreen / Enlarged Preview Modal */}
            {showFullModal && campaign.media_url && (
              <div
                style={{
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(0, 0, 0, 0.85)',
                  backdropFilter: 'blur(8px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 9999,
                  padding: '24px',
                }}
                onClick={() => setShowFullModal(false)}
              >
                <div
                  style={{
                    maxWidth: '90vw',
                    maxHeight: '90vh',
                    position: 'relative',
                    background: '#090d16',
                    borderRadius: '12px',
                    padding: '16px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.8)',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => setShowFullModal(false)}
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: 'rgba(255,255,255,0.15)',
                      border: 'none',
                      color: '#fff',
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <X size={18} />
                  </button>
                  <div style={{ marginBottom: '12px' }}>
                    <p style={{ color: '#fff', fontWeight: 600, fontSize: '15px' }}>{campaign.name}</p>
                    <p style={{ color: '#94a3b8', fontSize: '12px' }}>Full Resolution Preview</p>
                  </div>
                  {isVideo ? (
                    <video
                      src={campaign.media_url}
                      controls
                      autoPlay
                      style={{ maxHeight: '75vh', maxWidth: '85vw', borderRadius: '8px' }}
                    />
                  ) : (
                    <img
                      src={campaign.media_url}
                      alt={campaign.name}
                      style={{ maxHeight: '75vh', maxWidth: '85vw', objectFit: 'contain', borderRadius: '8px' }}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

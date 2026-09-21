import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  Radio, LogOut, LayoutDashboard, Megaphone, Plus, Pencil,
  Trash2, User, Eye, LayoutGrid, List, Film, Image as ImageIcon,
  Calendar, MapPin, X
} from 'lucide-react';
import { useAdvertiserAuthStore } from '../../store/advertiserAuthStore';
import { campaignApi, type Campaign } from '../../api/advertiserAuth';

const STATUS_COLOR: Record<string, string> = {
  active: '#10b981',
  scheduled: '#3b82f6',
  draft: '#6b7280',
  completed: '#8b5cf6',
  paused: '#f59e0b',
};

export default function AdvertiserCampaignsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user, logout } = useAdvertiserAuthStore();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [previewMedia, setPreviewMedia] = useState<{ url: string; name: string } | null>(null);

  const load = () => {
    setLoading(true);
    campaignApi.list()
      .then(setCampaigns)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this campaign?')) return;
    setDeleting(id);
    try {
      await campaignApi.delete(id);
      qc.invalidateQueries({ queryKey: ['content'] });
      qc.invalidateQueries({ queryKey: ['dashboard-overview'] });
      qc.invalidateQueries({ queryKey: ['device-detail'] });
      load();
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(null);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/advertiser/login');
  };

  const isVideoFile = (url?: string) =>
    !!(url && url.match(/\.(mp4|webm|mov|avi|mkv)$/i));

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

      {/* ── Main Content ─────────────────────────────────────── */}
      <main className="adv-dash-main">
        <header className="adv-dash-header">
          <div>
            <h1 className="adv-dash-title">Campaigns</h1>
            <p className="adv-dash-subtitle">Manage, preview, and track your advertising campaigns</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* View Mode Toggle */}
            <div style={{
              display: 'flex',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '2px',
            }}>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                title="Card View"
                style={{
                  padding: '6px 10px',
                  background: viewMode === 'grid' ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                  color: viewMode === 'grid' ? 'var(--primary)' : 'var(--text-muted)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12.5px',
                  fontWeight: viewMode === 'grid' ? 600 : 400,
                }}
              >
                <LayoutGrid size={15} /> Cards
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                title="Table View"
                style={{
                  padding: '6px 10px',
                  background: viewMode === 'table' ? 'rgba(37, 99, 235, 0.1)' : 'transparent',
                  color: viewMode === 'table' ? 'var(--primary)' : 'var(--text-muted)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12.5px',
                  fontWeight: viewMode === 'table' ? 600 : 400,
                }}
              >
                <List size={15} /> Table
              </button>
            </div>

            <Link to="/advertiser/campaigns/new" className="adv-btn-primary adv-btn-sm">
              <Plus size={15} /> New Campaign
            </Link>
          </div>
        </header>

        {loading ? (
          <div className="adv-loading">
            <span className="spinner" /> Loading campaigns…
          </div>
        ) : campaigns.length === 0 ? (
          <div className="adv-empty-state">
            <Megaphone size={44} strokeWidth={1.2} />
            <p>No campaigns yet. Create your first one!</p>
            <Link to="/advertiser/campaigns/new" className="adv-btn-primary adv-btn-sm">
              <Plus size={14} /> Create Campaign
            </Link>
          </div>
        ) : viewMode === 'grid' ? (
          /* ── Card Grid View with Media Preview ── */
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: '20px',
          }}>
            {campaigns.map((c) => {
              const hasMedia = !!c.media_url;
              const isVid = isVideoFile(c.media_url);

              return (
                <div
                  key={c.id}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                  }}
                >
                  {/* Media Thumbnail & Preview Overlay */}
                  <div
                    style={{
                      height: '160px',
                      background: '#090d16',
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      cursor: hasMedia ? 'pointer' : 'default',
                    }}
                    onClick={() => {
                      if (hasMedia) setPreviewMedia({ url: c.media_url!, name: c.name });
                    }}
                  >
                    {hasMedia ? (
                      isVid ? (
                        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                          <video
                            src={c.media_url}
                            muted
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                          <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0,0,0,0.35)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#fff',
                            gap: '6px',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}>
                            <Film size={24} /> Preview Video
                          </div>
                        </div>
                      ) : (
                        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                          <img
                            src={c.media_url}
                            alt={c.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = 'none';
                            }}
                          />
                          <div style={{
                            position: 'absolute',
                            bottom: '8px',
                            right: '8px',
                            background: 'rgba(0,0,0,0.65)',
                            color: '#fff',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}>
                            <Eye size={12} /> Preview
                          </div>
                        </div>
                      )
                    ) : (
                      <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        <ImageIcon size={32} style={{ marginBottom: '4px' }} />
                        <p style={{ fontSize: '12px' }}>No media attached</p>
                      </div>
                    )}

                    {/* Status badge floating top-right */}
                    <span
                      className="adv-status-badge"
                      style={{
                        position: 'absolute',
                        top: '10px',
                        right: '10px',
                        background: (STATUS_COLOR[c.status] || '#6b7280') + 'dd',
                        color: '#fff',
                        fontSize: '11px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                      }}
                    >
                      {c.status.toUpperCase()}
                    </span>
                  </div>

                  {/* Card Content */}
                  <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <Link
                        to={`/advertiser/campaigns/${c.id}`}
                        style={{
                          fontSize: '15px',
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          textDecoration: 'none',
                          display: 'block',
                          marginBottom: '6px',
                        }}
                      >
                        {c.name}
                      </Link>

                      {c.description && (
                        <p style={{
                          fontSize: '12.5px',
                          color: 'var(--text-secondary)',
                          marginBottom: '10px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          lineHeight: 1.4,
                        }}>
                          {c.description}
                        </p>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        {c.zone_ids && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <MapPin size={13} style={{ color: 'var(--primary)' }} />
                            <span>Zones: {c.zone_ids}</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={13} style={{ color: 'var(--primary)' }} />
                          <span>{c.start_date ? new Date(c.start_date).toLocaleDateString() : 'Immediate'} → {c.end_date ? new Date(c.end_date).toLocaleDateString() : 'Ongoing'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div style={{
                      marginTop: '14px',
                      paddingTop: '12px',
                      borderTop: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                      <button
                        type="button"
                        className="adv-link-sm"
                        onClick={() => navigate(`/advertiser/campaigns/${c.id}`)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        Manage Campaign →
                      </button>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        {hasMedia && (
                          <button
                            className="adv-icon-btn"
                            title="Preview Creative"
                            onClick={() => setPreviewMedia({ url: c.media_url!, name: c.name })}
                          >
                            <Eye size={14} />
                          </button>
                        )}
                        <button
                          className="adv-icon-btn"
                          title="Edit"
                          onClick={() => navigate(`/advertiser/campaigns/${c.id}`)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="adv-icon-btn adv-icon-btn--danger"
                          title="Delete"
                          disabled={deleting === c.id}
                          onClick={() => handleDelete(c.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── Compact Table View ── */
          <div className="adv-table-wrap">
            <table className="adv-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>Preview</th>
                  <th>Name</th>
                  <th>Status</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((c) => (
                  <tr key={c.id}>
                    <td>
                      {c.media_url ? (
                        <div
                          onClick={() => setPreviewMedia({ url: c.media_url!, name: c.name })}
                          style={{
                            width: '42px',
                            height: '32px',
                            borderRadius: '4px',
                            overflow: 'hidden',
                            background: '#090d16',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                          title="Click to preview"
                        >
                          {isVideoFile(c.media_url) ? (
                            <Film size={16} color="var(--primary)" />
                          ) : (
                            <img
                              src={c.media_url}
                              alt={c.name}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          )}
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>—</span>
                      )}
                    </td>
                    <td>
                      <Link to={`/advertiser/campaigns/${c.id}`} className="adv-link">
                        {c.name}
                      </Link>
                    </td>
                    <td>
                      <span
                        className="adv-status-badge"
                        style={{
                          background: (STATUS_COLOR[c.status] || '#6b7280') + '22',
                          color: STATUS_COLOR[c.status] || '#6b7280',
                        }}
                      >
                        {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                      </span>
                    </td>
                    <td>{c.start_date ? new Date(c.start_date).toLocaleDateString() : '—'}</td>
                    <td>{c.end_date ? new Date(c.end_date).toLocaleDateString() : '—'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {c.media_url && (
                          <button
                            className="adv-icon-btn"
                            title="Preview Creative"
                            onClick={() => setPreviewMedia({ url: c.media_url!, name: c.name })}
                          >
                            <Eye size={14} />
                          </button>
                        )}
                        <button
                          className="adv-icon-btn"
                          title="Edit"
                          onClick={() => navigate(`/advertiser/campaigns/${c.id}`)}
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="adv-icon-btn adv-icon-btn--danger"
                          title="Delete"
                          disabled={deleting === c.id}
                          onClick={() => handleDelete(c.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Quick Preview Modal ── */}
        {previewMedia && (
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
            onClick={() => setPreviewMedia(null)}
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
                onClick={() => setPreviewMedia(null)}
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
                <p style={{ color: '#fff', fontWeight: 600, fontSize: '15px' }}>{previewMedia.name}</p>
                <p style={{ color: '#94a3b8', fontSize: '12px' }}>Campaign Creative Preview</p>
              </div>

              {isVideoFile(previewMedia.url) ? (
                <video
                  src={previewMedia.url}
                  controls
                  autoPlay
                  style={{ maxHeight: '75vh', maxWidth: '85vw', borderRadius: '8px' }}
                />
              ) : (
                <img
                  src={previewMedia.url}
                  alt={previewMedia.name}
                  style={{ maxHeight: '75vh', maxWidth: '85vw', objectFit: 'contain', borderRadius: '8px' }}
                />
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

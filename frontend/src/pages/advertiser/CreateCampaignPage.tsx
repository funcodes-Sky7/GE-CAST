import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Radio, ArrowLeft, Megaphone, MapPin, Calendar,
  Upload, Image as ImageIcon, CheckCircle2, DollarSign, LogOut,
  LayoutDashboard, User, X, Film, Eye,
  Bus, Monitor, Train, Building2, Tv2
} from 'lucide-react';
import { campaignApi } from '../../api/advertiserAuth';
import { useAdvertiserAuthStore } from '../../store/advertiserAuthStore';
import axios from 'axios';

interface ZoneItem {
  id: number;
  name: string;
  description?: string;
  color?: string;
}

// ── Device type definitions ────────────────────────────────────────────────
const DEVICE_TYPES = [
  { value: 'BUS',       label: 'Bus',        desc: 'In-transit screens',    icon: Bus       },
  { value: 'BILLBOARD', label: 'Billboard',   desc: 'Outdoor large format',  icon: Monitor   },
  { value: 'METRO',     label: 'Metro',       desc: 'Subway & rail systems', icon: Train     },
  { value: 'STATION',   label: 'Station',     desc: 'Transit hub displays',  icon: Building2 },
  { value: 'KIOSK',     label: 'Kiosk',       desc: 'Street-level screens',  icon: Tv2       },
] as const;

export default function CreateCampaignPage() {
  const navigate = useNavigate();
  const { user, logout } = useAdvertiserAuthStore();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [selectedZones, setSelectedZones] = useState<number[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusVal, setStatusVal] = useState('active');

  const [availableZones, setAvailableZones] = useState<ZoneItem[]>([]);
  const [loadingZones, setLoadingZones] = useState(true);
  const [selectedDeviceTypes, setSelectedDeviceTypes] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Minimum datetime = now in local time for datetime-local input
  const toLocalISOString = (d: Date) => {
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  const nowStr = toLocalISOString(new Date());

  // Load available zones
  useEffect(() => {
    axios.get('/api/v1/zones')
      .then((res) => {
        setAvailableZones(res.data);
      })
      .catch((err) => {
        console.error('Failed to load zones', err);
      })
      .finally(() => setLoadingZones(false));
  }, []);

  const toggleZone = (id: number) => {
    setSelectedZones((prev) =>
      prev.includes(id) ? prev.filter((z) => z !== id) : [...prev, id]
    );
  };

  const handleSelectAllZones = () => {
    if (selectedZones.length === availableZones.length) {
      setSelectedZones([]);
    } else {
      setSelectedZones(availableZones.map((z) => z.id));
    }
  };

  // Handle local file selection & immediate upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setLocalPreviewUrl(objectUrl);
    setUploading(true);
    setError('');

    try {
      const res = await campaignApi.uploadMedia(
        file,
        name.trim() || file.name,
        selectedZones.length > 0 ? selectedZones.join(',') : undefined
      );
      if (res?.file_url) {
        setMediaUrl(res.file_url);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail ?? 'Failed to upload media asset to server.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setLocalPreviewUrl('');
    setMediaUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Campaign name is required.');
      return;
    }

    setSubmitting(true);
    try {
      let finalMediaUrl = mediaUrl.trim();

      // If file was selected but not uploaded yet, upload now
      if (selectedFile && !finalMediaUrl) {
        setUploading(true);
        const uploadRes = await campaignApi.uploadMedia(
          selectedFile,
          name.trim(),
          selectedZones.length > 0 ? selectedZones.join(',') : undefined
        );
        finalMediaUrl = uploadRes.file_url;
        setMediaUrl(finalMediaUrl);
        setUploading(false);
      }

      await campaignApi.create({
        name: name.trim(),
        description: description.trim() || undefined,
        media_url: finalMediaUrl || undefined,
        zone_ids: selectedZones.length > 0 ? selectedZones.join(',') : undefined,
        device_types: selectedDeviceTypes.length > 0 ? selectedDeviceTypes.join(',') : undefined,
        start_date: startDate ? new Date(startDate).toISOString() : undefined,
        end_date: endDate ? new Date(endDate).toISOString() : undefined,
        status: statusVal,
      });

      // Navigate back to advertiser campaigns list
      navigate('/advertiser/campaigns');
    } catch (err: any) {
      const msg = err.response?.data?.detail ?? 'Failed to create campaign. Please try again.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSubmitting(false);
      setUploading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/advertiser/login');
  };

  const zoneCount = selectedZones.length;
  const estimatedCost = zoneCount > 0 ? zoneCount * 450 : 0;
  const isVideo = selectedFile
    ? selectedFile.type.startsWith('video/')
    : !!(mediaUrl && mediaUrl.match(/\.(mp4|webm|mov|avi|mkv)$/i));

  const effectivePreview = localPreviewUrl || mediaUrl;

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

        <header className="adv-dash-header" style={{ marginBottom: '24px' }}>
          <div>
            <h1 className="adv-dash-title">Create Advertising Campaign</h1>
            <p className="adv-dash-subtitle">
              Set up your creative assets, geographic targeting, and campaign schedule. Uploaded media is automatically registered in the platform Content Library.
            </p>
          </div>
        </header>

        {error && <div className="adv-alert adv-alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="adv-form" style={{ maxWidth: '820px' }}>
          {/* Section 1: General Details */}
          <div className="adv-section">
            <div className="adv-section-header">
              <h2 className="adv-section-title">1. Campaign Details</h2>
            </div>

            <div className="adv-form-group">
              <label className="adv-label" htmlFor="camp-name">Campaign Name *</label>
              <input
                id="camp-name"
                type="text"
                className="adv-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Summer Festival Special 2026"
                required
                autoFocus
              />
            </div>

            <div className="adv-form-group" style={{ marginTop: '14px' }}>
              <label className="adv-label" htmlFor="camp-desc">Description / Objectives</label>
              <textarea
                id="camp-desc"
                className="adv-input"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Briefly describe the promotional campaign objectives and target demographic..."
                style={{ resize: 'vertical' }}
              />
            </div>

            <div className="adv-form-group" style={{ marginTop: '14px' }}>
              <label className="adv-label" htmlFor="camp-status">Initial Status</label>
              <select
                id="camp-status"
                className="adv-input"
                value={statusVal}
                onChange={(e) => setStatusVal(e.target.value)}
              >
                <option value="active">Active (Deliver immediately when scheduled)</option>
                <option value="draft">Draft (Save as draft)</option>
                <option value="scheduled">Scheduled (Deliver on start date)</option>
              </select>
            </div>
          </div>

          {/* Section 2: Creative & Media */}
          <div className="adv-section" style={{ marginTop: '20px' }}>
            <div className="adv-section-header">
              <div>
                <h2 className="adv-section-title">2. Advertisement Media Asset</h2>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Upload your video or high-res banner. It will immediately transfer to the Admin Content Library.
                </p>
              </div>
            </div>

            {/* Upload Box */}
            <div className="adv-form-group">
              <label className="adv-label">Upload Video or Image</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed var(--primary)',
                  borderRadius: 'var(--radius)',
                  padding: '24px',
                  textAlign: 'center',
                  background: 'rgba(37, 99, 235, 0.03)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {uploading ? (
                  <div style={{ padding: '10px' }}>
                    <span className="spinner" style={{ width: 24, height: 24 }} />
                    <p style={{ marginTop: '8px', fontSize: '13px', color: 'var(--primary)', fontWeight: 600 }}>
                      Uploading media to Content Library...
                    </p>
                  </div>
                ) : selectedFile ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                    {isVideo ? <Film size={28} color="var(--primary)" /> : <ImageIcon size={28} color="var(--primary)" />}
                    <div style={{ textAlign: 'left' }}>
                      <p style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {selectedFile.name}
                      </p>
                      <p style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • {isVideo ? 'Video' : 'Image'} • {mediaUrl ? '✅ Synced to Content Library' : 'Ready'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile();
                      }}
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: 'none',
                        borderRadius: '50%',
                        width: '28px',
                        height: '28px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ef4444',
                        cursor: 'pointer',
                      }}
                      title="Remove file"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload size={32} style={{ color: 'var(--primary)', marginBottom: '8px' }} />
                    <p style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Click to choose video or image from your computer
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Supports MP4, WebM, PNG, JPG, JPEG, GIF (Max 50MB)
                    </p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  disabled={uploading}
                  style={{ display: 'none' }}
                />
              </div>
            </div>

            {/* Media URL Alternative */}
            <div className="adv-form-group" style={{ marginTop: '14px' }}>
              <label className="adv-label" htmlFor="camp-media">Or specify External Media URL</label>
              <input
                id="camp-media"
                type="url"
                className="adv-input"
                value={mediaUrl}
                onChange={(e) => {
                  setMediaUrl(e.target.value);
                  if (!selectedFile) setLocalPreviewUrl('');
                }}
                placeholder="https://images.unsplash.com/... or /static/uploads/..."
              />
            </div>

            {/* Live Media Preview Card */}
            {effectivePreview && (
              <div style={{
                marginTop: '16px',
                padding: '16px',
                background: 'var(--bg-base)',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Eye size={15} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Live Creative Preview
                    </span>
                  </div>
                  <span className="adv-status-badge" style={{ background: 'rgba(37, 99, 235, 0.1)', color: 'var(--primary)', fontSize: '11px' }}>
                    {isVideo ? 'VIDEO ASSET' : 'IMAGE ASSET'}
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  background: '#090d16',
                  borderRadius: 'var(--radius-sm)',
                  overflow: 'hidden',
                  padding: '12px',
                  maxHeight: '340px',
                }}>
                  {isVideo ? (
                    <video
                      src={effectivePreview}
                      controls
                      autoPlay
                      muted
                      loop
                      style={{ maxHeight: '310px', maxWidth: '100%', borderRadius: '4px' }}
                    />
                  ) : (
                    <img
                      src={effectivePreview}
                      alt="Campaign Creative"
                      style={{ maxHeight: '310px', maxWidth: '100%', objectFit: 'contain', borderRadius: '4px' }}
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  )}
                </div>

                {mediaUrl && (
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', wordBreak: 'break-all' }}>
                    Library Path: <code style={{ color: 'var(--primary)' }}>{mediaUrl}</code>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Section 3: Target Zones */}
          <div className="adv-section" style={{ marginTop: '20px' }}>
            <div className="adv-section-header">
              <div>
                <h2 className="adv-section-title">3. Target Geographic Zones</h2>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Select the display zones where your advertisement will be broadcasted.
                </p>
              </div>
              <button
                type="button"
                className="adv-link-sm"
                onClick={handleSelectAllZones}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {selectedZones.length === availableZones.length ? 'Deselect All' : 'Select All Zones'}
              </button>
            </div>

            {loadingZones ? (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Loading available zones...</p>
            ) : availableZones.length === 0 ? (
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>No zones available.</p>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: '10px',
                marginTop: '10px'
              }}>
                {availableZones.map((z) => {
                  const isSelected = selectedZones.includes(z.id);
                  return (
                    <div
                      key={z.id}
                      onClick={() => toggleZone(z.id)}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-sm)',
                        border: isSelected ? '1.5px solid var(--primary)' : '1px solid var(--border)',
                        background: isSelected ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-surface)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        transition: 'all var(--transition)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                        <MapPin size={16} color={z.color || 'var(--primary)'} />
                        <div>
                          <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {z.name}
                          </p>
                          {z.description && (
                            <p style={{ fontSize: '11px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                              {z.description}
                            </p>
                          )}
                        </div>
                      </div>
                      {isSelected && <CheckCircle2 size={16} color="var(--primary)" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Section 4: Device Types */}
          <div className="adv-section" style={{ marginTop: '20px' }}>
            <div className="adv-section-header">
              <div>
                <h2 className="adv-section-title">4. Target Device Types</h2>
                <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Choose the display device categories where your ad should appear. Select all that apply.
                </p>
              </div>
              <button
                type="button"
                className="adv-link-sm"
                onClick={() => {
                  const all = DEVICE_TYPES.map((d) => d.value);
                  setSelectedDeviceTypes(
                    selectedDeviceTypes.length === all.length ? [] : all
                  );
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer' }}
              >
                {selectedDeviceTypes.length === DEVICE_TYPES.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
              gap: '10px',
              marginTop: '12px',
            }}>
              {DEVICE_TYPES.map((dt) => {
                const isSelected = selectedDeviceTypes.includes(dt.value);
                const Icon = dt.icon;
                return (
                  <div
                    key={dt.value}
                    onClick={() => setSelectedDeviceTypes((prev) =>
                      prev.includes(dt.value)
                        ? prev.filter((v) => v !== dt.value)
                        : [...prev, dt.value]
                    )}
                    style={{
                      padding: '14px 12px',
                      borderRadius: 'var(--radius-sm)',
                      border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border)',
                      background: isSelected ? 'rgba(37,99,235,0.09)' : 'var(--bg-surface)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '8px',
                      transition: 'all var(--transition)',
                      textAlign: 'center',
                      position: 'relative',
                    }}
                  >
                    {isSelected && (
                      <CheckCircle2
                        size={14}
                        color="var(--primary)"
                        style={{ position: 'absolute', top: 8, right: 8 }}
                      />
                    )}
                    <Icon
                      size={28}
                      color={isSelected ? 'var(--primary)' : 'var(--text-muted)'}
                    />
                    <div>
                      <p style={{
                        fontSize: '13px', fontWeight: 600,
                        color: isSelected ? 'var(--primary)' : 'var(--text-primary)',
                      }}>{dt.label}</p>
                      <p style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '2px' }}>{dt.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedDeviceTypes.length === 0 && (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '8px' }}>
                💡 No device type selected — your campaign will run on all device types.
              </p>
            )}
          </div>

          {/* Section 5: Schedule & Budget */}
          <div className="adv-section" style={{ marginTop: '20px' }}>
            <div className="adv-section-header">
              <h2 className="adv-section-title">5. Schedule &amp; Budget Summary</h2>
            </div>

            <div className="adv-form-row">
              <div className="adv-form-group">
                <label className="adv-label" htmlFor="start-date">Start Date &amp; Time</label>
                <input
                  id="start-date"
                  type="datetime-local"
                  className="adv-input"
                  value={startDate}
                  min={nowStr}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>

              <div className="adv-form-group">
                <label className="adv-label" htmlFor="end-date">End Date & Time</label>
                <input
                  id="end-date"
                  type="datetime-local"
                  className="adv-input"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            {/* Estimated Reach & Cost card */}
            <div style={{
              marginTop: '16px',
              padding: '16px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(59, 130, 246, 0.05)',
              border: '1px solid rgba(59, 130, 246, 0.15)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Estimated Daily Reach</p>
                <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {zoneCount > 0 ? (zoneCount * 12500).toLocaleString() : '0'} impressions / day
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Campaign Tier Estimate</p>
                <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--primary)' }}>
                  ₹{estimatedCost.toLocaleString()} / day
                </p>
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <Link to="/advertiser/campaigns" className="adv-btn-primary" style={{ width: 'auto', background: 'var(--border)', color: 'var(--text-primary)' }}>
              Cancel
            </Link>
            <button
              type="submit"
              className="adv-btn-primary"
              style={{ width: 'auto', minWidth: '160px' }}
              disabled={submitting || uploading}
            >
              {submitting || uploading ? <span className="spinner" /> : <CheckCircle2 size={16} />}
              {uploading ? 'Uploading Media...' : submitting ? 'Creating Campaign...' : 'Launch Campaign'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

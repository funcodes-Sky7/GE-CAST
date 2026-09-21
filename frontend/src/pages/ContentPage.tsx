import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Upload, Image, Film, RefreshCw, MapPin, ToggleLeft, ToggleRight, Check } from 'lucide-react';
import { contentApi } from '../api/content';
import { zonesApi } from '../api/zones';
import Modal from '../components/ui/Modal';
import type { Content, Zone } from '../types';

function formatBytes(bytes?: number) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const ZONE_OPTIONS = [
  { label: 'Delhi NCR Zone', value: '2,6' },
  { label: 'Mumbai Metro Zone', value: '3,11' },
  { label: 'Delhi + Mumbai (Multi-zone)', value: '2,6,3,11' },
  { label: 'Chandigarh', value: '1,4' },
  { label: 'Jaipur', value: '8' },
  { label: 'All Zones', value: 'ALL' },
];

function getZoneLabel(zone_ids?: string | null, zones?: Zone[]) {
  if (!zone_ids) return null;
  const clean = zone_ids.trim();
  if (!clean) return null;
  if (clean.toUpperCase() === 'ALL') return 'All Zones (Global)';

  if (zones && zones.length > 0) {
    const rawIds = clean.split(',').map((s) => s.trim()).filter(Boolean);
    const names = rawIds.map((idStr) => {
      const numId = Number(idStr);
      const found = zones.find((z) => z.id === numId);
      return found ? found.name : `Zone #${idStr}`;
    });
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]}, ${names[1]}`;
    if (names.length > 2) return `${names[0]}, ${names[1]} (+${names.length - 2} more)`;
  }

  const match = ZONE_OPTIONS.find((o) => o.value === clean);
  if (match) return match.label;
  return `Zones: ${clean}`;
}

function UploadModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data: zones = [], isLoading: loadingZones } = useQuery({
    queryKey: ['zones'],
    queryFn: zonesApi.list,
  });

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(10);
  const [selectedZoneIds, setSelectedZoneIds] = useState<number[]>([]);
  const [isAllZones, setIsAllZones] = useState(false);
  const [priority, setPriority] = useState(5);
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: (fd: FormData) => contentApi.upload(fd),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content'] });
      onClose();
    },
    onError: (e: any) => setError(e.response?.data?.detail ?? 'Upload failed'),
  });

  const toggleZone = (id: number) => {
    setIsAllZones(false);
    setSelectedZoneIds((prev) =>
      prev.includes(id) ? prev.filter((z) => z !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (isAllZones || selectedZoneIds.length === zones.length) {
      setIsAllZones(false);
      setSelectedZoneIds([]);
    } else {
      setIsAllZones(false);
      setSelectedZoneIds(zones.map((z) => z.id));
    }
  };

  const handleToggleAllZones = () => {
    if (isAllZones) {
      setIsAllZones(false);
      setSelectedZoneIds([]);
    } else {
      setIsAllZones(true);
      setSelectedZoneIds(zones.map((z) => z.id));
    }
  };

  const handleSubmit = () => {
    if (!file || !title) return;
    const fd = new FormData();
    fd.append('title', title);
    fd.append('description', description);
    fd.append('duration', String(duration));
    fd.append('file', file);

    let zoneIdsParam = '';
    if (isAllZones) {
      zoneIdsParam = 'ALL';
    } else if (selectedZoneIds.length > 0) {
      zoneIdsParam = selectedZoneIds.join(',');
    }

    if (zoneIdsParam) {
      fd.append('zone_ids', zoneIdsParam);
    }
    fd.append('priority', String(priority));
    fd.append('is_active', 'true');
    mutation.mutate(fd);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) {
      setFile(f);
      if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
    }
  };

  return (
    <Modal
      title="Upload Content"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={mutation.isPending || !file || !title}
          >
            {mutation.isPending ? <span className="spinner" /> : <Upload size={15} />}
            Upload
          </button>
        </>
      }
    >
      {error && <div className="login-error" style={{ marginBottom: '16px' }}>{error}</div>}

      <div
        className={`dropzone ${dragOver ? 'active' : ''}`}
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        style={{ marginBottom: '16px' }}
      >
        <div className="drop-icon">📁</div>
        {file ? (
          <p style={{ color: 'var(--accent-blue)', fontWeight: 600 }}>{file.name}</p>
        ) : (
          <>
            <p>Click or drag &amp; drop media file</p>
            <p className="drop-hint">Supports: JPG, PNG, SVG, GIF, MP4, WebM</p>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*,video/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              setFile(f);
              if (!title) setTitle(f.name.replace(/\.[^.]+$/, ''));
            }
          }}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Title *</label>
        <input className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Campaign or content name" />
      </div>
      <div className="form-group">
        <label className="form-label">Description</label>
        <textarea className="form-textarea" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional description..." />
      </div>

      {/* Target Geographic Zones Multi-Select */}
      <div className="form-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <label className="form-label" style={{ marginBottom: 0 }}>
            Target Geographic Zones ({isAllZones ? 'All Zones (Global)' : `${selectedZoneIds.length} selected`})
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{
                fontSize: '11px', padding: '2px 8px',
                background: isAllZones ? 'var(--primary)' : undefined,
                color: isAllZones ? '#fff' : undefined,
              }}
              onClick={handleToggleAllZones}
            >
              🌐 All Zones
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              style={{ fontSize: '11px', padding: '2px 8px' }}
              onClick={handleSelectAll}
            >
              {selectedZoneIds.length === zones.length && !isAllZones ? 'Deselect All' : 'Select All'}
            </button>
          </div>
        </div>

        {/* Zones Checkbox Grid */}
        <div style={{
          maxHeight: '160px',
          overflowY: 'auto',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          padding: '8px',
          background: 'var(--bg-surface-2, rgba(0,0,0,0.15))',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
          gap: '6px'
        }}>
          {loadingZones ? (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '4px' }}>Loading zones...</p>
          ) : zones.length === 0 ? (
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', padding: '4px' }}>No zones found.</p>
          ) : (
            zones.map((z) => {
              const checked = isAllZones || selectedZoneIds.includes(z.id);
              return (
                <label
                  key={z.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    background: checked ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                    border: checked ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid transparent',
                    cursor: 'pointer',
                    fontSize: '12px',
                    userSelect: 'none',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleZone(z.id)}
                    style={{ cursor: 'pointer', accentColor: 'var(--primary)' }}
                  />
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: z.color || '#38bdf8',
                      flexShrink: 0,
                    }}
                  />
                  <span style={{
                    flex: 1,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontWeight: checked ? 600 : 400,
                    color: checked ? 'var(--text-primary)' : 'var(--text-secondary)'
                  }}>
                    {z.name}
                  </span>
                  <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    #{z.id}
                  </span>
                </label>
              );
            })
          )}
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
          {isAllZones
            ? 'Broadcasts to displays in every zone across all cities.'
            : selectedZoneIds.length === 0
            ? 'No zone selected — this content will be inactive on zone-targeted displays.'
            : `Selected ${selectedZoneIds.length} zone${selectedZoneIds.length > 1 ? 's' : ''}: only devices in these zones will rotate this content.`}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div className="form-group">
          <label className="form-label">Priority (1–10)</label>
          <input
            type="number"
            className="form-input"
            min={1}
            max={10}
            value={priority}
            onChange={(e) => setPriority(Math.min(10, Math.max(1, Number(e.target.value))))}
          />
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
            Higher priority = more frequent slots
          </span>
        </div>
        <div className="form-group">
          <label className="form-label">Display Duration (seconds)</label>
          <input
            type="number"
            className="form-input"
            min={1}
            max={3600}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
            Time per rotation cycle
          </span>
        </div>
      </div>
    </Modal>
  );
}

export default function ContentPage() {
  const qc = useQueryClient();
  const [showUpload, setShowUpload] = useState(false);

  const { data: contents, isLoading } = useQuery({
    queryKey: ['content'],
    queryFn: contentApi.list,
  });

  const { data: zones = [] } = useQuery({
    queryKey: ['zones'],
    queryFn: zonesApi.list,
  });

  const deleteMutation = useMutation({
    mutationFn: contentApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['content'] }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: number; is_active: boolean }) =>
      contentApi.update(id, { is_active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['content'] }),
  });

  const handleDelete = (id: number, title: string) => {
    if (confirm(`Delete "${title}"?\n\nThis will remove it from ALL device playlists immediately.`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleToggleActive = (c: Content) => {
    toggleMutation.mutate({ id: c.id, is_active: !c.is_active });
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Content Library</div>
          <div className="page-subtitle">
            {contents?.filter((c) => c.is_active !== false).length ?? 0} active · {contents?.length ?? 0} total
          </div>
        </div>
        <div className="action-row">
          <button className="btn btn-secondary btn-sm" onClick={() => qc.invalidateQueries({ queryKey: ['content'] })}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
            <Plus size={15} /> Upload Content
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="empty-state" style={{ height: 300 }}>
          <span className="spinner" style={{ width: 28, height: 28 }} />
          <p>Loading library...</p>
        </div>
      ) : contents?.length === 0 ? (
        <div className="empty-state" style={{ height: 300 }}>
          <Image size={48} />
          <p>No content uploaded yet</p>
          <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
            <Plus size={15} /> Upload your first file
          </button>
        </div>
      ) : (
        <div className="content-grid">
          {contents?.map((c) => {
            const isVideo = !!(c.media_type?.toLowerCase().includes('video') || c.file_url?.match(/\.(mp4|webm|mov|avi|mkv)$/i));

            const isImage = !isVideo;
            const isActive = c.is_active !== false;
            const isDefault = c.is_default === true;
            const zoneLabel = getZoneLabel(c.zone_ids, zones);
            const fullZoneTooltip = c.zone_ids && zones ? c.zone_ids.split(',').map(s => {
              const id = Number(s.trim());
              const found = zones.find(z => z.id === id);
              return found ? `${found.name} (#${found.id})` : s.trim();
            }).join(', ') : c.zone_ids ?? '';
            return (
              <div
                className="content-card"
                key={c.id}
                style={{ opacity: isActive ? 1 : 0.55, transition: 'opacity 0.2s' }}
              >
                <div className="content-thumbnail">
                  {isImage ? (
                    <img
                      src={c.file_url}
                      alt={c.title}
                      loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <video
                      src={c.file_url}
                      muted
                      playsInline
                      preload="metadata"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
                      onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = 0; }}
                      onError={(e) => {
                        // Fallback: hide broken video and show icon
                        const el = e.currentTarget;
                        el.style.display = 'none';
                        const parent = el.parentElement;
                        if (parent && !parent.querySelector('.video-fallback-icon')) {
                          const icon = document.createElement('span');
                          icon.className = 'media-icon video-fallback-icon';
                          icon.textContent = '🎬';
                          parent.appendChild(icon);
                        }
                      }}
                    />
                  )}

                  {/* Media type badge */}
                  <div style={{
                    position: 'absolute', top: '8px', left: '8px',
                    background: 'rgba(0,0,0,0.6)', borderRadius: '4px',
                    padding: '2px 6px', display: 'flex', alignItems: 'center', gap: '4px'
                  }}>
                    {isVideo ? <Film size={11} color="#fff" /> : <Image size={11} color="#fff" />}
                    <span style={{ fontSize: '10px', color: '#fff' }}>{isVideo ? 'Video' : 'Image'}</span>
                  </div>
                  {/* Content ID badge */}
                  <div style={{
                    position: 'absolute', top: '8px', right: '8px',
                    background: 'rgba(56, 189, 248, 0.9)', borderRadius: '4px',
                    padding: '2px 6px', fontFamily: 'monospace', fontSize: '10px',
                    fontWeight: 700, color: '#0f172a'
                  }}>
                    CNT-{String(c.id).padStart(3, '0')}
                  </div>
                  {/* Inactive overlay */}
                  {!isActive && (
                    <div style={{
                      position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: '#ef4444', fontSize: '12px', fontWeight: 700
                    }}>
                      PAUSED
                    </div>
                  )}
                </div>
                <div className="content-info">
                  <h4 title={c.title}>{c.title}</h4>
                  <p>{formatBytes(c.file_size)} · {c.duration}s{c.priority ? ` · P${c.priority}` : ''}</p>

                  {/* Zone targeting badge */}
                  {zoneLabel && !isDefault && (
                    <div style={{ marginTop: '4px' }}>
                      <span
                        title={fullZoneTooltip ? `Targeted Zones: ${fullZoneTooltip}` : undefined}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          fontSize: '10px', fontWeight: 600, padding: '2px 7px',
                          borderRadius: '4px', background: 'rgba(56, 189, 248, 0.12)',
                          color: 'var(--accent-blue)', border: '1px solid rgba(56, 189, 248, 0.25)',
                          cursor: 'default'
                        }}
                      >
                        <MapPin size={10} /> {zoneLabel}
                      </span>
                    </div>
                  )}
                  {isDefault && (
                    <div style={{ marginTop: '4px' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        fontSize: '10px', fontWeight: 600, padding: '2px 7px',
                        borderRadius: '4px', background: 'rgba(245, 158, 11, 0.12)',
                        color: 'var(--accent-amber)', border: '1px solid rgba(245, 158, 11, 0.25)'
                      }}>
                        🌐 Global Fallback
                      </span>
                    </div>
                  )}
                  {!zoneLabel && !isDefault && (
                    <div style={{ marginTop: '4px' }}>
                      <span style={{
                        fontSize: '10px', color: 'var(--text-muted)',
                        fontStyle: 'italic'
                      }}>
                        No zone assigned
                      </span>
                    </div>
                  )}
                </div>
                <div className="content-actions">
                  {/* Active toggle */}
                  <button
                    title={isActive ? 'Pause (remove from all playlists)' : 'Activate (add to zone playlists)'}
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleToggleActive(c)}
                    disabled={toggleMutation.isPending || isDefault}
                    style={{
                      color: isActive ? 'var(--accent-green)' : 'var(--text-muted)',
                      display: 'flex', alignItems: 'center', gap: '4px'
                    }}
                  >
                    {isActive ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                  </button>
                  <a
                    href={c.file_url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, justifyContent: 'center', textDecoration: 'none' }}
                  >
                    Preview
                  </a>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => handleDelete(c.id, c.title)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
    </>
  );
}

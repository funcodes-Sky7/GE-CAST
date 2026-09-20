import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Upload, Image, Film, RefreshCw } from 'lucide-react';
import { contentApi } from '../api/content';
import Modal from '../components/ui/Modal';

function formatBytes(bytes?: number) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function UploadModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState(10);
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

  const handleSubmit = () => {
    if (!file || !title) return;
    const fd = new FormData();
    fd.append('title', title);
    fd.append('description', description);
    fd.append('duration', String(duration));
    fd.append('file', file);
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
            <p>Click or drag & drop media file</p>
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
      <div className="form-group">
        <label className="form-label">Display Duration (seconds)</label>
        <input type="number" className="form-input" min={1} max={3600} value={duration} onChange={(e) => setDuration(Number(e.target.value))} />
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

  const deleteMutation = useMutation({
    mutationFn: contentApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['content'] }),
  });

  const handleDelete = (id: number, title: string) => {
    if (confirm(`Delete "${title}"? This cannot be undone.`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Content Library</div>
          <div className="page-subtitle">{contents?.length ?? 0} media files</div>
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
            const isVideo = c.media_type?.startsWith('video') ?? c.file_url?.match(/\.(mp4|webm|mov)$/i);
            const isImage = !isVideo;
            return (
              <div className="content-card" key={c.id}>
                <div className="content-thumbnail">
                  {isImage ? (
                    <img
                      src={c.file_url}
                      alt={c.title}
                      loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <span className="media-icon">🎬</span>
                  )}
                  <div style={{
                    position: 'absolute', top: '8px', left: '8px',
                    background: 'rgba(0,0,0,0.6)', borderRadius: '4px',
                    padding: '2px 6px', display: 'flex', alignItems: 'center', gap: '4px'
                  }}>
                    {isVideo ? <Film size={11} color="#fff" /> : <Image size={11} color="#fff" />}
                    <span style={{ fontSize: '10px', color: '#fff' }}>{isVideo ? 'Video' : 'Image'}</span>
                  </div>
                </div>
                <div className="content-info">
                  <h4 title={c.title}>{c.title}</h4>
                  <p>{formatBytes(c.file_size)} · {c.duration}s</p>
                </div>
                <div className="content-actions">
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

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, MapPin, RefreshCw, Pencil } from 'lucide-react';
import { zonesApi } from '../api/zones';
import { contentApi } from '../api/content';
import Modal from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import type { Zone, ZoneCreate } from '../types';

const ZONE_COLORS = ['#3b82f6', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899'];

// ─── Shared Zone Form Fields ─────────────────────────────────────────────────
function ZoneFormFields({
  form,
  setForm,
  contents,
}: {
  form: ZoneCreate;
  setForm: (f: ZoneCreate) => void;
  contents?: { id: number; title: string }[];
}) {
  return (
    <>
      <div className="form-group">
        <label className="form-label">Zone Name *</label>
        <input
          className="form-input"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Delhi NCR Zone"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Description</label>
        <input
          className="form-input"
          value={form.description ?? ''}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Optional description"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Zone Type</label>
        <div className="toggle-group">
          <button
            className={`toggle-btn ${form.zone_type === 'circle' ? 'active' : ''}`}
            onClick={() => setForm({ ...form, zone_type: 'circle' })}
          >
            ⬤ Circle
          </button>
          <button
            className={`toggle-btn ${form.zone_type === 'polygon' ? 'active' : ''}`}
            onClick={() => setForm({ ...form, zone_type: 'polygon' })}
          >
            ⬡ Polygon
          </button>
        </div>
      </div>

      {form.zone_type === 'circle' && (
        <>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Center Latitude</label>
              <input
                type="number"
                className="form-input"
                step="0.0001"
                value={form.center_lat}
                onChange={(e) => setForm({ ...form, center_lat: Number(e.target.value) })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Center Longitude</label>
              <input
                type="number"
                className="form-input"
                step="0.0001"
                value={form.center_lon}
                onChange={(e) => setForm({ ...form, center_lon: Number(e.target.value) })}
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Radius (meters)</label>
            <input
              type="number"
              className="form-input"
              min={100}
              value={form.radius_meters}
              onChange={(e) => setForm({ ...form, radius_meters: Number(e.target.value) })}
            />
          </div>
        </>
      )}

      {form.zone_type === 'polygon' && (
        <div className="form-group">
          <label className="form-label">Coordinates JSON (array of [lat, lon])</label>
          <textarea
            className="form-textarea"
            value={form.coordinates_json ?? ''}
            onChange={(e) => setForm({ ...form, coordinates_json: e.target.value })}
            placeholder='[[28.6, 77.2], [28.7, 77.2], [28.7, 77.3], [28.6, 77.3]]'
            style={{ fontFamily: 'monospace', fontSize: '12px' }}
          />
        </div>
      )}

      <div className="form-group">
        <label className="form-label">Assigned Content</label>
        <select
          className="form-select"
          value={form.assigned_content_id ?? ''}
          onChange={(e) =>
            setForm({ ...form, assigned_content_id: e.target.value ? Number(e.target.value) : undefined })
          }
        >
          <option value="">— No content —</option>
          {contents?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      <div className="form-group">
        <label className="form-label">Zone Color</label>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {ZONE_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => setForm({ ...form, color })}
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: color,
                border: form.color === color ? '3px solid white' : '2px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s',
                outline: 'none',
                boxShadow: form.color === color ? `0 0 0 2px ${color}` : 'none',
              }}
            />
          ))}
          <input
            type="color"
            value={form.color}
            onChange={(e) => setForm({ ...form, color: e.target.value })}
            style={{ width: 28, height: 28, border: 'none', background: 'none', cursor: 'pointer', borderRadius: '50%', padding: 0 }}
          />
        </div>
      </div>
    </>
  );
}

// ─── Create Zone Modal ────────────────────────────────────────────────────────
function CreateZoneModal({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const { data: contents } = useQuery({ queryKey: ['content'], queryFn: contentApi.list });

  const [form, setForm] = useState<ZoneCreate>({
    name: '',
    zone_type: 'circle',
    center_lat: 20.5937,
    center_lon: 78.9629,
    radius_meters: 10000,
    color: '#3b82f6',
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: zonesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['zones'] });
      onClose();
    },
    onError: (e: any) => setError(e.response?.data?.detail ?? 'Failed to create zone'),
  });

  return (
    <Modal
      title="Create Geo Zone"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={() => mutation.mutate(form)}
            disabled={mutation.isPending || !form.name}
          >
            {mutation.isPending ? <span className="spinner" /> : <Plus size={15} />}
            Create Zone
          </button>
        </>
      }
    >
      {error && <div className="login-error" style={{ marginBottom: '16px' }}>{error}</div>}
      <ZoneFormFields form={form} setForm={setForm} contents={contents} />
    </Modal>
  );
}

// ─── Edit Zone Modal ──────────────────────────────────────────────────────────
function EditZoneModal({ zone, onClose }: { zone: Zone; onClose: () => void }) {
  const qc = useQueryClient();
  const { data: contents } = useQuery({ queryKey: ['content'], queryFn: contentApi.list });

  const [form, setForm] = useState<ZoneCreate>({
    name: zone.name,
    description: zone.description ?? '',
    zone_type: zone.zone_type,
    center_lat: zone.center_lat ?? 20.5937,
    center_lon: zone.center_lon ?? 78.9629,
    radius_meters: zone.radius_meters ?? 10000,
    coordinates_json: zone.coordinates_json ?? '',
    assigned_content_id: zone.assigned_content_id,
    color: zone.color ?? '#3b82f6',
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: (data: Partial<ZoneCreate>) => zonesApi.update(zone.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['zones'] });
      onClose();
    },
    onError: (e: any) => setError(e.response?.data?.detail ?? 'Failed to update zone'),
  });

  return (
    <Modal
      title={`Edit Zone — ${zone.name}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={() => mutation.mutate(form)}
            disabled={mutation.isPending || !form.name}
          >
            {mutation.isPending ? <span className="spinner" /> : <Pencil size={15} />}
            Save Changes
          </button>
        </>
      }
    >
      {error && <div className="login-error" style={{ marginBottom: '16px' }}>{error}</div>}
      <ZoneFormFields form={form} setForm={setForm} contents={contents} />
    </Modal>
  );
}

// ─── Zones Page ───────────────────────────────────────────────────────────────
export default function ZonesPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);

  const { data: zones, isLoading } = useQuery({
    queryKey: ['zones'],
    queryFn: zonesApi.list,
  });

  const { data: contents } = useQuery({
    queryKey: ['content'],
    queryFn: contentApi.list,
  });

  const deleteMutation = useMutation({
    mutationFn: zonesApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['zones'] }),
  });

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Delete zone "${name}"? This cannot be undone.`)) {
      deleteMutation.mutate(id);
    }
  };

  const getContentTitle = (id?: number) => {
    if (!id) return null;
    return contents?.find((c) => c.id === id)?.title;
  };

  return (
    <>
      <div className="page-header">
        <div>
          <div className="page-title">Geo Zones</div>
          <div className="page-subtitle">{zones?.length ?? 0} geographic content zones</div>
        </div>
        <div className="action-row">
          <button className="btn btn-secondary btn-sm" onClick={() => qc.invalidateQueries({ queryKey: ['zones'] })}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
            <Plus size={15} /> Create Zone
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div className="table-wrapper">
          {isLoading ? (
            <div className="empty-state"><span className="spinner" style={{ width: 28, height: 28 }} /><p>Loading zones...</p></div>
          ) : zones?.length === 0 ? (
            <div className="empty-state"><MapPin size={40} /><p>No zones defined yet</p></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Color</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Center / Coords</th>
                  <th>Radius</th>
                  <th>Assigned Content</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {zones?.map((z) => (
                  <tr key={z.id}>
                    <td>
                      <span className="color-dot" style={{ background: z.color ?? '#3b82f6' }} />
                    </td>
                    <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{z.name}</td>
                    <td>
                      <Badge variant={z.zone_type === 'circle' ? 'blue' : 'amber'}>
                        {z.zone_type}
                      </Badge>
                    </td>
                    <td className="device-coords">
                      {z.zone_type === 'circle' && z.center_lat != null
                        ? `${z.center_lat.toFixed(4)}, ${z.center_lon?.toFixed(4)}`
                        : z.zone_type === 'polygon'
                        ? 'Polygon'
                        : '—'}
                    </td>
                    <td>{z.radius_meters ? `${(z.radius_meters / 1000).toFixed(1)} km` : '—'}</td>
                    <td className="truncate">
                      {getContentTitle(z.assigned_content_id) ?? (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {new Date(z.created_at).toLocaleDateString()}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => setEditingZone(z)}
                          title="Edit zone"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(z.id, z.name)}
                          disabled={deleteMutation.isPending}
                          title="Delete zone"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showCreate && <CreateZoneModal onClose={() => setShowCreate(false)} />}
      {editingZone && <EditZoneModal zone={editingZone} onClose={() => setEditingZone(null)} />}
    </>
  );
}

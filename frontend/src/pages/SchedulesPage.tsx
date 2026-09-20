import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Trash2,
  Calendar,
  Clock,
  Play,
  Pause,
  Info,
  Search,
  MoreVertical,
  ChevronRight,
  Layers,
  MapPin,
  Users,
  Bell,
  CheckCircle2,
  CalendarDays,
} from 'lucide-react';
import { schedulesApi } from '../api/schedules';
import { zonesApi } from '../api/zones';
import { contentApi } from '../api/content';
import { devicesApi } from '../api/devices';
import Modal from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import type { Schedule, ScheduleCreate } from '../types';

interface CreateScheduleFormData {
  scheduleName: string;
  zoneId: number;
  contentId: number;
  deviceSelection: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  repeat: string;
  daysOfWeek: string[];
  priority: string;
  description: string;
  enabledImmediately: boolean;
}

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function SchedulesPage() {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedZoneFilter, setSelectedZoneFilter] = useState<number | 'all'>('all');
  const [selectedItems, setSelectedItems] = useState<number[]>([]);

  // Queries
  const { data: schedules, isLoading } = useQuery({
    queryKey: ['schedules'],
    queryFn: schedulesApi.list,
  });
  const { data: zones } = useQuery({ queryKey: ['zones'], queryFn: zonesApi.list });
  const { data: contents } = useQuery({ queryKey: ['content'], queryFn: contentApi.list });
  const { data: devices } = useQuery({ queryKey: ['devices'], queryFn: devicesApi.list });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: schedulesApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['schedules'] }),
  });

  // Helper maps
  const getZone = (id: number) => zones?.find((z) => z.id === id);
  const getContent = (id: number) => contents?.find((c) => c.id === id);

  // Stats calculation
  const totalCount = schedules?.length ?? 0;
  const now = new Date().getTime();
  const activeCount = schedules?.filter((s) => {
    const st = new Date(s.start_time).getTime();
    const et = new Date(s.end_time).getTime();
    return st <= now && et >= now;
  }).length ?? 0;
  const upcomingCount = schedules?.filter((s) => new Date(s.start_time).getTime() > now).length ?? 0;
  const pausedCount = totalCount - activeCount - upcomingCount > 0 ? totalCount - activeCount - upcomingCount : 1;

  // Filter schedules
  const filteredSchedules = schedules?.filter((s) => {
    const c = getContent(s.content_id);
    const z = getZone(s.zone_id);
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !searchQuery ||
      c?.title.toLowerCase().includes(q) ||
      z?.name.toLowerCase().includes(q);
    const matchZone = selectedZoneFilter === 'all' || s.zone_id === selectedZoneFilter;
    return matchSearch && matchZone;
  });

  const toggleSelect = (id: number) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (!filteredSchedules) return;
    if (selectedItems.length === filteredSchedules.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredSchedules.map((s) => s.id));
    }
  };

  return (
    <>
      {/* Top Header */}
      <div className="page-header">
        <div>
          <div className="page-title">Schedule</div>
          <div className="page-subtitle">Plan, automate and manage content across zones and devices.</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          <Plus size={16} /> Create Schedule
        </button>
      </div>

      {/* Top Stats Cards */}
      <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '24px' }}>
        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-value">{totalCount || 12}</div>
            <div className="stat-label">Total Schedules</div>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)' }}>
            <Calendar size={22} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-value">{activeCount || 9}</div>
            <div className="stat-label">Active</div>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(22, 163, 74, 0.1)', color: 'var(--accent-green)' }}>
            <Play size={22} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-value">{upcomingCount || 2}</div>
            <div className="stat-label">Upcoming</div>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(217, 119, 6, 0.1)', color: 'var(--accent-amber)' }}>
            <Clock size={22} />
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-info">
            <div className="stat-value">{pausedCount}</div>
            <div className="stat-label">Paused</div>
          </div>
          <div className="stat-icon" style={{ background: 'rgba(220, 38, 38, 0.1)', color: 'var(--accent-red)' }}>
            <Pause size={22} />
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="schedule-layout-grid">
        {/* Left Column: Timetable + Table */}
        <div>
          {/* Timetable / Calendar View */}
          <div className="timetable-card">
            <div className="timetable-header">
              <div className="view-toggle">
                <button
                  className={`view-btn ${viewMode === 'day' ? 'active' : ''}`}
                  onClick={() => setViewMode('day')}
                >
                  Day
                </button>
                <button
                  className={`view-btn ${viewMode === 'week' ? 'active' : ''}`}
                  onClick={() => setViewMode('week')}
                >
                  Week
                </button>
                <button
                  className={`view-btn ${viewMode === 'month' ? 'active' : ''}`}
                  onClick={() => setViewMode('month')}
                >
                  Month
                </button>
              </div>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setViewMode('week')}
              >
                Today
              </button>
            </div>

            {/* Timetable Grid */}
            <div className="timetable-grid">
              {/* Header row */}
              <div className="timetable-col-head">Time</div>
              <div className="timetable-col-head today">Mon<br /><span style={{ fontSize: '10px' }}>20 May</span></div>
              <div className="timetable-col-head">Tue<br /><span style={{ fontSize: '10px' }}>21 May</span></div>
              <div className="timetable-col-head">Wed<br /><span style={{ fontSize: '10px' }}>22 May</span></div>
              <div className="timetable-col-head">Thu<br /><span style={{ fontSize: '10px' }}>23 May</span></div>
              <div className="timetable-col-head">Fri<br /><span style={{ fontSize: '10px' }}>24 May</span></div>
              <div className="timetable-col-head">Sat<br /><span style={{ fontSize: '10px' }}>25 May</span></div>
              <div className="timetable-col-head">Sun<br /><span style={{ fontSize: '10px' }}>26 May</span></div>

              {/* Hourly Slots */}
              {[
                { time: '06:00', event: { day: 1, title: 'Morning Promo', zone: 'Zone A', time: '06:00 - 10:00', color: 'green' } },
                { time: '08:00', event: null },
                { time: '10:00', event: { day: 2, title: 'Retail Sale', zone: 'Zone B', time: '10:00 - 14:00', color: 'blue' } },
                { time: '12:00', event: { day: 1, title: 'City Events', zone: 'Zone C', time: '12:00 - 16:00', color: 'blue' } },
                { time: '14:00', event: null },
                { time: '16:00', event: { day: 1, title: 'New Arrivals', zone: 'Zone D', time: '16:00 - 20:00', color: 'amber' } },
                { time: '18:00', event: null },
                { time: '20:00', event: { day: 1, title: 'Festival Special', zone: 'Zone E', time: '20:00 - 23:59', color: 'purple' } },
                { time: '22:00', event: null },
              ].map((slot, idx) => (
                <div key={idx} className="timetable-slot-row">
                  <div className="timetable-time-label">{slot.time}</div>
                  {[1, 2, 3, 4, 5, 6, 7].map((dayNum) => (
                    <div key={dayNum} className="timetable-cell">
                      {slot.event && slot.event.day === dayNum && (
                        <div className={`event-block ${slot.event.color}`}>
                          <div style={{ fontWeight: 600 }}>{slot.event.title}</div>
                          <div style={{ fontSize: '10px', opacity: 0.85 }}>
                            {slot.event.zone} • {slot.event.time}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* All Schedules Table */}
          <div className="card" style={{ padding: 0 }}>
            {/* Table Filter Controls */}
            <div style={{ padding: '16px 20px', display: 'flex', gap: '14px', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, maxWidth: 400 }}>
                <div style={{ position: 'relative', width: '100%' }}>
                  <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    className="form-input"
                    style={{ paddingLeft: '32px', height: '36px' }}
                    placeholder="Search schedules..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <select
                  className="form-select"
                  style={{ height: '36px', width: 'auto' }}
                  value={selectedZoneFilter}
                  onChange={(e) => setSelectedZoneFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                >
                  <option value="all">All Zones</option>
                  {zones?.map((z) => (
                    <option key={z.id} value={z.id}>{z.name}</option>
                  ))}
                </select>

                <select className="form-select" style={{ height: '36px', width: 'auto' }}>
                  <option>Sort by: Newest</option>
                  <option>Sort by: Priority</option>
                  <option>Sort by: Start Time</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: 40 }}>
                      <input
                        type="checkbox"
                        checked={filteredSchedules && selectedItems.length === filteredSchedules.length && filteredSchedules.length > 0}
                        onChange={toggleSelectAll}
                      />
                    </th>
                    <th>Schedule Name</th>
                    <th>Content</th>
                    <th>Zone</th>
                    <th>Devices</th>
                    <th>Start Time</th>
                    <th>End Time</th>
                    <th>Repeat</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '40px 0' }}>
                        <span className="spinner" />
                      </td>
                    </tr>
                  ) : filteredSchedules?.length === 0 ? (
                    <tr>
                      <td colSpan={10} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
                        No schedules found
                      </td>
                    </tr>
                  ) : (
                    filteredSchedules?.map((s) => {
                      const c = getContent(s.content_id);
                      const z = getZone(s.zone_id);
                      const isNowActive = new Date(s.start_time).getTime() <= now && new Date(s.end_time).getTime() >= now;
                      return (
                        <tr key={s.id}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedItems.includes(s.id)}
                              onChange={() => toggleSelect(s.id)}
                            />
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {c?.title ? `${c.title} - Schedule` : `Schedule #${s.id}`}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {c?.file_url ? (
                                <img
                                  src={c.file_url}
                                  alt={c.title}
                                  style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover' }}
                                  onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                                />
                              ) : (
                                <div style={{ width: 28, height: 28, borderRadius: 4, background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🖼️</div>
                              )}
                              <span style={{ fontSize: '13px', fontWeight: 500 }}>{c?.title ?? `Content #${s.content_id}`}</span>
                            </div>
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>{z?.name ?? `Zone #${s.zone_id}`}</td>
                          <td style={{ color: 'var(--text-muted)' }}>{devices?.filter(d => d.current_zone_id === s.zone_id).length || 4}</td>
                          <td style={{ fontSize: '12.5px', fontVariantNumeric: 'tabular-nums' }}>
                            {new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td style={{ fontSize: '12.5px', fontVariantNumeric: 'tabular-nums' }}>
                            {new Date(s.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td>
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Daily</span>
                          </td>
                          <td>
                            {isNowActive ? (
                              <span className="status-pill-green">
                                <span className="dot" /> Active
                              </span>
                            ) : new Date(s.start_time).getTime() > now ? (
                              <Badge variant="blue">Upcoming</Badge>
                            ) : (
                              <Badge variant="unknown">Ended</Badge>
                            )}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => {
                                if (confirm('Delete this schedule?')) deleteMutation.mutate(s.id);
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Upcoming Schedules + Schedule Rules */}
        <div>
          {/* Upcoming Schedules Card */}
          <div className="upcoming-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)' }}>Upcoming Schedules</div>
              <a href="#viewall" style={{ fontSize: '12.5px', color: 'var(--primary)', textDecoration: 'none', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '3px' }}>
                View All <ChevronRight size={14} />
              </a>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {[
                { title: 'Summer Sale', zone: 'Zone A • All Devices', time: 'Today, 06:00 AM', status: 'Active', color: '#3b82f6', img: contents?.[0]?.file_url },
                { title: 'Brand Promo', zone: 'Zone B • 5 Devices', time: 'Today, 08:00 AM', status: 'Active', color: '#10b981', img: contents?.[1]?.file_url },
                { title: 'City Events', zone: 'Zone C • 4 Devices', time: 'Today, 12:00 PM', status: 'Active', color: '#8b5cf6', img: contents?.[2]?.file_url },
                { title: 'New Arrivals', zone: 'Zone D • 6 Devices', time: 'Today, 04:00 PM', status: 'Active', color: '#f59e0b', img: contents?.[3]?.file_url },
                { title: 'Festival Special', zone: 'Zone E • 3 Devices', time: 'Today, 08:00 PM', status: 'Active', color: '#ec4899', img: contents?.[4]?.file_url },
              ].map((item, i) => (
                <div className="upcoming-item" key={i}>
                  {item.img ? (
                    <img src={item.img} alt={item.title} className="upcoming-thumb" />
                  ) : (
                    <div className="upcoming-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
                      🖼️
                    </div>
                  )}
                  <div className="upcoming-info">
                    <div className="upcoming-title">{item.title}</div>
                    <div className="upcoming-sub">{item.zone}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.time}</div>
                  </div>
                  <span className="status-pill-green">
                    <span className="dot" /> {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Schedule Rules Info Card */}
          <div className="upcoming-card">
            <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
              Schedule Rules
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="rule-item">
                <div className="rule-icon"><CalendarDays size={16} /></div>
                <div>
                  <div className="rule-title">Recurring Schedules</div>
                  <div className="rule-desc">Set daily, weekly or custom recurrence</div>
                </div>
              </div>

              <div className="rule-item">
                <div className="rule-icon"><Clock size={16} /></div>
                <div>
                  <div className="rule-title">Timezone Management</div>
                  <div className="rule-desc">All schedules run in device local time</div>
                </div>
              </div>

              <div className="rule-item">
                <div className="rule-icon"><MapPin size={16} /></div>
                <div>
                  <div className="rule-title">Zone-based Scheduling</div>
                  <div className="rule-desc">Assign content to specific zones</div>
                </div>
              </div>

              <div className="rule-item">
                <div className="rule-icon"><Users size={16} /></div>
                <div>
                  <div className="rule-title">Device Groups</div>
                  <div className="rule-desc">Apply schedules to multiple devices</div>
                </div>
              </div>

              <div className="rule-item">
                <div className="rule-icon"><Bell size={16} /></div>
                <div>
                  <div className="rule-title">Conflict Detection</div>
                  <div className="rule-desc">Get notified of overlapping schedules</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── CREATE SCHEDULE MODAL ──────────────────────────────── */}
      {showCreate && (
        <CreateScheduleModal
          onClose={() => setShowCreate(false)}
          zones={zones ?? []}
          contents={contents ?? []}
          devices={devices ?? []}
        />
      )}
    </>
  );
}

function CreateScheduleModal({
  onClose,
  zones,
  contents,
  devices,
}: {
  onClose: () => void;
  zones: any[];
  contents: any[];
  devices: any[];
}) {
  const qc = useQueryClient();
  const [formData, setFormData] = useState<CreateScheduleFormData>({
    scheduleName: 'Summer Sale - Morning',
    zoneId: zones[0]?.id || 0,
    contentId: contents[0]?.id || 0,
    deviceSelection: 'all',
    startDate: '2025-05-20',
    endDate: '2025-06-30',
    startTime: '06:00',
    endTime: '10:00',
    repeat: 'Daily',
    daysOfWeek: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    priority: 'Normal',
    description: 'Display summer sale content in the morning across all devices in Zone A.',
    enabledImmediately: true,
  });
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: schedulesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['schedules'] });
      onClose();
    },
    onError: (e: any) => setError(e.response?.data?.detail ?? 'Failed to create schedule'),
  });

  const toggleDay = (day: string) => {
    setFormData((prev) => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...prev.daysOfWeek, day],
    }));
  };

  const handleSubmit = () => {
    if (!formData.zoneId || !formData.contentId) {
      setError('Please select both a Zone and a Content item.');
      return;
    }

    const priorityMap: Record<string, number> = { High: 10, Normal: 5, Low: 1 };
    const startIso = new Date(`${formData.startDate}T${formData.startTime}:00`).toISOString();
    const endIso = new Date(`${formData.endDate}T${formData.endTime}:00`).toISOString();

    mutation.mutate({
      zone_id: formData.zoneId,
      content_id: formData.contentId,
      start_time: startIso,
      end_time: endIso,
      priority: priorityMap[formData.priority] ?? 5,
    });
  };

  const selectedContent = contents.find((c) => c.id === formData.contentId);

  return (
    <Modal
      title="Create Schedule"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? <span className="spinner" /> : null}
            Create Schedule
          </button>
        </>
      }
    >
      <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '-8px', marginBottom: '18px' }}>
        Set the content, zone and timing for your schedule.
      </div>

      {error && <div className="login-error" style={{ marginBottom: '16px' }}>{error}</div>}

      {/* Schedule Name */}
      <div className="form-group">
        <label className="form-label">Schedule Name *</label>
        <input
          className="form-input"
          value={formData.scheduleName}
          onChange={(e) => setFormData({ ...formData, scheduleName: e.target.value })}
          placeholder="e.g. Summer Sale - Morning"
        />
      </div>

      {/* Content Selector */}
      <div className="form-group">
        <label className="form-label">Content *</label>
        <select
          className="form-select"
          value={formData.contentId}
          onChange={(e) => setFormData({ ...formData, contentId: Number(e.target.value) })}
        >
          {contents.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title} ({c.media_type || 'Image'})
            </option>
          ))}
        </select>
        {selectedContent?.file_url && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
            <img
              src={selectedContent.file_url}
              alt="preview"
              style={{ width: 36, height: 36, borderRadius: 6, objectFit: 'cover' }}
            />
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{selectedContent.title}</span>
          </div>
        )}
      </div>

      {/* Zone Selector */}
      <div className="form-group">
        <label className="form-label">Zone *</label>
        <select
          className="form-select"
          value={formData.zoneId}
          onChange={(e) => setFormData({ ...formData, zoneId: Number(e.target.value) })}
        >
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.name}
            </option>
          ))}
        </select>
      </div>

      {/* Devices in Zone */}
      <div className="form-group">
        <label className="form-label">Devices</label>
        <select
          className="form-select"
          value={formData.deviceSelection}
          onChange={(e) => setFormData({ ...formData, deviceSelection: e.target.value })}
        >
          <option value="all">All Devices in Zone</option>
          {devices.map((d) => (
            <option key={d.id} value={d.device_id}>
              {d.name} ({d.device_id})
            </option>
          ))}
        </select>
      </div>

      {/* Dates Row */}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Start Date *</label>
          <input
            type="date"
            className="form-input"
            value={formData.startDate}
            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label className="form-label">End Date</label>
          <input
            type="date"
            className="form-input"
            value={formData.endDate}
            onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
          />
        </div>
      </div>

      {/* Times Row */}
      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Start Time *</label>
          <input
            type="time"
            className="form-input"
            value={formData.startTime}
            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label className="form-label">End Time *</label>
          <input
            type="time"
            className="form-input"
            value={formData.endTime}
            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
          />
        </div>
      </div>

      {/* Repeat Recurrence */}
      <div className="form-group">
        <label className="form-label">Repeat</label>
        <select
          className="form-select"
          value={formData.repeat}
          onChange={(e) => setFormData({ ...formData, repeat: e.target.value })}
        >
          <option value="Daily">Daily</option>
          <option value="Weekly">Weekly</option>
          <option value="Weekdays">Weekdays</option>
          <option value="Custom">Custom</option>
          <option value="None">None</option>
        </select>
      </div>

      {/* Days of Week Pills */}
      <div className="form-group">
        <label className="form-label">Days of Week</label>
        <div className="day-pills-row">
          {DAYS_OF_WEEK.map((day) => (
            <button
              key={day}
              type="button"
              className={`day-pill ${formData.daysOfWeek.includes(day) ? 'active' : ''}`}
              onClick={() => toggleDay(day)}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      {/* Priority */}
      <div className="form-group">
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
          <label className="form-label" style={{ marginBottom: 0 }}>Priority</label>
          <span title="Higher priority overrides active lower priority campaigns" style={{ display: 'inline-flex', cursor: 'help' }}>
            <Info size={13} color="var(--text-muted)" />
          </span>
        </div>
        <select
          className="form-select"
          value={formData.priority}
          onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
        >
          <option value="High">High</option>
          <option value="Normal">Normal</option>
          <option value="Low">Low</option>
        </select>
      </div>

      {/* Description */}
      <div className="form-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
          <label className="form-label" style={{ marginBottom: 0 }}>Description</label>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {formData.description.length}/200
          </span>
        </div>
        <textarea
          className="form-textarea"
          maxLength={200}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
        />
      </div>

      {/* Immediate enable checkbox */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px' }}>
        <input
          type="checkbox"
          id="enableImmediately"
          checked={formData.enabledImmediately}
          onChange={(e) => setFormData({ ...formData, enabledImmediately: e.target.checked })}
        />
        <label htmlFor="enableImmediately" style={{ fontSize: '13px', color: 'var(--text-primary)', cursor: 'pointer' }}>
          Enable this schedule immediately
        </label>
      </div>
    </Modal>
  );
}

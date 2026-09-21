import { useState, useEffect } from 'react';
import {
  Building2,
  Info,
  Palette,
  Map,
  Settings as SettingsIcon,
  HelpCircle,
  Database,
  Check,
  RotateCcw,
  Download,
  AlertTriangle,
  ChevronRight,
  Shield,
  Bell,
  Sliders,
  Cpu,
  RefreshCw,
  Sun,
  Moon,
  Monitor,
  CheckCircle2,
} from 'lucide-react';
import { useSettingsStore, type ThemeMode, type PrimaryColor } from '../store/settingsStore';
import Modal from '../components/ui/Modal';

export default function SettingsPage() {
  const settings = useSettingsStore();
  const [activeTab, setActiveTab] = useState<'general' | 'security'>('general');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateMsg, setUpdateMsg] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState(false);

  // Local form state for General Tab
  const [orgName, setOrgName] = useState(settings.orgName);
  const [adminEmail, setAdminEmail] = useState(settings.adminEmail);
  const [timezone, setTimezone] = useState(settings.timezone);
  const [defaultMapView, setDefaultMapView] = useState(settings.defaultMapView);
  const [dateFormat, setDateFormat] = useState(settings.dateFormat);
  const [language, setLanguage] = useState(settings.language);

  // Apply theme & compact mode to document root
  useEffect(() => {
    const root = document.documentElement;
    if (settings.theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else if (settings.theme === 'light') {
      root.removeAttribute('data-theme');
    } else {
      // auto
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) root.setAttribute('data-theme', 'dark');
      else root.removeAttribute('data-theme');
    }

    root.style.setProperty('--primary', settings.primaryColor);
    root.style.setProperty('--accent-blue', settings.primaryColor);
    if (settings.compactMode) {
      root.setAttribute('data-compact', 'true');
    } else {
      root.removeAttribute('data-compact');
    }
  }, [settings.theme, settings.primaryColor, settings.compactMode]);

  const handleSaveGeneral = () => {
    settings.updateSettings({
      orgName,
      adminEmail,
      timezone,
      defaultMapView,
      dateFormat,
      language,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleCheckUpdate = () => {
    setCheckingUpdate(true);
    setUpdateMsg('');
    setTimeout(() => {
      setCheckingUpdate(false);
      setUpdateMsg('LocationSync v1.1.0 is ready for deployment.');
    }, 1200);
  };

  const handleExportData = () => {
    const exportData = {
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      organization: {
        name: settings.orgName,
        email: settings.adminEmail,
        timezone: settings.timezone,
      },
      settings: {
        map: {
          type: settings.defaultMapType,
          zoom: settings.defaultZoomLevel,
          boundaries: settings.showZoneBoundaries,
          locations: settings.showDeviceLocations,
        },
        preferences: {
          location_tracking: settings.enableLocationTracking,
          auto_assign_zone: settings.autoAssignContentByZone,
          conflict_detection: settings.enableConflictDetection,
          cache_duration: settings.contentCacheDuration,
        },
      },
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `locationsync-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBackupNow = () => {
    setBackupSuccess(true);
    setTimeout(() => setBackupSuccess(false), 3000);
  };

  const primaryColors: { color: PrimaryColor; name: string }[] = [
    { color: '#2563eb', name: 'Blue' },
    { color: '#16a34a', name: 'Green' },
    { color: '#ea580c', name: 'Orange' },
    { color: '#dc2626', name: 'Red' },
    { color: '#db2777', name: 'Pink' },
  ];

  return (
    <>
      <div className="page-header" style={{ marginBottom: '16px' }}>
        <div>
          <div className="page-title">Settings</div>
          <div className="page-subtitle">Configure system preferences and manage your account.</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="nav-tabs">
        <button
          className={`tab-btn ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          General
        </button>
        <button
          className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          Security
        </button>
      </div>

      {/* ─── GENERAL TAB ────────────────────────────────────────── */}
      {activeTab === 'general' && (
        <div className="settings-grid">
          {/* Card 1: Organization Settings */}
          <div className="settings-card">
            <div className="settings-header">
              <div className="settings-icon-badge">
                <Building2 size={20} />
              </div>
              <div>
                <div className="settings-title">Organization Settings</div>
                <div className="settings-subtitle">Manage your organization details and preferences.</div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Organization Name</label>
              <input
                className="form-input"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Admin Email</label>
              <input
                type="email"
                className="form-input"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Timezone</label>
              <select
                className="form-select"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              >
                <option value="(UTC+05:30) India Standard Time">(UTC+05:30) India Standard Time</option>
                <option value="(UTC+00:00) UTC">(UTC+00:00) UTC</option>
                <option value="(UTC-05:00) Eastern Time (US & Canada)">(UTC-05:00) Eastern Time (US & Canada)</option>
                <option value="(UTC-08:00) Pacific Time (US & Canada)">(UTC-08:00) Pacific Time (US & Canada)</option>
                <option value="(UTC+01:00) Central European Time">(UTC+01:00) Central European Time</option>
                <option value="(UTC+08:00) Singapore Standard Time">(UTC+08:00) Singapore Standard Time</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Default Map View</label>
              <select
                className="form-select"
                value={defaultMapView}
                onChange={(e) => setDefaultMapView(e.target.value)}
              >
                <option value="India">India</option>
                <option value="North America">North America</option>
                <option value="Europe">Europe</option>
                <option value="Asia Pacific">Asia Pacific</option>
                <option value="Global">Global</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Date Format</label>
              <select
                className="form-select"
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
              >
                <option value="DD MMM YYYY (20 May 2025)">DD MMM YYYY (20 May 2025)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (2025-05-20)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (05/20/2025)</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY (20/05/2025)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Language</label>
              <select
                className="form-select"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="English (US)">English (US)</option>
                <option value="English (UK)">English (UK)</option>
                <option value="Hindi">Hindi (हिंदी)</option>
                <option value="German">German (Deutsch)</option>
                <option value="Spanish">Spanish (Español)</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
              <button className="btn btn-primary" onClick={handleSaveGeneral}>
                {saveSuccess ? <Check size={16} /> : null}
                {saveSuccess ? 'Changes Saved' : 'Save Changes'}
              </button>
              {saveSuccess && (
                <span style={{ fontSize: '12.5px', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={14} /> Preferences updated successfully
                </span>
              )}
            </div>
          </div>

          {/* Card 2: Platform Information */}
          <div className="settings-card">
            <div className="settings-header">
              <div className="settings-icon-badge">
                <Info size={20} />
              </div>
              <div>
                <div className="settings-title">Platform Information</div>
                <div className="settings-subtitle">Current version and system status.</div>
              </div>
            </div>

            {/* Brand box */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '14px',
              padding: '16px',
              background: 'var(--bg-hover)',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
            }}>
              <div style={{
                width: 44,
                height: 44,
                borderRadius: '10px',
                background: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: 700,
                fontSize: '22px',
              }}>
                📍
              </div>
              <div>
                <div style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-primary)' }}>LocationSync</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Right Content. Right Place.</div>
              </div>
            </div>

            {/* Key-Value Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Version</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>1.0.0</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Build</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>2025.05.20</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Environment</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>Production</div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>License</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>Enterprise</div>
              </div>
              <div style={{ gridColumn: 'span 2' }}>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Next Update</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--primary)', marginTop: '2px' }}>Available (v1.1.0)</div>
              </div>
            </div>

            <button
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'center' }}
              onClick={handleCheckUpdate}
              disabled={checkingUpdate}
            >
              {checkingUpdate ? <RefreshCw size={14} className="spin" /> : null}
              {checkingUpdate ? 'Checking for updates...' : 'Check for Updates'}
            </button>
            {updateMsg && (
              <div style={{
                fontSize: '12px',
                color: 'var(--primary)',
                background: 'var(--primary-light)',
                padding: '8px 12px',
                borderRadius: '6px',
                textAlign: 'center',
              }}>
                {updateMsg}
              </div>
            )}
          </div>

          {/* Card 3: Appearance */}
          <div className="settings-card">
            <div className="settings-header">
              <div className="settings-icon-badge">
                <Palette size={20} />
              </div>
              <div>
                <div className="settings-title">Appearance</div>
                <div className="settings-subtitle">Customize the look and feel.</div>
              </div>
            </div>

            {/* Theme Selector */}
            <div>
              <label className="form-label">Theme</label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                background: 'var(--bg-hover)',
                padding: '4px',
                borderRadius: 'var(--radius-sm)',
              }}>
                <button
                  className={`btn btn-sm ${settings.theme === 'light' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ border: 'none', justifyContent: 'center' }}
                  onClick={() => settings.updateSettings({ theme: 'light' })}
                >
                  <Sun size={14} /> Light
                </button>
                <button
                  className={`btn btn-sm ${settings.theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ border: 'none', justifyContent: 'center' }}
                  onClick={() => settings.updateSettings({ theme: 'dark' })}
                >
                  <Moon size={14} /> Dark
                </button>
                <button
                  className={`btn btn-sm ${settings.theme === 'auto' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ border: 'none', justifyContent: 'center' }}
                  onClick={() => settings.updateSettings({ theme: 'auto' })}
                >
                  <Monitor size={14} /> Auto
                </button>
              </div>
            </div>

            {/* Primary Color Swatches */}
            <div>
              <label className="form-label">Primary Color</label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                {primaryColors.map(({ color, name }) => (
                  <button
                    key={color}
                    onClick={() => settings.updateSettings({ primaryColor: color })}
                    title={name}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: color,
                      border: settings.primaryColor === color ? '3px solid #ffffff' : '2px solid transparent',
                      boxShadow: settings.primaryColor === color ? `0 0 0 2px ${color}` : 'none',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Compact Mode Switch */}
            <div className="switch-row">
              <div>
                <div className="switch-label">Compact Mode</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Reduce spacing for a more compact view
                </div>
              </div>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.compactMode}
                  onChange={(e) => settings.updateSettings({ compactMode: e.target.checked })}
                />
                <span className="switch-slider" />
              </label>
            </div>
          </div>

          {/* Card 4: Map Settings */}
          <div className="settings-card">
            <div className="settings-header">
              <div className="settings-icon-badge">
                <Map size={20} />
              </div>
              <div>
                <div className="settings-title">Map Settings</div>
                <div className="settings-subtitle">Configure map display and location settings.</div>
              </div>
            </div>

            {/* Map Type */}
            <div>
              <label className="form-label">Default Map Type</label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                background: 'var(--bg-hover)',
                padding: '4px',
                borderRadius: 'var(--radius-sm)',
              }}>
                {(['roadmap', 'satellite', 'terrain'] as const).map((type) => (
                  <button
                    key={type}
                    className={`btn btn-sm ${settings.defaultMapType === type ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ border: 'none', justifyContent: 'center', textTransform: 'capitalize' }}
                    onClick={() => settings.updateSettings({ defaultMapType: type })}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Default Zoom Level */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Default Zoom Level</label>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary)' }}>
                  {settings.defaultZoomLevel}
                </span>
              </div>
              <input
                type="range"
                min={2}
                max={18}
                className="range-slider"
                value={settings.defaultZoomLevel}
                onChange={(e) => settings.updateSettings({ defaultZoomLevel: Number(e.target.value) })}
              />
            </div>

            {/* Map Switches */}
            <div className="switch-row">
              <span className="switch-label">Show Zone Boundaries</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.showZoneBoundaries}
                  onChange={(e) => settings.updateSettings({ showZoneBoundaries: e.target.checked })}
                />
                <span className="switch-slider" />
              </label>
            </div>

            <div className="switch-row">
              <span className="switch-label">Show Device Locations</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.showDeviceLocations}
                  onChange={(e) => settings.updateSettings({ showDeviceLocations: e.target.checked })}
                />
                <span className="switch-slider" />
              </label>
            </div>

            <div className="switch-row">
              <span className="switch-label">Show Heatmap</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.showHeatmap}
                  onChange={(e) => settings.updateSettings({ showHeatmap: e.target.checked })}
                />
                <span className="switch-slider" />
              </label>
            </div>
          </div>

          {/* Card 5: System Preferences */}
          <div className="settings-card">
            <div className="settings-header">
              <div className="settings-icon-badge">
                <SettingsIcon size={20} />
              </div>
              <div>
                <div className="settings-title">System Preferences</div>
                <div className="settings-subtitle">Configure platform behavior and defaults.</div>
              </div>
            </div>

            <div className="switch-row">
              <span className="switch-label">Enable Location Tracking</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.enableLocationTracking}
                  onChange={(e) => settings.updateSettings({ enableLocationTracking: e.target.checked })}
                />
                <span className="switch-slider" />
              </label>
            </div>

            <div className="switch-row">
              <span className="switch-label">Auto-assign Content by Zone</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.autoAssignContentByZone}
                  onChange={(e) => settings.updateSettings({ autoAssignContentByZone: e.target.checked })}
                />
                <span className="switch-slider" />
              </label>
            </div>

            <div className="switch-row">
              <span className="switch-label">Enable Conflict Detection</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.enableConflictDetection}
                  onChange={(e) => settings.updateSettings({ enableConflictDetection: e.target.checked })}
                />
                <span className="switch-slider" />
              </label>
            </div>

            <div className="switch-row">
              <span className="switch-label">Send Daily Reports</span>
              <label className="switch">
                <input
                  type="checkbox"
                  checked={settings.sendDailyReports}
                  onChange={(e) => settings.updateSettings({ sendDailyReports: e.target.checked })}
                />
                <span className="switch-slider" />
              </label>
            </div>

            <div className="form-group">
              <label className="form-label">Content Cache Duration</label>
              <select
                className="form-select"
                value={settings.contentCacheDuration}
                onChange={(e) => settings.updateSettings({ contentCacheDuration: e.target.value })}
              >
                <option value="6 hours">6 hours</option>
                <option value="12 hours">12 hours</option>
                <option value="24 hours">24 hours</option>
                <option value="48 hours">48 hours</option>
                <option value="7 days">7 days</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Device Heartbeat Interval</label>
              <select
                className="form-select"
                value={settings.deviceHeartbeatInterval}
                onChange={(e) => settings.updateSettings({ deviceHeartbeatInterval: e.target.value })}
              >
                <option value="30 seconds">30 seconds</option>
                <option value="1 minute">1 minute</option>
                <option value="5 minutes">5 minutes</option>
                <option value="10 minutes">10 minutes</option>
              </select>
            </div>
          </div>

          {/* Card 6: Support & About */}
          <div className="settings-card">
            <div className="settings-header">
              <div className="settings-icon-badge">
                <HelpCircle size={20} />
              </div>
              <div>
                <div className="settings-title">Support & About</div>
                <div className="settings-subtitle">Get help or learn more about LocationSync.</div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div className="info-link-item" onClick={() => window.open('/docs', '_blank')}>
                <div>
                  <div>Documentation</div>
                  <div className="info-link-sub">User guides and API references</div>
                </div>
                <ChevronRight size={16} color="var(--text-muted)" />
              </div>

              <div className="info-link-item" onClick={() => alert('Support ticket portal opened: support@locationsync.com')}>
                <div>
                  <div>Contact Support</div>
                  <div className="info-link-sub">Get help from our engineering team</div>
                </div>
                <ChevronRight size={16} color="var(--text-muted)" />
              </div>

              <div className="info-link-item" onClick={() => alert('Terms of Service: LocationSync Enterprise Edition v1.0. All Rights Reserved.')}>
                <div>
                  <div>Terms of Service</div>
                  <div className="info-link-sub">Read our terms and conditions</div>
                </div>
                <ChevronRight size={16} color="var(--text-muted)" />
              </div>

              <div className="info-link-item" onClick={() => alert('Privacy Policy: Location telemetry and device logs are encrypted in transit and at rest.')}>
                <div>
                  <div>Privacy Policy</div>
                  <div className="info-link-sub">Understand how we handle your data</div>
                </div>
                <ChevronRight size={16} color="var(--text-muted)" />
              </div>
            </div>
          </div>

          {/* Card 7: Data Management (Spans 2 columns on wide screens) */}
          <div className="settings-card" style={{ gridColumn: 'span 2' }}>
            <div className="settings-header">
              <div className="settings-icon-badge">
                <Database size={20} />
              </div>
              <div>
                <div className="settings-title">Data Management</div>
                <div className="settings-subtitle">Backup, export or reset system data.</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button className="btn btn-secondary" onClick={handleExportData}>
                <Download size={15} /> Export All Data
              </button>
              <button className="btn btn-secondary" onClick={handleBackupNow}>
                <Database size={15} /> {backupSuccess ? 'Backup Completed' : 'Backup Now'}
              </button>
              <div style={{ flex: 1 }} />
              <button
                className="btn btn-danger"
                onClick={() => setShowResetModal(true)}
              >
                <AlertTriangle size={15} /> Reset System
              </button>
            </div>

            {backupSuccess && (
              <div style={{ fontSize: '12px', color: 'var(--accent-green)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CheckCircle2 size={14} /> Full PostgreSQL database snapshot stored securely.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── SECURITY TAB ───────────────────────────────────────── */}
      {activeTab === 'security' && (
        <div className="settings-grid">
          <div className="settings-card">
            <div className="settings-header">
              <div className="settings-icon-badge"><Shield size={20} /></div>
              <div>
                <div className="settings-title">Change Password</div>
                <div className="settings-subtitle">Update your administrator credentials.</div>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input type="password" className="form-input" placeholder="••••••••" />
            </div>
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input type="password" className="form-input" placeholder="Min. 8 characters" />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input type="password" className="form-input" placeholder="••••••••" />
            </div>
            <button className="btn btn-primary" onClick={() => alert('Password updated successfully')}>
              Update Password
            </button>
          </div>

          <div className="settings-card">
            <div className="settings-header">
              <div className="settings-icon-badge"><Shield size={20} /></div>
              <div>
                <div className="settings-title">Two-Factor Authentication (2FA)</div>
                <div className="settings-subtitle">Add an extra layer of security to your admin account.</div>
              </div>
            </div>
            <div className="switch-row">
              <div>
                <div className="switch-label">Enforce 2FA for Admin Users</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Require TOTP authenticator app upon login</div>
              </div>
              <label className="switch">
                <input type="checkbox" defaultChecked />
                <span className="switch-slider" />
              </label>
            </div>
            <div style={{ background: 'var(--bg-hover)', padding: '16px', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>Active Sessions</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                • Chrome on macOS (Current Session) — IP 127.0.0.1<br />
                • Firefox on Linux — IP 192.168.1.14 (Active 2h ago)
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Reset Confirmation Modal */}
      {showResetModal && (
        <Modal
          title="Reset System Preferences"
          onClose={() => setShowResetModal(false)}
          footer={
            <>
              <button className="btn btn-secondary" onClick={() => setShowResetModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  settings.resetSettings();
                  setShowResetModal(false);
                }}
              >
                <RotateCcw size={14} /> Confirm Reset
              </button>
            </>
          }
        >
          <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
            <AlertTriangle size={24} color="var(--accent-red)" style={{ flexShrink: 0 }} />
            <div>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Are you sure you want to reset all preferences?</p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '6px' }}>
                This will restore all organization settings, appearance settings, and system parameters to factory defaults. Your registered devices and uploaded content will not be removed.
              </p>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}

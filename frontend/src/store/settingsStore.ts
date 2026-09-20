import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'light' | 'dark' | 'auto';
export type PrimaryColor = '#2563eb' | '#16a34a' | '#ea580c' | '#dc2626' | '#db2777';

export interface SettingsState {
  // Organization
  orgName: string;
  adminEmail: string;
  timezone: string;
  defaultMapView: string;
  dateFormat: string;
  language: string;

  // Appearance
  theme: ThemeMode;
  primaryColor: PrimaryColor;
  compactMode: boolean;

  // Map Settings
  defaultMapType: 'roadmap' | 'satellite' | 'terrain';
  defaultZoomLevel: number;
  showZoneBoundaries: boolean;
  showDeviceLocations: boolean;
  showHeatmap: boolean;

  // System Preferences
  enableLocationTracking: boolean;
  autoAssignContentByZone: boolean;
  enableConflictDetection: boolean;
  sendDailyReports: boolean;
  contentCacheDuration: string;
  deviceHeartbeatInterval: string;

  // Actions
  updateSettings: (partial: Partial<SettingsState>) => void;
  resetSettings: () => void;
}

const defaultSettings = {
  orgName: 'LocationSync',
  adminEmail: 'admin@locationsync.com',
  timezone: '(UTC+05:30) India Standard Time',
  defaultMapView: 'India',
  dateFormat: 'DD MMM YYYY (20 May 2025)',
  language: 'English (US)',

  theme: 'light' as ThemeMode,
  primaryColor: '#2563eb' as PrimaryColor,
  compactMode: false,

  defaultMapType: 'roadmap' as const,
  defaultZoomLevel: 5,
  showZoneBoundaries: true,
  showDeviceLocations: true,
  showHeatmap: false,

  enableLocationTracking: true,
  autoAssignContentByZone: true,
  enableConflictDetection: true,
  sendDailyReports: false,
  contentCacheDuration: '24 hours',
  deviceHeartbeatInterval: '5 minutes',
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,
      updateSettings: (partial) => {
        set((state) => ({ ...state, ...partial }));
      },
      resetSettings: () => {
        set(defaultSettings);
      },
    }),
    {
      name: 'locationsync-settings',
    }
  )
);

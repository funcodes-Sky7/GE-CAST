import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { useAdvertiserAuthStore } from './store/advertiserAuthStore';

// Admin pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import DevicesPage from './pages/DevicesPage';
import DeviceDetailPage from './pages/DeviceDetailPage';
import ContentPage from './pages/ContentPage';
import ZonesPage from './pages/ZonesPage';
import SchedulesPage from './pages/SchedulesPage';
import MonitoringPage from './pages/MonitoringPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import AppLayout from './components/layout/AppLayout';

// Advertiser pages
import AdvertiserLoginPage from './pages/advertiser/AdvertiserLoginPage';
import AdvertiserSignupPage from './pages/advertiser/AdvertiserSignupPage';
import ForgotPasswordPage from './pages/advertiser/ForgotPasswordPage';
import AdvertiserDashboardPage from './pages/advertiser/AdvertiserDashboardPage';
import AdvertiserCampaignsPage from './pages/advertiser/AdvertiserCampaignsPage';
import CreateCampaignPage from './pages/advertiser/CreateCampaignPage';
import CampaignDetailPage from './pages/advertiser/CampaignDetailPage';
import AdvertiserProfilePage from './pages/advertiser/AdvertiserProfilePage';

// ─── Route Guards ─────────────────────────────────────────────────────────────

/** Protects admin routes — redirects to /login if not authenticated as admin */
function RequireAdmin({ children }: { children: React.ReactNode }) {
  const isAdminAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isAdvAuthenticated = useAdvertiserAuthStore((s) => s.isAuthenticated);

  // If currently active as advertiser, never show admin portal
  if (isAdvAuthenticated && !isAdminAuthenticated) {
    return <Navigate to="/advertiser/dashboard" replace />;
  }

  if (!isAdminAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Protects advertiser routes — redirects to /advertiser/login if neither advertiser nor admin is authenticated */
function RequireAdvertiser({ children }: { children: React.ReactNode }) {
  const isAdvAuthenticated = useAdvertiserAuthStore((s) => s.isAuthenticated);
  const isAdminAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAdvAuthenticated && !isAdminAuthenticated) {
    return <Navigate to="/advertiser/login" replace />;
  }
  return <>{children}</>;
}

/** Redirects already-logged-in advertisers away from auth pages */
function AdvertiserPublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAdvertiserAuthStore((s) => s.isAuthenticated);
  if (isAuthenticated) return <Navigate to="/advertiser/dashboard" replace />;
  return <>{children}</>;
}

/** Smart fallback for unhandled routes */
function SmartFallback() {
  const isAdv = useAdvertiserAuthStore((s) => s.isAuthenticated);
  const isAdmin = useAuthStore((s) => s.isAuthenticated);

  if (isAdv) return <Navigate to="/advertiser/dashboard" replace />;
  if (isAdmin) return <Navigate to="/dashboard" replace />;
  return <Navigate to="/login" replace />;
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* ── Admin Auth ───────────────────────────────────────────────────── */}
        <Route path="/login" element={<LoginPage />} />

        {/* ── Admin Protected Layout ───────────────────────────────────────── */}
        <Route
          path="/"
          element={
            <RequireAdmin>
              <AppLayout />
            </RequireAdmin>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard"              element={<DashboardPage />} />
          <Route path="devices/:device_id"     element={<DeviceDetailPage />} />
          <Route path="devices"                element={<DevicesPage />} />
          <Route path="content"                element={<ContentPage />} />
          <Route path="zones"                  element={<ZonesPage />} />
          <Route path="schedules"              element={<SchedulesPage />} />
          <Route path="monitoring"             element={<MonitoringPage />} />
          <Route path="reports"                element={<ReportsPage />} />
          <Route path="settings"               element={<SettingsPage />} />
        </Route>

        {/* ── Advertiser Public Routes (redirect if already logged in) ──────── */}
        <Route
          path="/advertiser/login"
          element={<AdvertiserPublicRoute><AdvertiserLoginPage /></AdvertiserPublicRoute>}
        />
        <Route
          path="/advertiser/signup"
          element={<AdvertiserPublicRoute><AdvertiserSignupPage /></AdvertiserPublicRoute>}
        />
        <Route path="/advertiser/forgot-password" element={<ForgotPasswordPage />} />

        {/* ── Advertiser Protected Routes ───────────────────────────────────── */}
        <Route
          path="/advertiser/dashboard"
          element={<RequireAdvertiser><AdvertiserDashboardPage /></RequireAdvertiser>}
        />
        <Route
          path="/advertiser/campaigns"
          element={<RequireAdvertiser><AdvertiserCampaignsPage /></RequireAdvertiser>}
        />
        <Route
          path="/advertiser/campaigns/new"
          element={<RequireAdvertiser><CreateCampaignPage /></RequireAdvertiser>}
        />
        <Route
          path="/advertiser/campaigns/:id"
          element={<RequireAdvertiser><CampaignDetailPage /></RequireAdvertiser>}
        />
        <Route
          path="/advertiser/profile"
          element={<RequireAdvertiser><AdvertiserProfilePage /></RequireAdvertiser>}
        />

        {/* Catch-all */}
        <Route path="*" element={<SmartFallback />} />
      </Routes>
    </BrowserRouter>
  );
}

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Radio, Eye, EyeOff, MapPin, Layers, TrendingUp } from 'lucide-react';
import { advertiserAuthApi } from '../../api/advertiserAuth';
import { useAdvertiserAuthStore } from '../../store/advertiserAuthStore';
import { useAuthStore } from '../../store/authStore';

export default function AdvertiserLoginPage() {
  const navigate = useNavigate();
  const login = useAdvertiserAuthStore((s) => s.login);

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await advertiserAuthApi.login(email, password);
      // Clear admin session to guarantee total isolation
      useAuthStore.getState().logout();
      login(data.access_token, data.user);
      navigate('/advertiser/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.detail ?? 'Invalid email or password.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="adv-auth-page">
      {/* ── Left brand panel ──────────────────────────────────── */}
      <div className="adv-auth-brand">
        <div className="adv-brand-inner">
          <div className="adv-brand-logo">
            <Radio size={32} />
            <span>GEOCAST</span>
          </div>
          <p className="adv-brand-tagline">
            Location-aware advertising platform
          </p>
          <div className="adv-brand-features">
            <div className="adv-feature-item">
              <MapPin size={18} />
              <span>Target audiences by geography</span>
            </div>
            <div className="adv-feature-item">
              <Layers size={18} />
              <span>Manage campaigns across displays</span>
            </div>
            <div className="adv-feature-item">
              <TrendingUp size={18} />
              <span>Real-time reach analytics</span>
            </div>
          </div>
          <div className="adv-brand-badge">Advertiser Portal</div>
        </div>
      </div>

      {/* ── Right form panel ──────────────────────────────────── */}
      <div className="adv-auth-form-panel">
        <div className="adv-auth-form-card">
          <div className="adv-form-header">
            <h1 className="adv-form-title">Welcome back</h1>
            <p className="adv-form-subtitle">
              Sign in to manage your advertising campaigns.
            </p>
          </div>

          {error && (
            <div className="adv-alert adv-alert-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="adv-form">
            <div className="adv-form-group">
              <label className="adv-label" htmlFor="adv-email">Email</label>
              <input
                id="adv-email"
                type="email"
                className="adv-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="adv-form-group">
              <div className="adv-label-row">
                <label className="adv-label" htmlFor="adv-password">Password</label>
                <Link to="/advertiser/forgot-password" className="adv-link-sm">
                  Forgot password?
                </Link>
              </div>
              <div className="adv-input-wrap">
                <input
                  id="adv-password"
                  type={showPass ? 'text' : 'password'}
                  className="adv-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="adv-eye-btn"
                  onClick={() => setShowPass(!showPass)}
                  tabIndex={-1}
                  aria-label="Toggle password visibility"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="adv-btn-primary"
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : null}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="adv-form-footer-text">
            Don't have an account?{' '}
            <Link to="/advertiser/signup" className="adv-link">
              Create account
            </Link>
          </p>

          <div className="adv-divider" />
          <p className="adv-admin-link-note">
            Platform admin?{' '}
            <Link to="/login" className="adv-link-sm">
              Admin login →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

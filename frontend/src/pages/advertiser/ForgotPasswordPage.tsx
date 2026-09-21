import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Radio, ArrowLeft, Mail } from 'lucide-react';
import { advertiserAuthApi } from '../../api/advertiserAuth';

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState('');
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await advertiserAuthApi.forgotPassword(email);
      setSent(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="adv-auth-page adv-auth-page--centered">
      <div className="adv-auth-form-card">
        <div className="adv-brand-logo adv-brand-logo--sm">
          <Radio size={22} />
          <span>GEOCAST</span>
        </div>

        {sent ? (
          <div className="adv-success-state">
            <div className="adv-success-icon">
              <Mail size={36} />
            </div>
            <h2 className="adv-form-title">Check your email</h2>
            <p className="adv-form-subtitle">
              If an account with <strong>{email}</strong> exists, you will
              receive a password reset link shortly.
            </p>
            <Link to="/advertiser/login" className="adv-btn-primary adv-btn-primary--mt">
              Back to Sign In
            </Link>
          </div>
        ) : (
          <>
            <div className="adv-form-header">
              <h1 className="adv-form-title">Forgot your password?</h1>
              <p className="adv-form-subtitle">
                Enter your email and we'll send you a reset link.
              </p>
            </div>

            {error && <div className="adv-alert adv-alert-error">{error}</div>}

            <form onSubmit={handleSubmit} className="adv-form">
              <div className="adv-form-group">
                <label className="adv-label" htmlFor="fp-email">Email</label>
                <input
                  id="fp-email"
                  type="email"
                  className="adv-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  autoFocus
                />
              </div>

              <button type="submit" className="adv-btn-primary" disabled={loading}>
                {loading ? <span className="spinner" /> : null}
                {loading ? 'Sending…' : 'Send Reset Link'}
              </button>
            </form>

            <Link to="/advertiser/login" className="adv-back-link">
              <ArrowLeft size={14} /> Back to Sign In
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Radio, Eye, EyeOff, CheckCircle, CheckCircle2, Mail, Smartphone, KeyRound } from 'lucide-react';
import { advertiserAuthApi } from '../../api/advertiserAuth';
import { useAdvertiserAuthStore } from '../../store/advertiserAuthStore';
import { useAuthStore } from '../../store/authStore';

// ── Country codes ─────────────────────────────────────────────────────────────
const COUNTRY_CODES = [
  { code: '+91',  label: '🇮🇳 +91  (India)'         },
  { code: '+1',   label: '🇺🇸 +1   (US / Canada)'    },
  { code: '+44',  label: '🇬🇧 +44  (UK)'             },
  { code: '+49',  label: '🇩🇪 +49  (Germany)'        },
  { code: '+33',  label: '🇫🇷 +33  (France)'         },
  { code: '+39',  label: '🇮🇹 +39  (Italy)'          },
  { code: '+34',  label: '🇪🇸 +34  (Spain)'          },
  { code: '+7',   label: '🇷🇺 +7   (Russia)'         },
  { code: '+81',  label: '🇯🇵 +81  (Japan)'          },
  { code: '+86',  label: '🇨🇳 +86  (China)'          },
  { code: '+82',  label: '🇰🇷 +82  (South Korea)'    },
  { code: '+55',  label: '🇧🇷 +55  (Brazil)'         },
  { code: '+52',  label: '🇲🇽 +52  (Mexico)'         },
  { code: '+61',  label: '🇦🇺 +61  (Australia)'      },
  { code: '+971', label: '🇦🇪 +971 (UAE)'            },
  { code: '+966', label: '🇸🇦 +966 (Saudi Arabia)'   },
  { code: '+65',  label: '🇸🇬 +65  (Singapore)'      },
  { code: '+60',  label: '🇲🇾 +60  (Malaysia)'       },
  { code: '+62',  label: '🇮🇩 +62  (Indonesia)'      },
  { code: '+27',  label: '🇿🇦 +27  (South Africa)'   },
  { code: '+234', label: '🇳🇬 +234 (Nigeria)'        },
];

// ── Password strength indicator ───────────────────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'At least 8 characters', ok: password.length >= 8 },
    { label: 'Contains a number',     ok: /\d/.test(password)  },
    { label: 'Contains a letter',     ok: /[a-zA-Z]/.test(password) },
  ];
  if (!password) return null;
  return (
    <ul className="adv-pw-checks">
      {checks.map((c) => (
        <li key={c.label} className={c.ok ? 'adv-pw-ok' : 'adv-pw-fail'}>
          <CheckCircle size={11} />
          {c.label}
        </li>
      ))}
    </ul>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function AdvertiserSignupPage() {
  const navigate = useNavigate();
  const login    = useAdvertiserAuthStore((s) => s.login);

  // Core form
  const [form, setForm] = useState({
    full_name:        '',
    company_name:     '',
    email:            '',
    password:         '',
    confirm_password: '',
  });
  const [countryCode, setCountryCode] = useState('+91');
  const [localPhone,  setLocalPhone]  = useState('');

  // Password show/hide
  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // ── Email OTP state ───────────────────────────────────────────────────────
  // Step 0 = idle, Step 1 = waiting for OTP, Step 2 = verified
  const [otpStep,       setOtpStep]       = useState<0 | 1 | 2>(0);
  const [otpCode,       setOtpCode]       = useState('');
  const [devOtpCode,    setDevOtpCode]    = useState('');   // code returned by backend (dev mode)
  const [sendingCode,   setSendingCode]   = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [otpError,      setOtpError]      = useState('');

  // Validation errors + submission state
  const [errors,   setErrors]   = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [loading,  setLoading]  = useState(false);

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  // Phone: digits only, max 10
  const handlePhoneInput = (v: string) => {
    setLocalPhone(v.replace(/\D/g, '').slice(0, 10));
  };

  // Reset OTP when email changes
  const handleEmailChange = (v: string) => {
    set('email', v);
    if (otpStep !== 0) {
      setOtpStep(0);
      setOtpCode('');
      setDevOtpCode('');
      setOtpError('');
    }
  };

  // ── Send OTP ────────────────────────────────────────────────────────────────
  const handleSendCode = async () => {
    const email = form.email.trim();
    if (!email || !email.includes('@')) {
      setErrors((e) => ({ ...e, email: 'Enter a valid email address first.' }));
      return;
    }
    setErrors((e) => { const n = { ...e }; delete n.email; return n; });
    setOtpError('');
    setOtpCode('');
    setDevOtpCode('');
    setSendingCode(true);
    try {
      const res = await advertiserAuthApi.sendVerificationCode(email);
      setDevOtpCode(res.dev_code ?? '');  // shown in dev-mode banner
      setOtpStep(1);
    } catch (err: any) {
      const msg = err.response?.data?.detail ?? 'Failed to send code. Please try again.';
      setOtpError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setSendingCode(false);
    }
  };

  // ── Verify OTP ──────────────────────────────────────────────────────────────
  const handleVerifyCode = async () => {
    if (otpCode.length !== 6) {
      setOtpError('Please enter the full 6-digit code.');
      return;
    }
    setOtpError('');
    setVerifyingCode(true);
    try {
      const res = await advertiserAuthApi.verifyCode(form.email.trim(), otpCode);
      if (res.verified) {
        setOtpStep(2);   // ← verified ✅
        setDevOtpCode('');
      } else {
        setOtpError(res.message || 'Incorrect code. Please try again.');
      }
    } catch (err: any) {
      const msg = err.response?.data?.detail ?? 'Verification failed. Please try again.';
      setOtpError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    } finally {
      setVerifyingCode(false);
    }
  };

  // ── Client-side validation ───────────────────────────────────────────────────
  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.full_name.trim())    e.full_name    = 'Full name is required.';
    if (!form.company_name.trim()) e.company_name = 'Company name is required.';
    if (!form.email.trim())        e.email        = 'Email is required.';
    if (otpStep !== 2)             e.email        = 'Please verify your email first.';
    if (!localPhone)               e.phone        = 'Phone number is required.';
    if (localPhone.length < 6)     e.phone        = 'Enter a valid phone number (at least 6 digits).';
    if (form.password.length < 8)  e.password     = 'Password must be at least 8 characters.';
    if (form.password !== form.confirm_password)
      e.confirm_password = 'Passwords do not match.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError('');
    if (!validate()) return;
    setLoading(true);
    try {
      await advertiserAuthApi.register({
        ...form,
        phone: `${countryCode}${localPhone}`,
      });
      const data = await advertiserAuthApi.login(form.email, form.password);
      useAuthStore.getState().logout();
      login(data.access_token, data.user);
      navigate('/advertiser/dashboard');
    } catch (err: any) {
      const msg = err.response?.data?.detail ?? 'Unable to create account. Please try again.';
      setApiError(Array.isArray(msg) ? (msg[0]?.msg ?? 'Validation error') : String(msg));
    } finally {
      setLoading(false);
    }
  };

  const emailIsReady = form.email.trim().length > 5 && form.email.includes('@') && form.email.includes('.');

  return (
    <div className="adv-auth-page">
      {/* ── Left brand panel ─────────────────────────────── */}
      <div className="adv-auth-brand">
        <div className="adv-brand-inner">
          <div className="adv-brand-logo">
            <Radio size={32} />
            <span>GEOCAST</span>
          </div>
          <p className="adv-brand-tagline">Location-aware advertising platform</p>
          <div className="adv-brand-badge">Advertiser Portal</div>
          <div className="adv-brand-quote">
            "Reach the right audience at the right place — every time."
          </div>
        </div>
      </div>

      {/* ── Right form panel ─────────────────────────────── */}
      <div className="adv-auth-form-panel">
        <div className="adv-auth-form-card adv-auth-form-card--wide">
          <div className="adv-form-header">
            <h1 className="adv-form-title">Create your advertiser account</h1>
            <p className="adv-form-subtitle">
              Create campaigns and reach audiences across GEOCAST displays.
            </p>
          </div>

          {apiError && <div className="adv-alert adv-alert-error">{apiError}</div>}

          <form onSubmit={handleSubmit} className="adv-form" noValidate>

            {/* ── Row 1: Name + Company ───────────────────── */}
            <div className="adv-form-row">
              <div className="adv-form-group">
                <label className="adv-label" htmlFor="su-fullname">Full Name *</label>
                <input
                  id="su-fullname"
                  type="text"
                  className={`adv-input${errors.full_name ? ' adv-input--error' : ''}`}
                  value={form.full_name}
                  onChange={(e) => set('full_name', e.target.value)}
                  placeholder="John Smith"
                  autoComplete="name"
                  autoFocus
                />
                {errors.full_name && <p className="adv-field-error">{errors.full_name}</p>}
              </div>

              <div className="adv-form-group">
                <label className="adv-label" htmlFor="su-company">Company Name *</label>
                <input
                  id="su-company"
                  type="text"
                  className={`adv-input${errors.company_name ? ' adv-input--error' : ''}`}
                  value={form.company_name}
                  onChange={(e) => set('company_name', e.target.value)}
                  placeholder="ABC Media Pvt Ltd"
                  autoComplete="organization"
                />
                {errors.company_name && <p className="adv-field-error">{errors.company_name}</p>}
              </div>
            </div>

            {/* ── Email + OTP verification ────────────────── */}
            <div className="adv-form-group" style={{ marginTop: '14px' }}>
              <label className="adv-label" htmlFor="su-email">
                <Mail size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                Email Address *
              </label>

              {/* Email row */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <input
                    id="su-email"
                    type="email"
                    className={`adv-input${errors.email ? ' adv-input--error' : ''}`}
                    value={form.email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    placeholder="john@yourcompany.com"
                    autoComplete="email"
                    disabled={otpStep === 2}
                    style={otpStep === 2 ? {
                      borderColor: '#22c55e',
                      background: 'rgba(34,197,94,0.06)',
                    } : {}}
                  />
                  {errors.email && <p className="adv-field-error">{errors.email}</p>}
                </div>

                {/* Send / Resend button */}
                {otpStep !== 2 && (
                  <button
                    type="button"
                    className="adv-btn-primary"
                    onClick={handleSendCode}
                    disabled={sendingCode || !emailIsReady}
                    style={{
                      width: 'auto', minWidth: '110px', fontSize: '12px',
                      padding: '0 14px', height: '40px', flexShrink: 0,
                    }}
                  >
                    {sendingCode ? <span className="spinner" /> : null}
                    {sendingCode ? 'Sending…' : otpStep === 1 ? 'Resend' : 'Send Code'}
                  </button>
                )}

                {/* Verified badge */}
                {otpStep === 2 && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    color: '#22c55e', fontWeight: 700, fontSize: '13px',
                    padding: '10px 4px', flexShrink: 0,
                  }}>
                    <CheckCircle2 size={18} />
                    Verified
                  </div>
                )}
              </div>

              {/* ── Dev-mode OTP banner ──────────────────────── */}
              {otpStep === 1 && devOtpCode && (
                <div style={{
                  marginTop: '10px',
                  padding: '10px 14px',
                  background: 'rgba(234,179,8,0.10)',
                  border: '1px solid rgba(234,179,8,0.35)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                }}>
                  <KeyRound size={16} color="#b45309" style={{ flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: '11.5px', color: '#92400e', fontWeight: 600, margin: 0 }}>
                      Dev Mode — Your verification code is:
                    </p>
                    <p style={{ fontSize: '22px', fontWeight: 800, color: '#78350f', letterSpacing: '0.25em', margin: '2px 0 0' }}>
                      {devOtpCode}
                    </p>
                    <p style={{ fontSize: '10.5px', color: '#a16207', margin: '2px 0 0' }}>
                      (In production this would be emailed. Code valid for 10 minutes.)
                    </p>
                  </div>
                </div>
              )}

              {/* OTP error */}
              {otpError && <p className="adv-field-error" style={{ marginTop: 6 }}>{otpError}</p>}

              {/* ── 6-digit code input + Verify button ─────── */}
              {otpStep === 1 && (
                <div style={{
                  display: 'flex', gap: '8px', alignItems: 'center',
                  marginTop: '10px',
                  padding: '12px 14px',
                  background: 'rgba(37,99,235,0.04)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid rgba(37,99,235,0.18)',
                }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    className="adv-input"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Enter 6-digit code"
                    autoComplete="one-time-code"
                    style={{
                      flex: 1,
                      letterSpacing: '0.3em',
                      fontWeight: 700,
                      textAlign: 'center',
                      fontSize: '18px',
                    }}
                  />
                  <button
                    type="button"
                    className="adv-btn-primary"
                    onClick={handleVerifyCode}
                    disabled={verifyingCode || otpCode.length !== 6}
                    style={{
                      width: 'auto', minWidth: '110px', fontSize: '12px',
                      padding: '0 14px', height: '40px', flexShrink: 0,
                    }}
                  >
                    {verifyingCode ? <span className="spinner" /> : <CheckCircle size={14} />}
                    {verifyingCode ? 'Verifying…' : 'Verify'}
                  </button>
                </div>
              )}
            </div>

            {/* ── Phone + country code ────────────────────── */}
            <div className="adv-form-group" style={{ marginTop: '14px' }}>
              <label className="adv-label" htmlFor="su-phone">
                <Smartphone size={13} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                Phone Number * <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '11px' }}>(max 10 digits)</span>
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  id="su-phone-cc"
                  className="adv-input"
                  value={countryCode}
                  onChange={(e) => { setCountryCode(e.target.value); setLocalPhone(''); }}
                  style={{ width: '185px', flexShrink: 0, cursor: 'pointer' }}
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code + c.label} value={c.code}>{c.label}</option>
                  ))}
                </select>
                <input
                  id="su-phone"
                  type="tel"
                  inputMode="numeric"
                  className={`adv-input${errors.phone ? ' adv-input--error' : ''}`}
                  value={localPhone}
                  onChange={(e) => handlePhoneInput(e.target.value)}
                  placeholder="10-digit number"
                  autoComplete="tel-national"
                  maxLength={10}
                  style={{ flex: 1 }}
                />
              </div>
              {errors.phone && <p className="adv-field-error">{errors.phone}</p>}
              {localPhone && (
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '3px' }}>
                  Full number: <strong>{countryCode}{localPhone}</strong>
                  &nbsp;·&nbsp;{localPhone.length}/10 digits
                </p>
              )}
            </div>

            {/* ── Passwords ───────────────────────────────── */}
            <div className="adv-form-row" style={{ marginTop: '14px' }}>
              <div className="adv-form-group">
                <label className="adv-label" htmlFor="su-password">Password *</label>
                <div className="adv-input-wrap">
                  <input
                    id="su-password"
                    type={showPass ? 'text' : 'password'}
                    className={`adv-input${errors.password ? ' adv-input--error' : ''}`}
                    value={form.password}
                    onChange={(e) => set('password', e.target.value)}
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                  />
                  <button type="button" className="adv-eye-btn"
                    onClick={() => setShowPass(!showPass)} tabIndex={-1}
                    aria-label="Toggle password visibility">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.password && <p className="adv-field-error">{errors.password}</p>}
                <PasswordStrength password={form.password} />
              </div>

              <div className="adv-form-group">
                <label className="adv-label" htmlFor="su-confirm">Confirm Password *</label>
                <div className="adv-input-wrap">
                  <input
                    id="su-confirm"
                    type={showConfirm ? 'text' : 'password'}
                    className={`adv-input${errors.confirm_password ? ' adv-input--error' : ''}`}
                    value={form.confirm_password}
                    onChange={(e) => set('confirm_password', e.target.value)}
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                  />
                  <button type="button" className="adv-eye-btn"
                    onClick={() => setShowConfirm(!showConfirm)} tabIndex={-1}
                    aria-label="Toggle confirm password visibility">
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {errors.confirm_password && (
                  <p className="adv-field-error">{errors.confirm_password}</p>
                )}
              </div>
            </div>

            {/* ── Submit ─────────────────────────────────── */}
            <button
              type="submit"
              className="adv-btn-primary"
              disabled={loading}
              style={{ marginTop: '20px' }}
            >
              {loading ? <span className="spinner" /> : null}
              {loading ? 'Creating account…' : 'Create Account'}
            </button>

            {otpStep !== 2 && (
              <p style={{
                fontSize: '11.5px', color: 'var(--text-muted)',
                marginTop: '8px', textAlign: 'center',
              }}>
                ⚠️ You must verify your email before creating an account.
              </p>
            )}
          </form>

          <p className="adv-form-footer-text">
            Already have an account?{' '}
            <Link to="/advertiser/login" className="adv-link">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

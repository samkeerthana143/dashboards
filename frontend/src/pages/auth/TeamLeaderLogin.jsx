import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Briefcase, ArrowLeft, AlertCircle, CheckCircle2 } from 'lucide-react';
import BrandLogo from '../../components/common/BrandLogo';
import PortalSwitcher from '../../components/common/PortalSwitcher';
import { teamLeaderService } from '../../services/teamLeaderService';
import '../../styles/auth.css';

export default function TeamLeaderLogin() {
  const navigate = useNavigate();

  useEffect(() => {
    const role = localStorage.getItem('arshith_role');
    const user = localStorage.getItem('arshith_user');
    const token = localStorage.getItem('arshith_auth_token');
    if (role === 'team_leader' && user && token) {
      navigate('/teamlead/dashboard', { replace: true });
    }
  }, [navigate]);

  const [formData, setFormData] = useState({
    email: 'teamlead@arshith.com',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [approvalWarning, setApprovalWarning] = useState(null);

  const validate = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = 'Please enter your work email.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }

    if (!formData.password) {
      newErrors.password = 'Please enter your password.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    if (!validate()) return;

    setIsLoading(true);
    setErrors({});
    setApprovalWarning(null);

    try {
      const res = await teamLeaderService.login({
        email: formData.email,
        password: formData.password,
      });

      if (res?.role === 'team_leader' || res?.access_token) {
        navigate('/teamlead/dashboard');
      }
    } catch (err) {
      const detail = err.response?.data?.detail || err.message || 'Invalid credentials.';
      if (err.response?.status === 403 || detail.toLowerCase().includes('pending') || detail.toLowerCase().includes('approval')) {
        setApprovalWarning(detail);
      } else {
        setErrors({ form: detail });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = () => {
    setFormData({
      email: 'teamlead@arshith.com',
      password: 'TeamLead@123',
    });
    setErrors({});
    setApprovalWarning(null);
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-container animate-fade-in">
        {/* Top Brand Logo */}
        <div className="auth-header">
          <BrandLogo size="compact" />
        </div>

        <div style={{ textAlign: 'center', marginBottom: '10px' }}>
          <h1 className="auth-card-title" style={{ fontSize: '1.35rem', marginBottom: '2px', color: '#0b3d2b' }}>
            Team Leader Portal
          </h1>
          <p className="auth-card-desc" style={{ marginBottom: 0 }}>
            Project Execution, Task Delegation & Team Performance
          </p>
        </div>

        {/* Card */}
        <div className="auth-card">
          <PortalSwitcher active="teamlead" />

          {/* Role Indicator Banner */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: '10px',
              backgroundColor: '#ecfdf5',
              border: '1px solid #a7f3d0',
              marginBottom: '18px',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#0b3d2b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                flexShrink: 0,
              }}
            >
              <Briefcase size={17} />
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0b3d2b' }}>
                Team Leader Access
              </div>
              <div style={{ fontSize: '0.74rem', color: '#065f46' }}>
                Approved Leaders Only &bull; Gated by Project HR
              </div>
            </div>
          </div>

          {/* Pending Approval Alert */}
          {approvalWarning && (
            <div
              style={{
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '10px',
                padding: '12px 14px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
              }}
            >
              <AlertCircle size={18} color="#d97706" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#92400e', marginBottom: '2px' }}>
                  Approval Status Notice
                </div>
                <div style={{ fontSize: '0.78rem', color: '#b45309', lineHeight: '1.4' }}>
                  {approvalWarning}
                </div>
              </div>
            </div>
          )}

          {/* General Form Error */}
          {errors.form && (
            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '10px 12px',
                color: '#b91c1c',
                fontSize: '0.825rem',
                marginBottom: '16px',
              }}
            >
              {errors.form}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email Field */}
            <div className="form-group">
              <label className="form-label" htmlFor="tl-email">Leader Email</label>
              <div className="input-wrapper">
                <input
                  id="tl-email"
                  type="email"
                  className={`form-input-auth ${errors.email ? 'form-input-error' : ''}`}
                  placeholder="e.g. teamlead@arshith.com"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (errors.email || errors.form) {
                      setErrors((prev) => ({ ...prev, email: '', form: '' }));
                    }
                  }}
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
              {errors.email && <span className="input-error-msg">{errors.email}</span>}
            </div>

            {/* Password Field */}
            <div className="form-group">
              <label className="form-label" htmlFor="tl-password">Password</label>
              <div className="input-wrapper">
                <input
                  id="tl-password"
                  type={showPassword ? 'text' : 'password'}
                  className={`form-input-auth ${errors.password ? 'form-input-error' : ''}`}
                  placeholder="Enter password"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    if (errors.password || errors.form) {
                      setErrors((prev) => ({ ...prev, password: '', form: '' }));
                    }
                  }}
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="input-icon-right"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <span className="input-error-msg">{errors.password}</span>}
            </div>

            {/* Buttons Stack */}
            <div className="auth-button-stack" style={{ marginTop: '18px' }}>
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#0b3d2b',
                  color: '#ffffff',
                  fontWeight: '700',
                  fontSize: '0.9rem',
                  letterSpacing: '0.04em',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(11, 61, 43, 0.25)',
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>LOGGING IN...</span>
                  </>
                ) : (
                  'TEAM LEADER LOGIN'
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate('/teamlead/register')}
                style={{
                  width: '100%',
                  padding: '11px',
                  borderRadius: '10px',
                  border: '1px solid #0b3d2b',
                  backgroundColor: '#ffffff',
                  color: '#0b3d2b',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                }}
              >
                REGISTER AS TEAM LEADER
              </button>
            </div>

            {/* Demo Quick Fill Helper */}
            <div
              style={{
                marginTop: '16px',
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                Demo Approved TL: <strong>teamlead@arshith.com</strong>
              </div>
              <button
                type="button"
                onClick={handleFillDemo}
                style={{
                  padding: '4px 8px',
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  color: '#0b3d2b',
                  backgroundColor: '#ecfdf5',
                  border: '1px solid #a7f3d0',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Auto Fill
              </button>
            </div>
          </form>
        </div>

        {/* Back Link */}
        <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <Link
            to="/login"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.825rem',
              color: '#64748b',
              textDecoration: 'none',
              fontWeight: '600',
            }}
          >
            <ArrowLeft size={14} />
            Back to Employee Portal
          </Link>
        </div>

        {/* Footer */}
        <footer className="auth-footer" style={{ marginTop: '16px' }}>
          Arshith Connect &bull; Team Leadership Portal
        </footer>
      </div>
    </div>
  );
}


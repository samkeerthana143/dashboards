import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Phone, Lock, Eye, EyeOff, Briefcase, Award, CheckCircle2, Loader2, ArrowLeft, Building2 } from 'lucide-react';
import BrandLogo from '../../components/common/BrandLogo';
import { teamLeaderService } from '../../services/teamLeaderService';
import '../../styles/auth.css';

export default function TeamLeaderRegister() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: '',
    teamLeaderId: '',
    email: '',
    phone: '',
    department: 'Engineering',
    specialization: 'Mobile & Cloud Architecture',
    experienceYears: '4+ Years',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null);

  const validate = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Please enter your full name.';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Please enter your company email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())) {
      newErrors.email = 'Please enter a valid email address.';
    }

    const phoneDigits = formData.phone.replace(/\D/g, '');
    if (!formData.phone.trim() || phoneDigits.length < 10 || phoneDigits.length > 15) {
      newErrors.phone = 'Please enter a valid 10-digit phone number.';
    }

    if (!formData.password) {
      newErrors.password = 'Please enter a secure password.';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must contain at least 6 characters.';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Confirm your password.';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field] || errors.form) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        delete next.form;
        return next;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;
    if (!validate()) return;

    setIsLoading(true);
    setErrors({});
    try {
      const res = await teamLeaderService.register({
        full_name: formData.fullName,
        team_leader_id: formData.teamLeaderId || undefined,
        email: formData.email,
        phone: formData.phone,
        department: formData.department,
        specialization: formData.specialization,
        experience_years: formData.experienceYears,
        password: formData.password,
        confirm_password: formData.confirmPassword,
      });

      setIsLoading(false);
      setSuccessInfo(res);
    } catch (err) {
      setIsLoading(false);
      setErrors({
        form: err.response?.data?.detail || err.message || 'Registration failed. Please check your details.',
      });
    }
  };

  return (
    <div className="auth-page-wrapper">
      <div className="auth-container animate-fade-in" style={{ maxWidth: '480px' }}>
        {/* Brand Header */}
        <div className="auth-header">
          <BrandLogo size="compact" />
        </div>

        <div style={{ textAlign: 'center', marginBottom: '14px' }}>
          <h1 className="auth-card-title" style={{ fontSize: '1.4rem', color: '#0b3d2b', marginBottom: '4px' }}>
            Team Leader Registration
          </h1>
          <p className="auth-card-desc" style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Register leadership profile for Project HR review & approval
          </p>
        </div>

        {/* Card */}
        <div className="auth-card" style={{ padding: '24px 28px' }}>
          {successInfo ? (
            <div style={{ textAlign: 'center', padding: '16px 8px' }}>
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  borderRadius: '50%',
                  backgroundColor: '#ecfdf5',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px auto',
                  border: '2px solid #a7f3d0',
                }}
              >
                <CheckCircle2 size={36} />
              </div>

              <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#065f46', marginBottom: '8px' }}>
                Registration Submitted!
              </h2>

              <p style={{ fontSize: '0.88rem', color: '#334155', lineHeight: '1.5', marginBottom: '16px' }}>
                Your leadership profile for <strong>{formData.fullName}</strong> has been sent to{' '}
                <strong>Project HR</strong> for verification.
              </p>

              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '14px',
                  fontSize: '0.82rem',
                  textAlign: 'left',
                  marginBottom: '20px',
                  color: '#475569',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontWeight: '600' }}>Work Email:</span>
                  <span>{formData.email}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontWeight: '600' }}>Department:</span>
                  <span>{formData.department}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontWeight: '600' }}>Status:</span>
                  <span style={{ color: '#d97706', fontWeight: '800' }}>PENDING HR APPROVAL</span>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => navigate('/teamlead/login')}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '10px',
                    border: 'none',
                    backgroundColor: '#0b3d2b',
                    color: '#ffffff',
                    fontWeight: '700',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                  }}
                >
                  Go to Team Leader Login
                </button>
                <Link
                  to="/login"
                  style={{
                    fontSize: '0.82rem',
                    color: '#64748b',
                    textDecoration: 'none',
                    textAlign: 'center',
                  }}
                >
                  &larr; Back to Employee Portal
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              {errors.form && (
                <div
                  style={{
                    backgroundColor: '#fef2f2',
                    border: '1px solid #fecaca',
                    color: '#b91c1c',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontSize: '0.825rem',
                    marginBottom: '14px',
                  }}
                >
                  {errors.form}
                </div>
              )}

              {/* Full Name */}
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155' }}>
                  Full Name *
                </label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    className={`form-input-auth ${errors.fullName ? 'form-input-error' : ''}`}
                    placeholder="e.g. Arshith or Karthik Nair"
                    value={formData.fullName}
                    onChange={(e) => handleFieldChange('fullName', e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                {errors.fullName && <span className="input-error-msg">{errors.fullName}</span>}
              </div>

              {/* Work Email */}
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155' }}>
                  Company Email *
                </label>
                <div className="input-wrapper">
                  <input
                    type="email"
                    className={`form-input-auth ${errors.email ? 'form-input-error' : ''}`}
                    placeholder="e.g. lead@arshith.com"
                    value={formData.email}
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                {errors.email && <span className="input-error-msg">{errors.email}</span>}
              </div>

              {/* Phone & Team Leader ID */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155' }}>
                    Phone *
                  </label>
                  <input
                    type="tel"
                    className={`form-input-auth ${errors.phone ? 'form-input-error' : ''}`}
                    placeholder="10-digit number"
                    value={formData.phone}
                    onChange={(e) => handleFieldChange('phone', e.target.value)}
                    disabled={isLoading}
                  />
                  {errors.phone && <span className="input-error-msg">{errors.phone}</span>}
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155' }}>
                    TL Code / ID
                  </label>
                  <input
                    type="text"
                    className="form-input-auth"
                    placeholder="e.g. TL-104 (optional)"
                    value={formData.teamLeaderId}
                    onChange={(e) => handleFieldChange('teamLeaderId', e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>

              {/* Department & Experience */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155' }}>
                    Department
                  </label>
                  <select
                    className="form-input-auth"
                    value={formData.department}
                    onChange={(e) => handleFieldChange('department', e.target.value)}
                    disabled={isLoading}
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Operations">Operations</option>
                    <option value="Design">Design</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Finance">Finance</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155' }}>
                    Experience
                  </label>
                  <select
                    className="form-input-auth"
                    value={formData.experienceYears}
                    onChange={(e) => handleFieldChange('experienceYears', e.target.value)}
                    disabled={isLoading}
                  >
                    <option value="2+ Years">2+ Years</option>
                    <option value="3+ Years">3+ Years</option>
                    <option value="5+ Years">5+ Years</option>
                    <option value="8+ Years">8+ Years</option>
                  </select>
                </div>
              </div>

              {/* Specialization */}
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155' }}>
                  Technical Specialization
                </label>
                <input
                  type="text"
                  className="form-input-auth"
                  placeholder="e.g. Mobile Apps, DevOps, Systems Architecture"
                  value={formData.specialization}
                  onChange={(e) => handleFieldChange('specialization', e.target.value)}
                  disabled={isLoading}
                />
              </div>

              {/* Password & Confirm */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155' }}>
                    Password *
                  </label>
                  <div className="input-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className={`form-input-auth ${errors.password ? 'form-input-error' : ''}`}
                      placeholder="Min 6 chars"
                      value={formData.password}
                      onChange={(e) => handleFieldChange('password', e.target.value)}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="input-icon-right"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {errors.password && <span className="input-error-msg">{errors.password}</span>}
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: '700', color: '#334155' }}>
                    Confirm *
                  </label>
                  <div className="input-wrapper">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      className={`form-input-auth ${errors.confirmPassword ? 'form-input-error' : ''}`}
                      placeholder="Repeat password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="input-icon-right"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {errors.confirmPassword && <span className="input-error-msg">{errors.confirmPassword}</span>}
                </div>
              </div>

              {/* Submit Button */}
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
                  boxShadow: '0 4px 12px rgba(11, 61, 43, 0.2)',
                  marginBottom: '12px',
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>SUBMITTING REGISTRATION...</span>
                  </>
                ) : (
                  'REGISTER AS TEAM LEADER'
                )}
              </button>

              <div style={{ textAlign: 'center', fontSize: '0.82rem', color: '#64748b' }}>
                Already registered?{' '}
                <Link to="/teamlead/login" style={{ color: '#0b3d2b', fontWeight: '700', textDecoration: 'none' }}>
                  Login to Portal
                </Link>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <footer className="auth-footer" style={{ marginTop: '16px' }}>
          Arshith Connect &bull; Team Leadership & Operations
        </footer>
      </div>
    </div>
  );
}


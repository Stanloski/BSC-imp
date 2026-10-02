import React, { useState } from 'react';
import { api } from '../api';
import { motion } from 'framer-motion';
import { ShieldCheck, Lock, CheckCircle2, XCircle, ArrowRight, LogOut, AlertOctagon, Eye, EyeOff } from 'lucide-react';

export default function ChangePassword({ user, onSuccess, onLogout }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [shaking, setShaking] = useState(false);

  // Criteria calculations
  const hasMinLen = newPassword.length >= 8;
  const hasNumber = /[0-9]/.test(newPassword);
  const isNotDefault = newPassword.length > 0 && newPassword.toLowerCase() !== 'password123';
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const isValid = hasMinLen && hasNumber && isNotDefault && passwordsMatch;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!hasMinLen) {
      setErrorMessage('Password must be at least 8 characters long.');
      triggerShake();
      return;
    }
    if (!hasNumber) {
      setErrorMessage('Password must include at least one number.');
      triggerShake();
      return;
    }
    if (!isNotDefault) {
      setErrorMessage('New password cannot equal the default password (Password123).');
      triggerShake();
      return;
    }
    if (!passwordsMatch) {
      setErrorMessage('New password and confirm password do not match.');
      triggerShake();
      return;
    }

    setLoading(true);
    try {
      const res = await api.changePassword(newPassword, confirmPassword);
      if (res?.user) {
        onSuccess(res.user);
      } else {
        onSuccess({ ...user, must_change_password: 0 });
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to update password. Please try again.');
      triggerShake();
    } finally {
      setLoading(false);
    }
  };

  const triggerShake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 600);
  };

  return (
    <div 
      className="min-vh-100 d-flex flex-column align-items-center justify-content-center p-3 p-md-4 position-relative"
      style={{ backgroundColor: 'var(--bg-paper)' }}
    >
      <div className="paper-noise-overlay" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-100"
        style={{ maxWidth: '520px', zIndex: 1 }}
      >
        {/* Brand Crest Header */}
        <div className="text-center mb-4">
          <div 
            className="d-inline-flex align-items-center justify-content-center p-2 rounded-2 mb-2"
            style={{
              backgroundColor: 'var(--bg-surface-warm)',
              border: '2px solid var(--ink)',
              boxShadow: '3px 3px 0px rgba(0,0,0,0.6)'
            }}
          >
            <img 
              src="/unn-logo.png" 
              alt="UNN Crest" 
              className="unn-logo-img" 
              style={{ width: '48px', height: '48px', objectFit: 'contain' }} 
            />
          </div>
          <h2 className="font-serif fw-bold mb-1" style={{ color: 'var(--ink)' }}>
            University of Nigeria, Nsukka
          </h2>
          <div className="font-sans fw-semibold small text-uppercase" style={{ color: 'var(--unn-green)', letterSpacing: '0.08em' }}>
            Mandatory Security Protocol
          </div>
          <div className="font-serif fst-italic text-muted small mt-1">
            "To Restore the Dignity of Man"
          </div>
        </div>

        {/* Change Password Card */}
        <div className={`card ${shaking ? 'input-invalid' : ''}`} style={{ backgroundColor: 'var(--bg-surface)' }}>
          <div className="card-body p-4 p-sm-5">
            <div className="d-flex align-items-center gap-3 mb-3 pb-3 border-bottom border-2" style={{ borderColor: 'var(--ink-border)' }}>
              <div 
                className="rounded-circle p-2 d-flex align-items-center justify-content-center"
                style={{ backgroundColor: 'rgba(212, 175, 55, 0.2)', color: 'var(--unn-gold)' }}
              >
                <ShieldCheck size={26} />
              </div>
              <div>
                <h4 className="font-serif fw-bold mb-0" style={{ color: 'var(--ink)' }}>
                  Set a New Password
                </h4>
                <div className="small text-muted">
                  First-time access for <strong>{user?.name || user?.email}</strong>
                </div>
              </div>
            </div>

            <p className="small text-muted mb-4">
              Your account currently uses the default seeded credential. For institutional security, you must establish an individual password before accessing any academic records.
            </p>

            {/* Error Alert */}
            {errorMessage && (
              <div 
                className="alert alert-danger d-flex align-items-center gap-2 py-2 mb-4" 
                role="alert" 
                id="change-password-error"
                style={{
                  backgroundColor: 'var(--vermilion-soft)',
                  borderColor: 'var(--vermilion)',
                  color: 'var(--vermilion-dark)'
                }}
              >
                <AlertOctagon size={18} className="flex-shrink-0" />
                <div className="small fw-semibold">{errorMessage}</div>
              </div>
            )}

            <form onSubmit={handleSubmit} id="change-password-form" autoComplete="off">
              <div className="mb-3">
                <label className="form-label" htmlFor="new-password-input">
                  New Password
                </label>
                <div className="input-group">
                  <span className="input-group-text">
                    <Lock size={16} />
                  </span>
                  <input
                    type={showNewPassword ? "text" : "password"}
                    className="form-control"
                    placeholder="Enter new strong password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    id="new-password-input"
                    autoComplete="new-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary d-flex align-items-center justify-content-center px-3"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    id="toggle-new-password-btn"
                    title={showNewPassword ? "Hide password" : "Show password"}
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                    tabIndex="-1"
                    style={{
                      borderColor: 'var(--ink-border, #0F1B2D)',
                      backgroundColor: 'var(--bg-surface-warm, #FAF6EE)',
                      color: 'var(--ink, #0F1B2D)'
                    }}
                  >
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label" htmlFor="confirm-password-input">
                  Confirm New Password
                </label>
                <div className="input-group">
                  <span className="input-group-text">
                    <Lock size={16} />
                  </span>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className="form-control"
                    placeholder="Re-type new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    id="confirm-password-input"
                    autoComplete="new-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary d-flex align-items-center justify-content-center px-3"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    id="toggle-confirm-password-btn"
                    title={showConfirmPassword ? "Hide password" : "Show password"}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    tabIndex="-1"
                    style={{
                      borderColor: 'var(--ink-border, #0F1B2D)',
                      backgroundColor: 'var(--bg-surface-warm, #FAF6EE)',
                      color: 'var(--ink, #0F1B2D)'
                    }}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Requirement Indicators */}
              <div className="p-3 mb-4 rounded-2 border" style={{ backgroundColor: 'var(--bg-surface-warm)', borderColor: 'var(--ink-border)' }}>
                <div className="font-mono small fw-bold text-uppercase mb-2" style={{ fontSize: '0.72rem', letterSpacing: '0.06em', color: 'var(--ink)' }}>
                  Password Criteria
                </div>
                <div className="d-flex flex-column gap-1 small">
                  <div className={`d-flex align-items-center gap-2 ${hasMinLen ? 'text-success fw-semibold' : 'text-muted'}`}>
                    {hasMinLen ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                    <span>At least 8 characters</span>
                  </div>
                  <div className={`d-flex align-items-center gap-2 ${hasNumber ? 'text-success fw-semibold' : 'text-muted'}`}>
                    {hasNumber ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                    <span>Includes at least one numeric digit (0-9)</span>
                  </div>
                  <div className={`d-flex align-items-center gap-2 ${isNotDefault ? 'text-success fw-semibold' : 'text-muted'}`}>
                    {isNotDefault ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                    <span>Cannot be "Password123"</span>
                  </div>
                  <div className={`d-flex align-items-center gap-2 ${passwordsMatch ? 'text-success fw-semibold' : 'text-muted'}`}>
                    {passwordsMatch ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
                    <span>Passwords match</span>
                  </div>
                </div>
              </div>

              <div className="d-flex flex-column gap-2">
                <button
                  type="submit"
                  className="btn btn-primary w-100 py-2 d-flex align-items-center justify-content-center gap-2"
                  disabled={loading}
                  id="submit-new-password-btn"
                  style={{
                    backgroundColor: 'var(--unn-green)',
                    height: '46px'
                  }}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                      <span>Saving Secure Password...</span>
                    </>
                  ) : (
                    <>
                      <span>Save Password & Open Dashboard</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={onLogout}
                  className="btn btn-outline-secondary w-100 py-2 d-flex align-items-center justify-content-center gap-2"
                  id="cancel-logout-btn"
                >
                  <LogOut size={16} />
                  <span>Cancel and Sign Out</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Institutional Footer */}
        <div className="text-center mt-3 text-muted small">
          © 2026 University of Nigeria, Nsukka • Academic Security Service
        </div>
      </motion.div>
    </div>
  );
}

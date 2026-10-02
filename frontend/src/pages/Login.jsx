import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GraduationCap, 
  Lock, 
  Mail, 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  KeyRound, 
  AlertOctagon,
  Award,
  Eye,
  EyeOff,
  Sun,
  Moon
} from 'lucide-react';

const TAGLINES = [
  { word: "Register", desc: "Enrol in semester academic courses", color: "var(--gold)" },
  { word: "Score", desc: "Faculty CA & examination grading", color: "#68D391" },
  { word: "Compute", desc: "Algorithmic GPA & CGPA calculation", color: "var(--gold)" },
  { word: "Approve", desc: "Executive HOD scrutiny & endorsement", color: "#4FD1C5" },
  { word: "Publish", desc: "Official verified result slip generation", color: "var(--gold)" }
];

export default function Login({ onLoginSuccess, initialMessage = '' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(initialMessage);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);
  const [taglineIdx, setTaglineIdx] = useState(0);
  const [shaking, setShaking] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('srps-theme') === 'dark');

  const showDemo = Boolean(import.meta.env.DEV && import.meta.env.VITE_SHOW_DEMO === 'true');

  const toggleDarkMode = () => {
    setDarkMode(prev => {
      const next = !prev;
      if (next) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('srps-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('srps-theme', 'light');
      }
      return next;
    });
  };

  // Rotate tagline every 2.8 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setTaglineIdx((prev) => (prev + 1) % TAGLINES.length);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setErrorMessage('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  const formatCountdown = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${String(s).padStart(2, '0')}s`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (lockoutSeconds > 0) return;
    setErrorMessage('');
    setLoading(true);

    try {
      const res = await api.login(email, password);
      onLoginSuccess(res.user);
    } catch (err) {
      if (err.status === 429) {
        const retry = err.data?.retry_after || 900;
        setLockoutSeconds(retry);
        setErrorMessage('Too many attempts. Try again later.');
      } else {
        setErrorMessage(err.message || 'Invalid email or password.');
      }
      setShaking(true);
      setTimeout(() => setShaking(false), 600);
    } finally {
      setLoading(false);
    }
  };

  const fillCredentials = (userEmail, userPass) => {
    setEmail(userEmail);
    setPassword(userPass);
    setErrorMessage('');
  };

  const currentTag = TAGLINES[taglineIdx];

  return (
    <div className="min-vh-100 d-flex flex-column flex-lg-row" style={{ backgroundColor: 'var(--bg)' }}>
      {/* ---------------- LEFT SPLIT: ANIMATED ACADEMIC SCENE ---------------- */}
      <div 
        className="col-12 col-lg-6 d-flex flex-column justify-content-between p-4 p-md-5 text-white position-relative overflow-hidden"
        style={{ 
          background: 'linear-gradient(145deg, #0E3B22, #0A2416)',
          borderRight: '1px solid var(--border)',
          minHeight: '420px'
        }}
      >
        {/* Subtle dot grid pattern */}
        <div 
          className="position-absolute w-100 h-100 top-0 start-0"
          style={{
            backgroundImage: 'radial-gradient(rgba(201, 154, 46, 0.15) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            pointerEvents: 'none'
          }}
        />

        {/* Floating Geometric Elements, Drifting Letters & Centered UNN Logo with Rotating Ring */}
        <div className="position-absolute w-100 h-100 top-0 start-0 overflow-hidden" style={{ pointerEvents: 'none' }}>
          {/* Centered slow rotating orbital ring around central emblem */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '320px',
              height: '320px',
              border: '1px dashed rgba(201, 154, 46, 0.45)',
              borderRadius: '50%',
              transform: 'translate(-50%, -50%)',
              animation: 'spinSlow 36s linear infinite'
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '260px',
              height: '260px',
              border: '1px solid rgba(63, 168, 102, 0.35)',
              borderRadius: '50%',
              transform: 'translate(-50%, -50%)',
              animation: 'spinSlow 24s linear infinite reverse'
            }}
          />

          {/* Drifting Grade Chips */}
          <div
            style={{
              position: 'absolute',
              top: '16%',
              left: '10%',
              animation: 'floatSlow 6s ease-in-out infinite'
            }}
          >
            <div className="grade-chip grade-chip-A">A</div>
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: '22%',
              right: '12%',
              animation: 'floatSlow 7s ease-in-out infinite 1.5s'
            }}
          >
            <div className="grade-chip grade-chip-B">B</div>
          </div>

          <div
            style={{
              position: 'absolute',
              top: '46%',
              left: '6%',
              animation: 'floatSlow 8s ease-in-out infinite 0.7s'
            }}
          >
            <div className="grade-chip grade-chip-C">C</div>
          </div>

          <div
            style={{
              position: 'absolute',
              bottom: '12%',
              left: '18%',
              padding: '4px 12px',
              border: '1px solid rgba(201, 154, 46, 0.4)',
              borderRadius: '999px',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              color: 'var(--gold)',
              backgroundColor: 'rgba(201, 154, 46, 0.1)',
              animation: 'floatSlow 9s ease-in-out infinite 2s'
            }}
          >
            GPA 4.20 / 5.00
          </div>
        </div>

        {/* Top Branding: UNN Logo, Institution & Motto */}
        <div className="position-relative z-1">
          <div className="d-flex align-items-center gap-3 mb-2">
            <div 
              className="d-flex align-items-center justify-content-center p-1 rounded-2"
              style={{
                width: '52px',
                height: '52px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(201, 154, 46, 0.4)',
                borderRadius: '10px',
                flexShrink: 0
              }}
            >
              <img 
                src="/unn-logo.png" 
                alt="UNN Crest" 
                className="unn-logo-img" 
                style={{ width: '42px', height: '42px', objectFit: 'contain' }} 
              />
            </div>
            <div>
              <h1 className="font-serif fw-bold fs-4 text-white mb-0" style={{ letterSpacing: '-0.01em', lineHeight: 1.15 }}>
                University of Nigeria, Nsukka
              </h1>
              <div className="font-sans fw-semibold" style={{ fontSize: '0.88rem', color: 'var(--gold)' }}>
                Student Result Processing System
              </div>
              <div className="font-serif fst-italic text-white-50" style={{ fontSize: '0.78rem' }}>
                "To Restore the Dignity of Man"
              </div>
            </div>
          </div>
        </div>

        {/* Center Animated Scene: Centered UNN Logo with rotating ring & rotating tagline words */}
        <div className="position-relative z-1 my-4 text-center d-flex flex-column align-items-center justify-content-center">
          {/* Centered UNN Emblem in the orbit with subtle glow */}
          <div className="position-relative d-inline-flex align-items-center justify-content-center mb-3">
            <motion.div 
              animate={{ scale: [1, 1.04, 1] }} 
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="p-3 rounded-circle"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(201, 154, 46, 0.45)',
                boxShadow: '0 0 35px rgba(201, 154, 46, 0.3), 0 0 15px rgba(27, 107, 58, 0.5)'
              }}
            >
              <img 
                src="/unn-logo.png" 
                alt="UNN Logo Emblem" 
                className="unn-logo-img"
                style={{ width: '84px', height: '84px', objectFit: 'contain', filter: 'drop-shadow(0 0 12px rgba(201, 154, 46, 0.5))' }}
              />
            </motion.div>
          </div>

          <div className="small font-mono text-uppercase fw-bold mb-1" style={{ color: 'var(--gold)', letterSpacing: '0.14em' }}>
            Academic Result Lifecycle
          </div>

          {/* Rotating Tagline Words */}
          <div style={{ height: '62px', overflow: 'hidden' }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTag.word}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              >
                <div 
                  className="font-serif fw-bold display-5"
                  style={{ color: currentTag.color, letterSpacing: '-0.02em' }}
                >
                  {currentTag.word}.
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          <p className="lead font-sans text-white-50 mx-auto mb-0" style={{ maxWidth: '420px', fontSize: '0.96rem' }}>
            {currentTag.desc}. A verified end-to-end sequential workflow governing course enrolment to published transcripts.
          </p>
        </div>

        {/* Footer line */}
        <div className="position-relative z-1 d-flex flex-wrap align-items-center justify-content-between gap-3 pt-3 border-top" style={{ borderColor: 'rgba(255, 255, 255, 0.12)' }}>
          <div className="font-sans small text-white-50">
            Department of Computer Science, Faculty of Physical Sciences
          </div>
          <div className="d-flex align-items-center gap-1 font-mono small" style={{ color: 'var(--gold)' }}>
            <ShieldCheck size={14} />
            <span>UNN Academic Portal</span>
          </div>
        </div>
      </div>

      {/* ---------------- RIGHT SPLIT: SIGN IN FORM ---------------- */}
      <div 
        className="col-12 col-lg-6 d-flex flex-column align-items-center justify-content-center p-4 p-md-5 position-relative"
        style={{ backgroundColor: 'var(--bg)' }}
      >
        {/* Top-right Light / Dark mode toggle */}
        <div className="position-absolute top-0 end-0 p-3 p-md-4">
          <button
            type="button"
            onClick={toggleDarkMode}
            className="btn btn-secondary btn-sm d-flex align-items-center gap-2"
            id="login-theme-toggle-btn"
            title={darkMode ? "Switch to Light mode" : "Switch to Dark mode"}
          >
            {darkMode ? (
              <>
                <Sun size={15} style={{ color: 'var(--gold)' }} />
                <span>Light mode</span>
              </>
            ) : (
              <>
                <Moon size={15} style={{ color: 'var(--muted)' }} />
                <span>Dark mode</span>
              </>
            )}
          </button>
        </div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="w-100" 
          style={{ maxWidth: '460px' }}
        >
          {/* Sign In Card */}
          <div 
            className={`card mb-4 ${shaking ? 'input-invalid' : ''}`}
            style={{ 
              backgroundColor: 'var(--surface)',
              borderRadius: '12px',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-lg)'
            }}
          >
            <div className="card-body p-4 p-sm-5">
              <div className="text-center mb-4">
                <span className="editorial-stamp mb-2">Secure Gate</span>
                <h2 className="font-serif fw-bold mb-1" style={{ color: 'var(--ink)' }}>Account Sign In</h2>
                <p className="text-muted small">Enter your institutional credentials to proceed</p>
              </div>

              {/* Error / Lockout Alert: danger-soft bg, 4px solid danger left border */}
              {errorMessage && (
                <div 
                  className="alert d-flex flex-column gap-1 py-2 mb-4" 
                  role="alert" 
                  id="login-error-alert"
                  style={{
                    backgroundColor: lockoutSeconds > 0 ? 'var(--gold-soft)' : 'var(--danger-soft)',
                    border: '1px solid var(--border)',
                    borderLeft: `4px solid ${lockoutSeconds > 0 ? 'var(--gold)' : 'var(--danger)'}`,
                    color: lockoutSeconds > 0 ? 'var(--gold)' : 'var(--danger)',
                    borderRadius: '8px'
                  }}
                >
                  <div className="d-flex align-items-center gap-2">
                    <AlertOctagon size={18} className="flex-shrink-0" />
                    <div className="small fw-semibold">{errorMessage}</div>
                  </div>
                  {lockoutSeconds > 0 && (
                    <div className="small font-mono fw-bold mt-1 text-center py-1 px-2 rounded" id="lockout-countdown-display" style={{ backgroundColor: 'rgba(0,0,0,0.06)' }}>
                      ⏳ Security Lockout Active. Unlocking in: <span className="badge bg-dark text-white px-2 py-1 ms-1">{formatCountdown(lockoutSeconds)}</span>
                    </div>
                  )}
                </div>
              )}

              <form onSubmit={handleSubmit} id="login-form" autoComplete="off">
                <div className="mb-3">
                  <label className="form-label" htmlFor="login-email-input">
                    Academic Email Address
                  </label>
                  <div className="input-group">
                    <span className="input-group-text">
                      <Mail size={16} />
                    </span>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="e.g. chukwuma.okonkwo@unn.edu.ng"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      id="login-email-input"
                      autoComplete="off"
                      disabled={loading || lockoutSeconds > 0}
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label className="form-label mb-0" htmlFor="login-password-input">
                      Secret Password
                    </label>
                  </div>
                  <div className="input-group">
                    <span className="input-group-text">
                      <Lock size={16} />
                    </span>
                    <input
                      type={showPassword ? "text" : "password"}
                      className="form-control"
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      id="login-password-input"
                      autoComplete="new-password"
                      disabled={loading || lockoutSeconds > 0}
                    />
                    <button
                      type="button"
                      className="btn d-flex align-items-center justify-content-center px-3"
                      onClick={() => setShowPassword(!showPassword)}
                      id="toggle-password-visibility-btn"
                      title={showPassword ? "Hide password" : "Show password"}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      tabIndex="-1"
                      style={{
                        border: '1px solid var(--border)',
                        borderLeft: 'none',
                        backgroundColor: 'var(--surface-2)',
                        color: 'var(--muted)',
                        borderRadius: '0 10px 10px 0',
                        boxShadow: 'none'
                      }}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100 py-2"
                  disabled={loading || lockoutSeconds > 0}
                  id="login-submit-btn"
                  style={{
                    height: '46px',
                    borderRadius: '10px'
                  }}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      <span>Authenticating...</span>
                    </>
                  ) : lockoutSeconds > 0 ? (
                    <>
                      <span>Temporarily Locked Out</span>
                    </>
                  ) : (
                    <>
                      <span>Enter Academic Gate</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Development-Only Demo Credentials Card (Hidden by default; enable via VITE_SHOW_DEMO=true in development only) */}
          {showDemo && (
            <div className="card" id="demo-accounts-card">
              <div className="card-body p-3">
                <div className="d-flex align-items-center justify-content-center gap-1 mb-2 text-center">
                  <KeyRound size={15} style={{ color: 'var(--gold)' }} />
                  <span className="font-mono fw-bold text-uppercase small" style={{ fontSize: '0.72rem', letterSpacing: '0.08em', color: 'var(--ink)' }}>
                    UNN Demo Accounts (Defence Mode Only)
                  </span>
                </div>

                <div className="d-flex flex-wrap gap-1 justify-content-center">
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => fillCredentials('admin@unn.edu.ng', 'Password123')}
                    id="demo-admin-btn"
                    title="System Administrator (Engr. Nnamdi A. Eze)"
                  >
                    Admin
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-warning btn-sm"
                    onClick={() => fillCredentials('obinna.okeke@unn.edu.ng', 'Password123')}
                    id="demo-examofficer-btn"
                    title="Examination Officer (Mr. Obinna E. Okeke)"
                  >
                    Exam Officer
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => fillCredentials('charles.ugwu@unn.edu.ng', 'Password123')}
                    id="demo-hod-btn"
                    title="Head of Department (Prof. Charles O. Ugwu)"
                  >
                    HOD
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-success btn-sm"
                    onClick={() => fillCredentials('chidinma.ani@unn.edu.ng', 'Password123')}
                    id="demo-lecturer1-btn"
                    title="Lecturer 1 (Dr. Chidinma O. Ani)"
                  >
                    Lecturer 1
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-success btn-sm"
                    onClick={() => fillCredentials('kingsley.nnaji@unn.edu.ng', 'Password123')}
                    id="demo-lecturer2-btn"
                    title="Lecturer 2 (Dr. Kingsley C. Nnaji)"
                  >
                    Lecturer 2
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => fillCredentials('chukwuma.okonkwo@unn.edu.ng', 'Password123')}
                    id="demo-student1-btn"
                    title="Student 1 (Chukwuma Okonkwo)"
                  >
                    Student 1
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-primary btn-sm"
                    onClick={() => fillCredentials('ngozi.eze@unn.edu.ng', 'Password123')}
                    id="demo-student2-btn"
                    title="Student 2 (Ngozi Eze)"
                  >
                    Student 2
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* CSS Keyframe animations for scene */}
      <style>{`
        @keyframes spinSlow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes floatSlow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-12px) rotate(2deg); }
        }
      `}</style>
    </div>
  );
}

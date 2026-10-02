import React, { useState, useEffect, useCallback } from 'react';
import { api } from './api';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import Student from './pages/Student';
import Lecturer from './pages/Lecturer';
import ExamOfficer from './pages/ExamOfficer';
import Hod from './pages/Hod';
import Admin from './pages/Admin';
import { motion, AnimatePresence } from 'framer-motion';

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginKey, setLoginKey] = useState(() => Date.now());
  const [loginMessage, setLoginMessage] = useState('');

  // Initialize theme from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('srps-theme');
    if (savedTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  // Update data-role attribute on documentElement
  useEffect(() => {
    if (user?.role) {
      document.documentElement.setAttribute('data-role', user.role);
    } else {
      document.documentElement.removeAttribute('data-role');
    }
  }, [user]);

  // Check existing session on application load via auth/me.php
  const checkAuth = useCallback(async () => {
    try {
      const res = await api.me();
      if (res?.user) {
        setUser(res.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Logout handler: purge storage, expire server session, reset key and replace history
  const handleLogout = async (customMessage = '') => {
    try {
      await api.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      // Clear any stored user/role data, strictly preserving only the dark mode preference
      const savedTheme = localStorage.getItem('srps-theme');
      localStorage.clear();
      sessionStorage.clear();
      if (savedTheme) {
        localStorage.setItem('srps-theme', savedTheme);
      }

      setUser(null);
      setLoginMessage(typeof customMessage === 'string' ? customMessage : '');
      setLoginKey(Date.now());

      // Push history state to /login so Back navigation triggers popstate check
      try {
        window.history.pushState({ page: 'login' }, '', '/login');
      } catch (e) {}
    }
  };

  const handleLoginSuccess = (loggedUser) => {
    setLoginMessage('');
    setUser(loggedUser);
    try {
      window.history.pushState({ page: 'dashboard' }, '', '/dashboard');
    } catch (e) {}
  };

  // Listen for broadcast session expiration
  useEffect(() => {
    const handleExpired = (e) => {
      handleLogout(e.detail || 'Session expired, please log in again.');
    };
    window.addEventListener('srps:session_expired', handleExpired);
    return () => window.removeEventListener('srps:session_expired', handleExpired);
  }, []);

  // Browser navigation safety: Verify session on Back/Forward navigation
  useEffect(() => {
    const verifyOnNavigation = async () => {
      try {
        const res = await api.me();
        if (res?.user) {
          setUser(res.user);
        } else {
          setUser(null);
          setLoginKey(Date.now());
        }
      } catch (e) {
        setUser(null);
        setLoginKey(Date.now());
      }
    };
    window.addEventListener('pageshow', verifyOnNavigation);
    window.addEventListener('popstate', verifyOnNavigation);
    return () => {
      window.removeEventListener('pageshow', verifyOnNavigation);
      window.removeEventListener('popstate', verifyOnNavigation);
    };
  }, []);

  if (loading) {
    return (
      <div 
        className="min-vh-100 d-flex flex-column align-items-center justify-content-center p-4 position-relative"
        style={{ backgroundColor: 'var(--bg-paper)' }}
      >
        <div className="paper-noise-overlay" />
        <div 
          className="d-flex align-items-center justify-content-center rounded p-2 mb-3"
          style={{ 
            backgroundColor: 'var(--surface)', 
            border: '1px solid var(--border)',
            borderRadius: '12px',
            boxShadow: 'var(--shadow-md)',
            width: '72px',
            height: '72px'
          }}
        >
          <img 
            src="/unn-logo.png" 
            alt="UNN Crest" 
            className="unn-logo-img" 
            style={{ width: '56px', height: '56px', objectFit: 'contain' }} 
          />
        </div>
        <h4 className="font-serif fw-bold mb-1" style={{ color: 'var(--ink)' }}>
          UNN Student Result Processing System
        </h4>
        <div className="font-serif fst-italic small text-success mb-2">
          "To Restore the Dignity of Man"
        </div>
        <div className="small font-mono text-muted text-uppercase" style={{ letterSpacing: '0.1em' }}>
          Verifying Institutional Session...
        </div>
      </div>
    );
  }

  // 1. Unauthenticated: Render Login page with changing key and message
  if (!user) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={`auth-login-${loginKey}`}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
        >
          <Login 
            key={loginKey} 
            initialMessage={loginMessage}
            onLoginSuccess={handleLoginSuccess} 
          />
        </motion.div>
      </AnimatePresence>
    );
  }

  // 2. Authenticated but must change password: Force password change screen
  if (Number(user.must_change_password) === 1) {
    return (
      <AnimatePresence mode="wait">
        <motion.div
          key="must-change-password-screen"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        >
          <ChangePassword 
            user={user} 
            onSuccess={(updatedUser) => setUser(updatedUser)} 
            onLogout={handleLogout} 
          />
        </motion.div>
      </AnimatePresence>
    );
  }

  // 3. Authenticated and password changed: Access role dashboard
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={`dashboard-${user.role}`}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -15 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      >
        {(() => {
          switch (user.role) {
            case 'student':
              return <Student user={user} onLogout={handleLogout} />;
            case 'lecturer':
              return <Lecturer user={user} onLogout={handleLogout} />;
            case 'exam_officer':
              return <ExamOfficer user={user} onLogout={handleLogout} />;
            case 'hod':
              return <Hod user={user} onLogout={handleLogout} />;
            case 'admin':
              return <Admin user={user} onLogout={handleLogout} />;
            default:
              return (
                <div className="container py-5 text-center">
                  <div className="card p-4 mx-auto" style={{ maxWidth: '500px' }}>
                    <h4 className="font-serif fw-bold text-danger">Unrecognized Role</h4>
                    <p>Your user account has an unrecognized role: <code>{user.role}</code></p>
                    <button onClick={handleLogout} className="btn btn-secondary" id="logout-btn">
                      Sign Out
                    </button>
                  </div>
                </div>
              );
          }
        })()}
      </motion.div>
    </AnimatePresence>
  );
}

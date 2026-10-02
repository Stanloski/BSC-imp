import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  FileText, 
  BookOpen, 
  CheckSquare, 
  Table, 
  ClipboardCheck, 
  ShieldCheck, 
  Users, 
  Sliders, 
  LogOut, 
  Sun, 
  Moon, 
  Menu, 
  X,
  Award,
  Layers
} from 'lucide-react';

export default function Sidebar({ user, onLogout, activeTab, onTabChange, sessionInfo, navItems = [] }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('srps-theme') === 'dark';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('srps-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('srps-theme', 'light');
    }
  }, [darkMode]);

  useEffect(() => {
    if (user?.role) {
      document.documentElement.setAttribute('data-role', user.role);
    }
  }, [user]);

  const toggleDarkMode = () => {
    setDarkMode(prev => !prev);
  };

  const roleLabelMap = {
    student: { label: 'Student Scholar', color: 'var(--primary)', bg: 'var(--primary-soft)' },
    lecturer: { label: 'Academic Faculty', color: 'var(--primary)', bg: 'var(--primary-soft)' },
    exam_officer: { label: 'Examination Officer', color: 'var(--gold)', bg: 'var(--gold-soft)' },
    hod: { label: 'Head of Department', color: 'var(--primary)', bg: 'var(--primary-soft)' },
    admin: { label: 'System Administrator', color: 'var(--primary)', bg: 'var(--primary-soft)' }
  };

  const currentRole = roleLabelMap[user?.role] || { label: user?.role, color: 'var(--muted)', bg: 'var(--surface-2)' };
  const initials = `${user?.first_name?.[0] || user?.name?.[0] || 'U'}${user?.surname?.[0] || ''}`.toUpperCase();

  return (
    <>
      {/* Mobile Top Header with Hamburger */}
      <div 
        className="d-lg-none d-flex align-items-center justify-content-between p-3 border-bottom w-100" 
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <div className="d-flex align-items-center gap-2">
          <img 
            src="/unn-logo.png" 
            alt="UNN Crest" 
            className="unn-logo-img" 
            style={{ width: '32px', height: '32px', objectFit: 'contain' }} 
          />
          <span className="font-serif fw-bold fs-5" style={{ color: 'var(--ink)' }}>UNN SRPS</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="btn btn-outline-secondary btn-sm p-2"
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Backdrop for mobile */}
      {mobileOpen && (
        <div 
          className="sidebar-backdrop d-lg-none" 
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Main Sidebar */}
      <aside className={`app-sidebar ${mobileOpen ? 'open' : ''}`}>
        {/* UNN Crest / Header */}
        <div className="p-3 border-bottom" style={{ borderColor: 'var(--border)' }}>
          <div className="d-flex align-items-center gap-2">
            <div 
              className="d-flex align-items-center justify-content-center p-1 rounded-2"
              style={{ 
                width: '44px', 
                height: '44px', 
                backgroundColor: 'var(--surface-2)', 
                border: '1px solid var(--border)',
                flexShrink: 0
              }}
            >
              <img 
                src="/unn-logo.png" 
                alt="UNN Crest" 
                className="unn-logo-img" 
                style={{ width: '36px', height: '36px', objectFit: 'contain' }} 
              />
            </div>
            <div>
              <div className="font-serif fw-bold fs-5" style={{ color: 'var(--ink)', lineHeight: 1.1 }}>
                UNN SRPS
              </div>
              <div className="small font-mono fw-bold text-uppercase" style={{ fontSize: '0.64rem', letterSpacing: '0.06em', color: 'var(--primary)' }}>
                University of Nigeria
              </div>
            </div>
          </div>
        </div>

        {/* User Monogram Profile Card */}
        <div className="p-3 border-bottom" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-2)' }}>
          <div className="d-flex align-items-center gap-3">
            <div 
              className="rounded-circle d-flex align-items-center justify-content-center fw-bold font-serif"
              style={{ 
                width: '42px', 
                height: '42px', 
                backgroundColor: 'var(--surface)', 
                color: 'var(--primary)',
                border: '1px solid var(--border)',
                fontSize: '1.1rem'
              }}
            >
              {initials}
            </div>
            <div className="min-w-0 flex-grow-1">
              <div className="fw-bold text-truncate" style={{ fontSize: '0.92rem', color: 'var(--ink)' }}>
                {user?.name || `${user?.first_name} ${user?.surname}`}
              </div>
              <div className="d-flex flex-wrap gap-1 align-items-center mt-1">
                <span 
                  className="badge" 
                  style={{ 
                    backgroundColor: currentRole.bg, 
                    color: currentRole.color,
                    fontSize: '0.68rem',
                    padding: '2px 8px'
                  }}
                >
                  {currentRole.label}
                </span>
                {user?.matric_no && (
                  <span 
                    className="badge font-mono" 
                    style={{ 
                      backgroundColor: 'var(--surface)', 
                      color: 'var(--muted)',
                      border: '1px solid var(--border)',
                      fontSize: '0.68rem',
                      padding: '2px 8px'
                    }}
                  >
                    {user.matric_no}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="p-3 flex-grow-1 overflow-auto">
          <div className="small fw-bold text-uppercase mb-2 font-mono" style={{ fontSize: '0.68rem', letterSpacing: '0.1em', color: 'var(--muted)' }}>
            Academic Navigation
          </div>

          <nav className="d-flex flex-column">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon || Layers;
              return (
                <button
                  key={item.id}
                  id={item.domId}
                  onClick={() => {
                    if (onTabChange) onTabChange(item.id);
                    setMobileOpen(false);
                  }}
                  className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
                >
                  <Icon size={18} style={{ color: isActive ? 'var(--primary)' : 'var(--muted)' }} />
                  <span className="flex-grow-1 text-truncate">{item.label}</span>
                  {item.badge !== undefined && item.badge !== null && (
                    <span 
                      className="badge" 
                      style={{ 
                        backgroundColor: isActive ? 'var(--primary)' : 'var(--surface-2)',
                        color: isActive ? '#FFFFFF' : 'var(--muted)'
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Academic Session Stamp Info */}
        {sessionInfo && (
          <div className="p-3 border-top" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface-2)' }}>
            <div className="editorial-stamp w-100 justify-content-center text-center">
              <span>{sessionInfo.session || '2024/2025'}</span>
              <span>•</span>
              <span>{sessionInfo.semester || 'First'} Sem</span>
            </div>
          </div>
        )}

        {/* UNN Motto & Institutional Footer */}
        <div className="px-3 pt-3 text-center border-top" style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}>
          <div className="font-serif fst-italic fw-bold" style={{ fontSize: '0.74rem', color: 'var(--primary)' }}>
            "To Restore the Dignity of Man"
          </div>
          <div className="font-mono mt-1" style={{ fontSize: '0.62rem', letterSpacing: '0.04em', color: 'var(--muted)' }}>
            © 2026 University of Nigeria, Nsukka
          </div>
        </div>

        {/* Bottom Actions: Theme Toggle & Logout */}
        <div className="p-3 border-top d-flex align-items-center justify-content-between gap-2" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={toggleDarkMode}
            className="btn btn-secondary btn-sm p-2 flex-grow-1"
            title={darkMode ? "Switch to Light mode" : "Switch to Dark mode"}
            id="theme-toggle-btn"
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

          <button
            onClick={onLogout}
            className="btn btn-danger btn-sm p-2"
            id="logout-btn"
            title="Log out from session"
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

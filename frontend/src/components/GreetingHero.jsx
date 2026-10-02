import React from 'react';
import { Calendar, Award, Sparkles } from 'lucide-react';

export default function GreetingHero({ user, sessionInfo, subtitle, actionElement }) {
  // Format today's date in formal academic style (e.g., Friday, 2 October 2026)
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const displayName = user?.name || `${user?.first_name || ''} ${user?.surname || ''}`.trim() || 'Colleague';

  return (
    <div className="greeting-hero">
      <div className="d-flex flex-column gap-1">
        <div className="d-flex align-items-center gap-2">
          <span className="small font-mono fw-bold text-uppercase d-flex align-items-center gap-1" style={{ color: 'var(--primary)', letterSpacing: '0.06em' }}>
            <Sparkles size={14} />
            UNN Student Result Processing System
          </span>
          <span style={{ color: 'var(--border)' }}>•</span>
          <span className="small text-muted d-flex align-items-center gap-1 font-mono">
            <Calendar size={13} />
            {today}
          </span>
        </div>

        <h1 className="h3 font-serif fw-bold mb-0" style={{ color: 'var(--ink)' }}>
          Welcome, <span className="user-welcome-name" style={{ color: 'var(--primary)' }}>{displayName}</span>
        </h1>

        <div className="text-muted small" style={{ maxWidth: '650px' }}>
          {subtitle || 'Department of Computer Science, Faculty of Physical Sciences • University of Nigeria, Nsukka'}
        </div>
      </div>

      <div className="d-flex align-items-center gap-3">
        {sessionInfo && (
          <div className="editorial-stamp" title="Active Academic Session & Semester Gate">
            <Award size={15} style={{ color: 'var(--gold)' }} />
            <span>{sessionInfo.session || '2025/2026'}</span>
            <span>•</span>
            <span>{sessionInfo.semester || 'First'} Semester</span>
          </div>
        )}

        {actionElement}
      </div>
    </div>
  );
}

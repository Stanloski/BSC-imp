import React, { useState, useEffect } from 'react';

export function AnimatedNumber({ value, duration = 800, decimals = 0, prefix = '', suffix = '', domId }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    // If value is not a valid number (e.g. '-' or null), just show it
    const num = parseFloat(value);
    if (isNaN(num)) {
      setDisplayValue(value);
      return;
    }

    // Check prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setDisplayValue(decimals > 0 ? num.toFixed(decimals) : Math.round(num));
      return;
    }

    let startTimestamp = null;
    const startValue = 0;

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // easeOutExpo
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      const current = startValue + (num - startValue) * ease;

      if (decimals > 0) {
        setDisplayValue(current.toFixed(decimals));
      } else {
        setDisplayValue(Math.round(current));
      }

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setDisplayValue(decimals > 0 ? num.toFixed(decimals) : Math.round(num));
      }
    };

    window.requestAnimationFrame(step);
  }, [value, duration, decimals]);

  return (
    <span id={domId}>
      {prefix}
      {displayValue}
      {suffix}
    </span>
  );
}

export default function StatCard({ 
  label, 
  value, 
  icon: Icon, 
  decimals = 0, 
  accentColor = 'var(--role-accent, var(--vermilion))',
  badgeText,
  onClick,
  active = false,
  domId,
  valueDomId
}) {
  return (
    <div 
      className={`stat-card ${onClick ? 'cursor-pointer' : ''}`}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        borderLeft: `5px solid ${accentColor}`,
        backgroundColor: active ? 'var(--bg-surface-warm)' : 'var(--bg-surface)',
        borderColor: active ? accentColor : 'var(--ink)'
      }}
      onClick={onClick}
      id={domId}
    >
      <div className="d-flex align-items-center justify-content-between mb-2">
        <span className="stat-label">{label}</span>
        {Icon && (
          <div 
            className="d-flex align-items-center justify-content-center rounded p-2"
            style={{ 
              backgroundColor: 'var(--bg-surface-sunken)', 
              color: accentColor,
              border: '1.5px solid var(--ink)'
            }}
          >
            <Icon size={18} />
          </div>
        )}
      </div>

      <div className="d-flex align-items-baseline justify-content-between">
        <div className="stat-value">
          <AnimatedNumber value={value} decimals={decimals} domId={valueDomId} />
        </div>

        {badgeText && (
          <span 
            className="badge"
            style={{
              backgroundColor: active ? accentColor : 'var(--bg-surface-sunken)',
              color: active ? '#FFFFFF' : 'var(--ink)'
            }}
          >
            {badgeText}
          </span>
        )}
      </div>
    </div>
  );
}

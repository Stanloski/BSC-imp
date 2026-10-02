import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertOctagon, AlertTriangle, X, Clock } from 'lucide-react';

export default function Toast({ 
  alert, 
  onClose, 
  domId, 
  duration = 7000 
}) {
  if (!alert) return null;

  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / duration) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        if (onClose) onClose();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [alert, duration, onClose]);

  const isSuccess = alert.type === 'success';
  const isDanger = alert.type === 'danger' || alert.type === 'error';
  const isWarning = alert.type === 'warning';

  const accentColor = isSuccess 
    ? 'var(--forest)' 
    : isWarning 
    ? 'var(--saffron-dark)' 
    : 'var(--vermilion)';

  const Icon = isSuccess 
    ? CheckCircle2 
    : isWarning 
    ? AlertTriangle 
    : AlertOctagon;

  return (
    <div className="editorial-toast-container">
      <div 
        className="editorial-toast" 
        id={domId}
        style={{
          borderLeft: `6px solid ${accentColor}`
        }}
        role="alert"
      >
        <div style={{ color: accentColor, flexShrink: 0, marginTop: '2px' }}>
          <Icon size={20} />
        </div>

        <div className="flex-grow-1 min-w-0">
          <div className="fw-bold font-serif" style={{ fontSize: '0.92rem', color: 'var(--ink)' }}>
            {isSuccess ? 'Success' : isWarning ? 'Notice' : 'Action Blocked / Error:'}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--ink-light)', marginTop: '2px' }}>
            {alert.message}
          </div>

          {/* If 409 missing records are provided (e.g. for exam officer computation failure) */}
          {alert.details && alert.details.length > 0 && (
            <div className="mt-2 p-2 rounded border" style={{ backgroundColor: 'var(--bg-surface-sunken)', maxHeight: '160px', overflowY: 'auto' }}>
              <div className="fw-bold small font-mono text-uppercase mb-1" style={{ color: 'var(--vermilion)', fontSize: '0.72rem' }}>
                Unscored Student Enrolments Requiring Score Entry:
              </div>
              <table className="table table-sm table-bordered mb-0 small" style={{ fontSize: '0.78rem' }}>
                <thead>
                  <tr>
                    <th>Matric No</th>
                    <th>Student Name</th>
                    <th>Course Code</th>
                  </tr>
                </thead>
                <tbody>
                  {alert.details.map((m, idx) => (
                    <tr key={idx}>
                      <td className="fw-bold font-mono">{m.matric_no}</td>
                      <td>{m.student_name}</td>
                      <td><span className="badge bg-secondary">{m.course_code}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="editorial-toast-close ms-2"
          aria-label="Close"
          style={{ 
            background: 'none', 
            border: 'none', 
            color: 'var(--ink-muted)', 
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center'
          }}
        >
          <X size={16} />
        </button>

        {/* Draining progress bar */}
        <div 
          className="editorial-toast-progress" 
          style={{ 
            width: `${progress}%`,
            backgroundColor: accentColor 
          }}
        />
      </div>
    </div>
  );
}

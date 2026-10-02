import React from 'react';

export default function SkeletonLoader({ type = 'table', rows = 5, cols = 5 }) {
  if (type === 'table') {
    return (
      <div className="p-3">
        {Array.from({ length: rows }).map((_, rIdx) => (
          <div key={rIdx} className="d-flex align-items-center gap-3 py-3 border-bottom" style={{ borderColor: 'var(--ink-faint)' }}>
            {Array.from({ length: cols }).map((_, cIdx) => (
              <div 
                key={cIdx} 
                className="skeleton-shimmer" 
                style={{ 
                  height: '18px', 
                  flex: cIdx === 1 ? 2 : 1,
                  borderRadius: '4px' 
                }} 
              />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (type === 'card') {
    return (
      <div className="row g-3">
        {Array.from({ length: rows }).map((_, idx) => (
          <div key={idx} className="col-12 col-md-6 col-lg-4">
            <div className="card p-3">
              <div className="skeleton-shimmer mb-3" style={{ height: '24px', width: '60%' }} />
              <div className="skeleton-shimmer mb-2" style={{ height: '16px', width: '90%' }} />
              <div className="skeleton-shimmer mb-3" style={{ height: '16px', width: '40%' }} />
              <div className="d-flex gap-2">
                <div className="skeleton-shimmer" style={{ height: '32px', width: '80px' }} />
                <div className="skeleton-shimmer" style={{ height: '32px', width: '80px' }} />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 d-flex flex-column gap-3">
      <div className="skeleton-shimmer" style={{ height: '28px', width: '40%' }} />
      <div className="skeleton-shimmer" style={{ height: '18px', width: '80%' }} />
      <div className="skeleton-shimmer" style={{ height: '18px', width: '65%' }} />
    </div>
  );
}

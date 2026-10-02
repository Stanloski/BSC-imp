import React, { useState, useEffect } from 'react';
import { AnimatedNumber } from './StatCard';

export default function GpaRing({ gpa = 0, size = 160, strokeWidth = 12 }) {
  const numericGpa = parseFloat(gpa) || 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const [strokeOffset, setStrokeOffset] = useState(circumference);

  // Band colors
  let bandColor = 'var(--vermilion)';
  let bandLabel = 'Fair / Pass';
  if (numericGpa >= 4.5) {
    bandColor = 'var(--gold)';
    bandLabel = 'First Class Honours';
  } else if (numericGpa >= 3.5) {
    bandColor = 'var(--forest)';
    bandLabel = 'Second Class Upper';
  } else if (numericGpa >= 2.5) {
    bandColor = 'var(--saffron-dark)';
    bandLabel = 'Second Class Lower';
  }

  useEffect(() => {
    const progress = Math.min(Math.max(numericGpa / 5.0, 0), 1);
    const targetOffset = circumference - (progress * circumference);
    const timer = setTimeout(() => {
      setStrokeOffset(targetOffset);
    }, 100);
    return () => clearTimeout(timer);
  }, [numericGpa, circumference]);

  return (
    <div className="gpa-ring-container" style={{ width: size, height: size }}>
      <svg className="gpa-ring-svg" width={size} height={size}>
        {/* Background track ring */}
        <circle
          className="gpa-ring-bg"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
        />

        {/* Animated Drawing Progress ring */}
        <circle
          className="gpa-ring-progress"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          stroke={bandColor}
          strokeDasharray={circumference}
          strokeDashoffset={strokeOffset}
        />
      </svg>

      {/* Center Content */}
      <div className="gpa-ring-content">
        <span className="small text-muted font-mono fw-bold text-uppercase" style={{ fontSize: '0.65rem', letterSpacing: '0.1em' }}>
          Semester GPA
        </span>

        {/* This ID is strictly inspected by test_runner.js */}
        <div 
          className="font-serif fw-bold" 
          id="result-gpa-display"
          style={{ 
            fontSize: '2.1rem', 
            lineHeight: 1, 
            color: bandColor,
            margin: '2px 0'
          }}
        >
          {numericGpa.toFixed(2)}
        </div>

        <span className="badge" style={{ backgroundColor: 'var(--bg-surface-sunken)', color: 'var(--ink)', fontSize: '0.65rem' }}>
          out of 5.00
        </span>
      </div>
    </div>
  );
}

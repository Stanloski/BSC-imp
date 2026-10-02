import React from 'react';

export default function GradeChip({ grade, score, title }) {
  if (!grade || grade === '-') {
    return <span className="text-muted small font-mono">-</span>;
  }

  const cleanGrade = String(grade).toUpperCase().trim();
  const chipClass = `grade-chip grade-chip-${cleanGrade}`;

  return (
    <span 
      className={chipClass} 
      title={title || `Grade ${cleanGrade}${score !== undefined ? ` (${score} marks)` : ''}`}
    >
      {cleanGrade}
    </span>
  );
}

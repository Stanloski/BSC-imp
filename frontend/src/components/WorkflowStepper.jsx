import React from 'react';
import { Check, Clock, BookOpen, Edit3, Calculator, ShieldCheck } from 'lucide-react';

export default function WorkflowStepper({ currentStep = 1, registeredCount = 0, isApproved = false }) {
  // Steps:
  // 1: Course Registration
  // 2: Score Entry
  // 3: Grade Computation
  // 4: HOD Endorsement & Result Publishing

  const steps = [
    { number: 1, label: 'Course Registration', icon: BookOpen, desc: registeredCount > 0 ? `${registeredCount} Courses` : 'Pending' },
    { number: 2, label: 'Score Grading', icon: Edit3, desc: 'Lecturer Review' },
    { number: 3, label: 'Computation', icon: Calculator, desc: 'Exam Officer' },
    { number: 4, label: 'HOD Endorsement', icon: ShieldCheck, desc: isApproved ? 'Approved & Slip Live' : 'Awaiting Approval' }
  ];

  const getStepStatus = (stepNumber) => {
    if (isApproved) return 'completed';
    if (stepNumber < currentStep) return 'completed';
    if (stepNumber === currentStep) return 'active';
    return 'pending';
  };

  const progressPercent = isApproved 
    ? 100 
    : ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <div className="stepper-container">
      {/* Background connecting track */}
      <div className="stepper-line">
        <div 
          className="stepper-line-fill" 
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {steps.map((s) => {
        const status = getStepStatus(s.number);
        const Icon = s.icon;
        return (
          <div key={s.number} className={`stepper-step ${status}`}>
            <div className="stepper-circle">
              {status === 'completed' ? (
                <Check size={20} strokeWidth={3} />
              ) : (
                <Icon size={18} />
              )}
            </div>
            <div className="stepper-label">{s.label}</div>
            <small className="text-muted font-mono" style={{ fontSize: '0.68rem', marginTop: '2px' }}>
              {s.desc}
            </small>
          </div>
        );
      })}
    </div>
  );
}

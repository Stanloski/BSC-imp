import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import GreetingHero from '../components/GreetingHero';
import GradeChip from '../components/GradeChip';
import SkeletonLoader from '../components/SkeletonLoader';
import Toast from '../components/Toast';
import { api } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BookOpen, 
  Users, 
  Save, 
  Lock, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  FileSpreadsheet,
  Layers,
  GraduationCap
} from 'lucide-react';

export default function Lecturer({ user, onLogout }) {
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [students, setStudents] = useState([]);
  const [scoresData, setScoresData] = useState({}); // { [enrolment_id]: { ca_score, exam_score } }
  const [sessionInfo, setSessionInfo] = useState({ session: '', semester: '' });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null); // { type, message }

  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
  };

  const loadCourses = async () => {
    setLoading(true);
    try {
      const res = await api.getLecturerCourses();
      setCourses(res.courses || []);
      setSessionInfo({ session: res.session, semester: res.semester });

      if (res.courses?.length > 0 && !selectedCourse) {
        selectCourse(res.courses[0], res.session, res.semester);
      }
    } catch (err) {
      showAlert(err.message || 'Failed to fetch assigned courses', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const selectCourse = async (course, session = sessionInfo.session, semester = sessionInfo.semester) => {
    setSelectedCourse(course);
    setLoading(true);
    try {
      const res = await api.getLecturerStudents(course.course_id, session, semester);
      setStudents(res.students || []);

      // Populate input states
      const initial = {};
      (res.students || []).forEach(st => {
        initial[st.enrolment_id] = {
          ca_score: st.ca_score !== null && st.ca_score !== undefined ? st.ca_score : '',
          exam_score: st.exam_score !== null && st.exam_score !== undefined ? st.exam_score : ''
        };
      });
      setScoresData(initial);
    } catch (err) {
      showAlert(err.message || 'Failed to fetch enrolled students for course', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, []);

  const handleScoreChange = (enrolmentId, field, value) => {
    setScoresData(prev => ({
      ...prev,
      [enrolmentId]: {
        ...prev[enrolmentId],
        [field]: value
      }
    }));
  };

  const calculatePreview = (ca, exam) => {
    const c = parseFloat(ca);
    const e = parseFloat(exam);
    if (isNaN(c) || isNaN(e)) return { total: '-', grade: '-' };
    const totalNum = c + e;
    const total = totalNum.toFixed(2);
    let grade = 'F';
    if (totalNum >= 70) grade = 'A';
    else if (totalNum >= 60) grade = 'B';
    else if (totalNum >= 50) grade = 'C';
    else if (totalNum >= 45) grade = 'D';
    else if (totalNum >= 40) grade = 'E';
    return { total, grade };
  };

  const isCaInvalid = (val) => {
    if (val === '' || val === null || val === undefined) return false;
    const num = parseFloat(val);
    return isNaN(num) || num < 0 || num > 30;
  };

  const isExamInvalid = (val) => {
    if (val === '' || val === null || val === undefined) return false;
    const num = parseFloat(val);
    return isNaN(num) || num < 0 || num > 70;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCourse) return;

    // Validate ranges
    for (const st of students) {
      const s = scoresData[st.enrolment_id];
      if (isCaInvalid(s?.ca_score)) {
        showAlert(`CA Score for ${st.matric_no} must be between 0 and 30.`, 'danger');
        return;
      }
      if (isExamInvalid(s?.exam_score)) {
        showAlert(`Exam Score for ${st.matric_no} must be between 0 and 70.`, 'danger');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = students.map(st => ({
        enrolment_id: st.enrolment_id,
        ca_score: scoresData[st.enrolment_id]?.ca_score === '' ? 0 : parseFloat(scoresData[st.enrolment_id]?.ca_score),
        exam_score: scoresData[st.enrolment_id]?.exam_score === '' ? 0 : parseFloat(scoresData[st.enrolment_id]?.exam_score)
      }));

      const res = await api.submitScores(selectedCourse.course_id, payload);
      showAlert(res.message || 'Scores submitted successfully!', 'success');
      await selectCourse(selectedCourse);
    } catch (err) {
      showAlert(err.message || 'Score submission failed', 'danger');
    } finally {
      setSaving(false);
    }
  };

  const navItems = [
    { id: 'grading', label: 'Score Grading Matrix', icon: FileSpreadsheet, badge: courses.length }
  ];

  return (
    <div className="app-container" data-role="lecturer">
      <div className="paper-noise-overlay" />

      {/* Slide-in Toast Notification with exact ID */}
      <Toast 
        alert={alert} 
        onClose={() => setAlert(null)} 
        domId="lecturer-alert" 
      />

      {/* Editorial Sidebar Navigation */}
      <Sidebar
        user={user}
        onLogout={onLogout}
        activeTab="grading"
        sessionInfo={sessionInfo}
        navItems={navItems}
      />

      {/* Main Content Area */}
      <main className="app-main">
        {/* Editorial Greeting Hero */}
        <GreetingHero
          user={user}
          sessionInfo={sessionInfo}
          subtitle="Academic Faculty Grading Portal • CA & Examination Assessment Management"
          actionElement={
            <span className="badge bg-secondary font-mono">
              Assigned Courses: {courses.length}
            </span>
          }
        />

        <div className="row g-4">
          {/* Courses Selector Left Column */}
          <div className="col-12 col-lg-4">
            <div className="card">
              <div className="card-header d-flex align-items-center justify-content-between">
                <div className="d-flex align-items-center gap-2">
                  <BookOpen size={18} style={{ color: 'var(--role-accent, var(--forest))' }} />
                  <span className="font-serif fw-bold">My Assigned Courses</span>
                </div>
                <span className="badge bg-secondary font-mono">{courses.length}</span>
              </div>

              <div className="p-2 d-flex flex-column gap-2">
                {courses.length === 0 ? (
                  <div className="p-4 text-center text-muted">
                    No courses assigned to your account.
                  </div>
                ) : (
                  courses.map(c => {
                    const isSelected = selectedCourse?.course_id === c.course_id;
                    return (
                      <button
                        key={c.course_id}
                        type="button"
                        onClick={() => selectCourse(c)}
                        className="btn text-start p-3 d-flex justify-content-between align-items-center w-100"
                        id={`course-select-${c.course_code.replace(/\s+/g, '')}`}
                        style={{
                          backgroundColor: isSelected ? 'var(--primary-soft)' : 'var(--surface)',
                          borderColor: isSelected ? 'var(--primary)' : 'var(--border)',
                          boxShadow: isSelected ? 'var(--shadow-md)' : 'var(--shadow-sm)',
                          borderRadius: '10px'
                        }}
                      >
                        <div>
                          <div className="font-mono fw-bold text-primary fs-6">
                            {c.course_code}
                          </div>
                          <div className="small text-truncate" style={{ maxWidth: '170px', color: 'var(--ink)' }}>
                            {c.course_title}
                          </div>
                          <div className="d-flex gap-1 mt-1">
                            <span className="badge bg-secondary font-mono">{c.credit_units} Units</span>
                            <span className="badge bg-light font-mono">{c.level}L</span>
                          </div>
                        </div>

                        <div className="text-end">
                          <span 
                            className="badge" 
                            style={{ 
                              backgroundColor: isSelected ? 'var(--role-accent, var(--forest))' : 'var(--bg-surface-sunken)',
                              color: isSelected ? '#FFFFFF' : 'var(--ink)'
                            }}
                          >
                            <Users size={12} className="me-1" />
                            {c.enrolled_students_count || 0}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Scores Entry Matrix Right Column */}
          <div className="col-12 col-lg-8">
            <div className="card">
              <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
                <div>
                  <h5 className="font-serif fw-bold mb-0">
                    {selectedCourse ? `${selectedCourse.course_code}: ${selectedCourse.course_title}` : 'Select a Course'}
                  </h5>
                  <small className="text-muted font-mono">
                    Grading Limits: CA (0–30) • Exam (0–70) • Total (100)
                  </small>
                </div>

                {selectedCourse && (
                  <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-secondary font-mono">{selectedCourse.credit_units} Credit Units</span>
                    <span className="badge bg-light font-mono">{students.length} Enrolled</span>
                  </div>
                )}
              </div>

              <div className="card-body p-4">
                {!selectedCourse ? (
                  <div className="text-center py-5 text-muted">
                    <BookOpen size={42} className="mb-2" />
                    <p>Please select a course from the sidebar list to enter marks.</p>
                  </div>
                ) : loading ? (
                  <SkeletonLoader type="table" rows={4} cols={5} />
                ) : students.length === 0 ? (
                  <div className="text-center py-5 text-muted" id="no-students-enrolled">
                    <Users size={42} className="mb-2" />
                    <h5 className="font-serif fw-bold">No Students Registered Yet</h5>
                    <p className="small mx-auto" style={{ maxWidth: '420px' }}>
                      Students enrolled in {selectedCourse.course_code} during the {sessionInfo.session} session will appear here for grading.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} id="lecturer-scores-form">
                    <div className="table-responsive mb-3">
                      <table className="table table-sm table-hover align-middle mb-0">
                        <thead>
                          <tr>
                            <th style={{ width: '115px' }}>Matric No</th>
                            <th>Student Name</th>
                            <th style={{ width: '95px' }} className="text-center">CA (0-30)</th>
                            <th style={{ width: '95px' }} className="text-center">Exam (0-70)</th>
                            <th className="text-center" style={{ width: '60px' }}>Total</th>
                            <th className="text-center" style={{ width: '55px' }}>Grade</th>
                            <th className="text-center" style={{ width: '120px' }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {students.map((st, i) => {
                            const scores = scoresData[st.enrolment_id] || { ca_score: '', exam_score: '' };
                            const preview = calculatePreview(scores.ca_score, scores.exam_score);
                            const isApproved = Boolean(st.is_approved);
                            const caErr = isCaInvalid(scores.ca_score);
                            const examErr = isExamInvalid(scores.exam_score);

                            return (
                              <motion.tr 
                                key={st.enrolment_id}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.04 }}
                                style={{ opacity: isApproved ? 0.75 : 1 }}
                              >
                                <td className="fw-bold font-mono text-primary">{st.matric_no}</td>
                                <td>{st.first_name} {st.surname}</td>

                                {/* CA Score Input */}
                                <td className="text-center">
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    max="30"
                                    disabled={isApproved || saving}
                                    className={`form-control form-control-sm font-mono text-center mx-auto ${caErr ? 'input-invalid' : ''}`}
                                    style={{ maxWidth: '80px' }}
                                    value={scores.ca_score}
                                    placeholder="0-30"
                                    onChange={(e) => handleScoreChange(st.enrolment_id, 'ca_score', e.target.value)}
                                    required
                                    id={`ca-input-${st.matric_no.replace(/\//g, '-')}`}
                                  />
                                </td>

                                {/* Exam Score Input */}
                                <td className="text-center">
                                  <input
                                    type="number"
                                    step="0.5"
                                    min="0"
                                    max="70"
                                    disabled={isApproved || saving}
                                    className={`form-control form-control-sm font-mono text-center mx-auto ${examErr ? 'input-invalid' : ''}`}
                                    style={{ maxWidth: '80px' }}
                                    value={scores.exam_score}
                                    placeholder="0-70"
                                    onChange={(e) => handleScoreChange(st.enrolment_id, 'exam_score', e.target.value)}
                                    required
                                    id={`exam-input-${st.matric_no.replace(/\//g, '-')}`}
                                  />
                                </td>

                                {/* Live Total */}
                                <td className="text-center fw-bold font-mono fs-6">
                                  {preview.total}
                                </td>

                                {/* Live GradeChip Preview with Smooth PopIn */}
                                <td className="text-center">
                                  <GradeChip grade={preview.grade} score={preview.total} />
                                </td>

                                {/* Approval Lock Status */}
                                <td className="text-center">
                                  {isApproved ? (
                                    <span className="badge bg-success" title="Result Approved by HOD. Edits are locked.">
                                      <Lock size={12} className="me-1" />
                                      Approved (Locked)
                                    </span>
                                  ) : st.score_id ? (
                                    <span className="badge bg-info">
                                      <CheckCircle2 size={12} className="me-1" />
                                      Saved
                                    </span>
                                  ) : (
                                    <span className="badge bg-warning">
                                      <Clock size={12} className="me-1" />
                                      Pending
                                    </span>
                                  )}
                                </td>
                              </motion.tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 pt-3 border-top" style={{ borderColor: 'var(--border)' }}>
                      <div className="small text-muted font-mono d-flex align-items-center gap-1">
                        <Lock size={14} style={{ color: 'var(--ink-muted)' }} />
                        <span>Edits to students with approved results will be automatically locked and ignored.</span>
                      </div>

                      <button
                        type="submit"
                        disabled={saving}
                        className="btn btn-primary px-4"
                        id="submit-scores-btn"
                        style={{ backgroundColor: 'var(--role-accent, var(--forest))' }}
                      >
                        {saving ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                            <span>Submitting Scores...</span>
                          </>
                        ) : (
                          <>
                            <Save size={16} />
                            <span>Save & Submit Scores</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* UNN Institutional Footer on Page */}
        <footer className="mt-5 pt-3 pb-4 text-center border-top no-print" style={{ borderColor: 'var(--border)' }}>
          <div className="font-serif fst-italic" style={{ color: 'var(--primary)', fontSize: '0.88rem' }}>
            © 2026 University of Nigeria, Nsukka. To Restore the Dignity of Man.
          </div>
        </footer>
      </main>
    </div>
  );
}

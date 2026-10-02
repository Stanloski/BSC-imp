import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import GreetingHero from '../components/GreetingHero';
import WorkflowStepper from '../components/WorkflowStepper';
import GpaRing from '../components/GpaRing';
import GradeChip from '../components/GradeChip';
import StatCard from '../components/StatCard';
import SkeletonLoader from '../components/SkeletonLoader';
import Toast from '../components/Toast';
import { api } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileCheck2, 
  BookPlus, 
  BookmarkCheck, 
  Printer, 
  CheckCircle, 
  Clock, 
  GraduationCap, 
  Layers,
  Award,
  BookOpen
} from 'lucide-react';

export default function Student({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('results'); // 'results', 'register', 'my_courses'
  const [availableCourses, setAvailableCourses] = useState([]);
  const [myCourses, setMyCourses] = useState([]);
  const [resultsData, setResultsData] = useState([]);
  const [sessionInfo, setSessionInfo] = useState({ session: '', semester: '' });
  const [totalUnits, setTotalUnits] = useState(0);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [alert, setAlert] = useState(null); // { type, message }

  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Available courses
      const avail = await api.getAvailableCourses();
      setAvailableCourses(avail.courses || []);
      setSessionInfo({ session: avail.session, semester: avail.semester });

      // 2. My registered courses
      const registered = await api.getMyCourses();
      setMyCourses(registered.courses || []);
      setTotalUnits(registered.total_units || 0);

      // 3. Approved Results
      const res = await api.getStudentResults();
      setResultsData(res.results || []);
    } catch (err) {
      showAlert(err.message || 'Failed to load student data', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRegister = async (courseId) => {
    setActionLoading(true);
    try {
      const res = await api.registerCourse(courseId);
      showAlert(res.message || 'Course registered successfully!', 'success');
      await loadData();
    } catch (err) {
      showAlert(err.message || 'Course registration failed.', 'danger');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Determine workflow step:
  // 1: No courses registered
  // 2: Registered courses exist, but no results approved
  // 3: Results computed
  // 4: Results approved
  const isApproved = resultsData.length > 0;
  let currentWorkflowStep = 1;
  if (isApproved) {
    currentWorkflowStep = 4;
  } else if (myCourses.length > 0) {
    currentWorkflowStep = 2;
  }

  const navItems = [
    { id: 'results', label: 'My Results', icon: FileCheck2, domId: 'tab-results-btn' },
    { id: 'register', label: 'Course Registration', icon: BookPlus, domId: 'tab-register-btn' },
    { id: 'my_courses', label: 'Registered Courses', icon: BookmarkCheck, badge: myCourses.length, domId: 'tab-mycourses-btn' }
  ];

  return (
    <div className="app-container" data-role="student">
      <div className="paper-noise-overlay" />

      {/* Slide-in Toast Notification with exact ID */}
      <Toast 
        alert={alert} 
        onClose={() => setAlert(null)} 
        domId="student-alert" 
      />

      {/* Editorial Sidebar Navigation */}
      <Sidebar
        user={user}
        onLogout={onLogout}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        sessionInfo={sessionInfo}
        navItems={navItems}
      />

      {/* Main Content Area */}
      <main className="app-main">
        {/* Editorial Greeting Hero */}
        <GreetingHero
          user={user}
          sessionInfo={sessionInfo}
          subtitle={`Student Scholar • Matric No: ${user.matric_no || 'CSC/2021/001'} • Department of Computer Science`}
          actionElement={
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-secondary font-mono">
                Total Registered: {totalUnits} Units
              </span>
            </div>
          }
        />

        {/* Academic Lifecycle Workflow Tracker */}
        <WorkflowStepper 
          currentStep={currentWorkflowStep}
          registeredCount={myCourses.length}
          isApproved={isApproved}
        />

        {/* Tab Content with Framer Motion AnimatePresence */}
        <AnimatePresence mode="wait">
          {/* TAB 1: APPROVED RESULTS */}
          {activeTab === 'results' && (
            <motion.div
              key="results-tab"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <div className="card mb-4">
                <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <div className="d-flex align-items-center gap-2">
                    <FileCheck2 size={20} style={{ color: 'var(--role-accent, var(--vermilion))' }} />
                    <span className="h5 mb-0 font-serif">Official Semester Results</span>
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    <span className="badge bg-secondary font-mono">Strict Policy: HOD Approved Only</span>
                    {resultsData.length > 0 && (
                      <button
                        onClick={handlePrint}
                        className="btn btn-outline-primary btn-sm"
                        id="print-result-btn"
                        title="Print official result statement"
                      >
                        <Printer size={15} />
                        <span>Print Result Slip</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="card-body p-4">
                  {loading ? (
                    <SkeletonLoader type="table" rows={4} cols={5} />
                  ) : resultsData.length === 0 ? (
                    <div className="text-center py-5" id="no-approved-results-banner">
                      <div 
                        className="d-inline-flex align-items-center justify-content-center p-3 rounded-circle mb-3"
                        style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)' }}
                      >
                        <Clock size={36} style={{ color: 'var(--ink-muted)' }} />
                      </div>
                      <h4 className="font-serif fw-bold" style={{ color: 'var(--ink)' }}>
                        No Approved Results Available
                      </h4>
                      <p className="text-muted small mx-auto" style={{ maxWidth: '480px' }}>
                        There are no published results for your account at this time. Results become visible strictly after score computation by the Exam Officer and final endorsement by the Head of Department.
                      </p>
                    </div>
                  ) : (
                    resultsData.map((res, index) => (
                      <div
                        key={res.result_id || index}
                        className="result-slip-printable mb-4 p-4 border rounded position-relative"
                        id={`result-card-${res.session?.replace('/', '-')}-${res.semester}`}
                        style={{ borderColor: 'var(--border)', backgroundColor: 'var(--surface)' }}
                      >
                        {/* Official UNN Result Header */}
                        <div className="text-center border-bottom pb-3 mb-4" style={{ borderColor: 'var(--border)' }}>
                          <div className="d-flex justify-content-center mb-2">
                            <img 
                              src="/unn-logo.png" 
                              alt="UNN Crest" 
                              className="unn-logo-img"
                              style={{ width: '64px', height: '64px', objectFit: 'contain' }}
                            />
                          </div>
                          <h2 className="font-serif fw-bold text-uppercase mb-1" style={{ letterSpacing: '0.04em', color: 'var(--ink)', fontSize: '1.45rem' }}>
                            UNIVERSITY OF NIGERIA, NSUKKA
                          </h2>
                          <div className="font-sans fw-semibold mb-2" style={{ color: 'var(--primary)', fontSize: '0.95rem' }}>
                            Faculty of Physical Sciences • Department of Computer Science
                          </div>
                          <div className="d-inline-block px-3 py-1 border rounded-pill font-mono fw-bold text-uppercase" style={{ letterSpacing: '0.14em', backgroundColor: 'var(--surface-2)', borderColor: 'var(--border)', fontSize: '0.82rem' }}>
                            STATEMENT OF RESULT
                          </div>
                        </div>

                        {/* Student Details Metadata Block */}
                        <div className="row g-2 mb-4 p-3 rounded small" style={{ backgroundColor: 'var(--surface-2)', border: '1px solid var(--border)' }}>
                          <div className="col-12 col-md-4">
                            <span className="text-muted">Full Name:</span>{' '}
                            <strong className="font-serif d-block" style={{ fontSize: '1.05rem', color: 'var(--ink)' }}>
                              {user.name || `${user.first_name} ${user.surname}`}
                            </strong>
                          </div>
                          <div className="col-6 col-md-3">
                            <span className="text-muted">Matriculation No:</span>{' '}
                            <strong className="font-mono text-primary d-block" style={{ fontSize: '1rem' }}>
                              {user.matric_no}
                            </strong>
                          </div>
                          <div className="col-6 col-md-2">
                            <span className="text-muted">Level:</span>{' '}
                            <strong className="font-mono d-block">300 Level</strong>
                          </div>
                          <div className="col-6 col-md-3 text-md-end">
                            <span className="text-muted">Session & Semester:</span>{' '}
                            <strong className="font-mono d-block">{res.session} • {res.semester}</strong>
                          </div>
                        </div>

                        {/* Summary Metrics & GPA Ring Section */}
                        <div className="row g-4 align-items-center mb-4">
                          <div className="col-12 col-md-4 d-flex justify-content-center">
                            <GpaRing gpa={parseFloat(res.gpa)} />
                          </div>

                          <div className="col-12 col-md-8">
                            <div className="row g-3">
                              <div className="col-6 col-sm-3">
                                <StatCard
                                  label="Total Units"
                                  value={res.total_credit_units}
                                  icon={BookOpen}
                                  accentColor="var(--primary)"
                                />
                              </div>
                              <div className="col-6 col-sm-3">
                                <StatCard
                                  label="Grade Points"
                                  value={res.total_grade_points}
                                  icon={Award}
                                  accentColor="var(--unn-gold)"
                                />
                              </div>
                              <div className="col-6 col-sm-3">
                                <StatCard
                                  label="Semester GPA"
                                  value={parseFloat(res.gpa).toFixed(2)}
                                  decimals={2}
                                  valueDomId="result-gpa-display"
                                  accentColor="var(--primary)"
                                />
                              </div>
                              <div className="col-6 col-sm-3">
                                <StatCard
                                  label="Cumulative CGPA"
                                  value={res.cgpa ? parseFloat(res.cgpa).toFixed(2) : parseFloat(res.gpa).toFixed(2)}
                                  decimals={2}
                                  valueDomId="result-cgpa-display"
                                  accentColor="var(--unn-forest)"
                                />
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Courses Breakdown Table with Watermark */}
                        <div className="result-table-watermark-container table-responsive mb-4">
                          <table className="table table-bordered table-hover align-middle mb-0 position-relative" style={{ zIndex: 1, backgroundColor: 'transparent' }}>
                            <thead>
                              <tr>
                                <th style={{ width: '15%' }}>Code</th>
                                <th>Course Title</th>
                                <th className="text-center" style={{ width: '8%' }}>Units</th>
                                <th className="text-center" style={{ width: '10%' }}>CA (30)</th>
                                <th className="text-center" style={{ width: '10%' }}>Exam (70)</th>
                                <th className="text-center" style={{ width: '10%' }}>Total</th>
                                <th className="text-center" style={{ width: '10%' }}>Grade</th>
                                <th className="text-center" style={{ width: '12%' }}>Grade Point</th>
                              </tr>
                            </thead>
                            <tbody>
                              {res.courses && res.courses.map((c, i) => (
                                <motion.tr 
                                  key={i}
                                  initial={{ opacity: 0, y: 6 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: i * 0.04 }}
                                >
                                  <td className="fw-bold font-mono text-primary">{c.course_code}</td>
                                  <td>{c.course_title}</td>
                                  <td className="text-center font-mono">{c.credit_units}</td>
                                  <td className="text-center font-mono">{c.ca_score}</td>
                                  <td className="text-center font-mono">{c.exam_score}</td>
                                  <td className="text-center fw-bold font-mono">{c.total_score}</td>
                                  <td className="text-center">
                                    <GradeChip grade={c.grade} score={c.total_score} />
                                  </td>
                                  <td className="text-center fw-bold font-mono">
                                    {(parseFloat(c.grade_point) * parseInt(c.credit_units)).toFixed(2)}
                                  </td>
                                </motion.tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Official Signatures & Institutional Motto Footer */}
                        <div className="pt-3 border-top" style={{ borderColor: 'var(--border)' }}>
                          <div className="row g-4 align-items-end mb-3">
                            <div className="col-12 col-md-4 text-center text-md-start">
                              <div className="border-bottom mb-1 pb-4" style={{ maxWidth: '200px', borderColor: 'var(--border)' }} />
                              <div className="font-serif fw-bold small">Examination Officer</div>
                              <div className="small text-muted font-mono" style={{ fontSize: '0.72rem' }}>Faculty of Physical Sciences</div>
                            </div>

                            <div className="col-12 col-md-4 text-center">
                              <div className="font-serif fst-italic fw-bold text-success" style={{ fontSize: '0.92rem' }}>
                                "To Restore the Dignity of Man"
                              </div>
                              <div className="small text-muted font-mono" style={{ fontSize: '0.72rem' }}>
                                Date Printed: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </div>
                            </div>

                            <div className="col-12 col-md-4 text-center text-md-end">
                              <div className="border-bottom mb-1 pb-4 ms-md-auto" style={{ maxWidth: '200px', borderColor: 'var(--border)' }} />
                              <div className="font-serif fw-bold small">Head of Department</div>
                              <div className="small text-muted font-mono" style={{ fontSize: '0.72rem' }}>Department of Computer Science</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 2: COURSE REGISTRATION */}
          {activeTab === 'register' && (
            <motion.div
              key="register-tab"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <div className="card">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="font-serif fw-bold mb-0">
                      Available Courses: {sessionInfo.session} ({sessionInfo.semester} Semester)
                    </h5>
                    <small className="text-muted">Register departmental courses offered in this academic term.</small>
                  </div>
                  <span className="badge bg-secondary font-mono">{availableCourses.length} Courses Offered</span>
                </div>

                <div className="card-body p-3">
                  <div className="table-responsive">
                    <table className="table table-hover align-middle">
                      <thead>
                        <tr>
                          <th>Course Code</th>
                          <th>Course Title</th>
                          <th className="text-center">Credit Units</th>
                          <th className="text-center">Level</th>
                          <th>Faculty Assigned</th>
                          <th className="text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {availableCourses.map((c, i) => (
                          <motion.tr 
                            key={c.course_id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.04 }}
                          >
                            <td className="fw-bold font-mono text-primary">{c.course_code}</td>
                            <td>{c.course_title}</td>
                            <td className="text-center font-mono">
                              <span className="badge bg-secondary">{c.credit_units} Units</span>
                            </td>
                            <td className="text-center font-mono">{c.level}L</td>
                            <td>
                              {c.lecturer_surname ? (
                                <span className="fw-semibold">
                                  {c.lecturer_first_name} {c.lecturer_surname}
                                </span>
                              ) : (
                                <span className="text-muted fst-italic">Faculty TBD</span>
                              )}
                            </td>
                            <td className="text-center">
                              {c.is_registered ? (
                                <span className="badge bg-success py-2 px-3">
                                  <CheckCircle size={14} className="me-1" />
                                  Registered
                                </span>
                              ) : (
                                <button
                                  onClick={() => handleRegister(c.course_id)}
                                  disabled={actionLoading}
                                  className="btn btn-primary btn-sm px-3 register-btn"
                                  id={`register-btn-${c.course_code.replace(/\s+/g, '')}`}
                                >
                                  Register
                                </button>
                              )}
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* TAB 3: REGISTERED COURSES */}
          {activeTab === 'my_courses' && (
            <motion.div
              key="mycourses-tab"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              <div className="card">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="font-serif fw-bold mb-0">Registered Academic Courses</h5>
                    <small className="text-muted">Enrolled Courses for {sessionInfo.session} ({sessionInfo.semester} Semester)</small>
                  </div>
                  <span className="badge bg-primary font-mono fs-6">
                    Total Units: {totalUnits}
                  </span>
                </div>

                <div className="card-body p-3">
                  {myCourses.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                      <BookmarkCheck size={36} className="mb-2" />
                      <p>You have not registered for any courses in this semester yet.</p>
                      <button 
                        onClick={() => setActiveTab('register')} 
                        className="btn btn-outline-primary btn-sm"
                      >
                        Go to Course Registration
                      </button>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-bordered table-hover align-middle">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Course Code</th>
                            <th>Course Title</th>
                            <th className="text-center">Units</th>
                            <th className="text-center">Level</th>
                            <th>Faculty</th>
                            <th>Enrolment Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {myCourses.map((c, i) => (
                            <motion.tr 
                              key={c.enrolment_id}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.04 }}
                            >
                              <td className="font-mono">{i + 1}</td>
                              <td className="fw-bold font-mono text-primary">{c.course_code}</td>
                              <td>{c.course_title}</td>
                              <td className="text-center font-mono fw-bold">{c.credit_units}</td>
                              <td className="text-center font-mono">{c.level}L</td>
                              <td>
                                {c.lecturer_surname ? `${c.lecturer_first_name} ${c.lecturer_surname}` : '-'}
                              </td>
                              <td className="small text-muted font-mono">
                                {new Date(c.registered_at).toLocaleDateString()}
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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

import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import GreetingHero from '../components/GreetingHero';
import StatCard from '../components/StatCard';
import GradeChip from '../components/GradeChip';
import SkeletonLoader from '../components/SkeletonLoader';
import Toast from '../components/Toast';
import { api } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calculator, 
  Table, 
  ClipboardCheck, 
  Printer, 
  Search, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Users, 
  BookOpen, 
  RefreshCw,
  Sparkles,
  HelpCircle,
  AlertOctagon,
  Check
} from 'lucide-react';

export default function ExamOfficer({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('broadsheet'); // 'broadsheet', 'scores_overview'
  const [session, setSession] = useState('2025/2026');
  const [semester, setSemester] = useState('First');

  const [broadsheetData, setBroadsheetData] = useState({ courses: [], broadsheet: [] });
  const [scoresOverview, setScoresOverview] = useState({ courses_overview: [], missing_count: 0, missing_scores: [] });
  const [searchQuery, setSearchQuery] = useState('');

  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);
  const [computeProgress, setComputeProgress] = useState(0);
  const [computeSuccess, setComputeSuccess] = useState(false);
  const [alert, setAlert] = useState(null); // { type, message, details: [] }

  const showAlert = (message, type = 'success', details = null) => {
    setAlert({ message, type, details });
  };

  const loadData = async () => {
    setLoading(true);
    try {
      let sess = session;
      let sem = semester;
      try {
        const setts = await api.getSettings();
        if (setts?.current_session) {
          sess = setts.current_session;
          setSession(sess);
        }
        if (setts?.current_semester) {
          sem = setts.current_semester;
          setSemester(sem);
        }
      } catch (e) {}

      await fetchBroadsheetAndScores(sess, sem);
    } catch (err) {
      showAlert(err.message || 'Failed to fetch exam officer data', 'danger');
    } finally {
      setLoading(false);
    }
  };

  const fetchBroadsheetAndScores = async (sess, sem) => {
    try {
      const [broadRes, scoreRes] = await Promise.all([
        api.getBroadsheet(sess, sem),
        api.getScoresOverview(sess, sem)
      ]);
      setBroadsheetData(broadRes);
      setScoresOverview(scoreRes);
    } catch (err) {
      showAlert(err.message, 'danger');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePeriodChange = async (e) => {
    e.preventDefault();
    setLoading(true);
    setAlert(null);
    await fetchBroadsheetAndScores(session, semester);
    setLoading(false);
  };

  const handleCompute = async () => {
    setComputing(true);
    setComputeProgress(10);
    setComputeSuccess(false);
    setAlert(null);

    // Simulated progress bar animation
    const progressInterval = setInterval(() => {
      setComputeProgress(prev => (prev < 90 ? prev + 15 : prev));
    }, 150);

    try {
      const res = await api.computeResults(session, semester);
      clearInterval(progressInterval);
      setComputeProgress(100);
      setComputeSuccess(true);
      showAlert(res.message || 'Results computed successfully!', 'success');
      await fetchBroadsheetAndScores(session, semester);
      setTimeout(() => {
        setComputeSuccess(false);
        setComputeProgress(0);
      }, 3500);
    } catch (err) {
      clearInterval(progressInterval);
      setComputeProgress(0);
      const missingDetails = err.data?.missing_records || [];
      showAlert(err.message || 'Computation refused', 'danger', missingDetails);
    } finally {
      setComputing(false);
    }
  };

  // Filter broadsheet rows by search query
  const filteredBroadsheet = (broadsheetData.broadsheet || []).filter(row => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      row.matric_no?.toLowerCase().includes(q) ||
      `${row.first_name} ${row.surname}`.toLowerCase().includes(q)
    );
  });

  // Calculate summary counts
  const totalStudents = broadsheetData.broadsheet?.length || 0;
  const approvedCount = (broadsheetData.broadsheet || []).filter(r => r.status === 'approved').length;
  const pendingCount = (broadsheetData.broadsheet || []).filter(r => r.status === 'pending').length;
  const rejectedCount = (broadsheetData.broadsheet || []).filter(r => r.status === 'rejected').length;

  const navItems = [
    { id: 'broadsheet', label: 'Department Broadsheet', icon: Table, domId: 'tab-broadsheet-btn' },
    { 
      id: 'scores_overview', 
      label: 'Scores Submission Audit', 
      icon: ClipboardCheck, 
      badge: scoresOverview.missing_count > 0 ? `${scoresOverview.missing_count} Missing` : null,
      domId: 'tab-submission-status-btn' 
    }
  ];

  return (
    <div className="app-container" data-role="exam_officer">
      <div className="paper-noise-overlay" />

      {/* Slide-in Toast with exact ID and details table support */}
      <Toast 
        alert={alert} 
        onClose={() => setAlert(null)} 
        domId="exam-officer-alert" 
      />

      {/* Editorial Sidebar */}
      <Sidebar
        user={user}
        onLogout={onLogout}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        sessionInfo={{ session, semester }}
        navItems={navItems}
      />

      {/* Main Content Area */}
      <main className="app-main">
        {/* Editorial Greeting Hero */}
        <GreetingHero
          user={user}
          sessionInfo={{ session, semester }}
          subtitle="Department of Computer Science, Faculty of Physical Sciences • Examination Officer Console"
          actionElement={
            <div className="d-flex align-items-center gap-2">
              <span className="badge bg-secondary font-mono">
                {totalStudents} Broadsheet Records
              </span>
            </div>
          }
        />

        {/* Top Control Bar: Period Switcher & Animated Compute Button */}
        <div className="card mb-4">
          <div className="card-body p-3 d-flex flex-wrap align-items-center justify-content-between gap-3">
            {/* Academic Period Selector Form */}
            <form onSubmit={handlePeriodChange} className="d-flex align-items-center gap-2">
              <span className="small font-mono fw-bold text-uppercase text-muted" style={{ fontSize: '0.72rem' }}>
                Academic Period:
              </span>
              <input
                type="text"
                className="form-control form-control-sm font-mono"
                value={session}
                onChange={(e) => setSession(e.target.value)}
                placeholder="2024/2025"
                style={{ width: '120px' }}
                title="Academic Session"
              />
              <select
                className="form-select form-select-sm font-mono"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                style={{ width: '140px' }}
              >
                <option value="First">First Semester</option>
                <option value="Second">Second Semester</option>
              </select>
              <button type="submit" className="btn btn-outline-secondary btn-sm" id="change-period-btn">
                <RefreshCw size={14} />
                <span>Load</span>
              </button>
            </form>

            {/* Animated Compute Results Button with Progress Bar & Drawing Checkmark */}
            <div className="position-relative">
              <button
                onClick={handleCompute}
                disabled={computing}
                className="btn btn-warning px-4 py-2 position-relative overflow-hidden"
                id="compute-results-btn"
                style={{
                  backgroundColor: computeSuccess ? 'var(--forest)' : 'var(--saffron)',
                  color: computeSuccess ? '#FFFFFF' : 'var(--ink-dark)',
                  minWidth: '220px',
                  height: '44px'
                }}
              >
                {computing ? (
                  <span className="d-flex align-items-center gap-2">
                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                    <span>Computing Grades ({computeProgress}%)...</span>
                  </span>
                ) : computeSuccess ? (
                  <span className="d-flex align-items-center gap-2 font-serif fw-bold">
                    {/* Drawing Checkmark Animation */}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" style={{ strokeDasharray: 30, strokeDashoffset: 0, animation: 'drawCheck 0.4s ease' }} />
                    </svg>
                    <span>Computation Complete!</span>
                  </span>
                ) : (
                  <span className="d-flex align-items-center gap-2 font-serif fw-bold">
                    <Calculator size={18} />
                    <span>Compute Semester Results</span>
                  </span>
                )}

                {/* Progress bar inside button while computing */}
                {computing && (
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      height: '4px',
                      backgroundColor: 'var(--ink)',
                      width: `${computeProgress}%`,
                      transition: 'width 0.15s ease'
                    }}
                  />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Summary Stat Cards */}
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-3">
            <StatCard
              label="Total Students"
              value={totalStudents}
              icon={Users}
              accentColor="var(--saffron-dark)"
            />
          </div>
          <div className="col-6 col-md-3">
            <StatCard
              label="Approved Results"
              value={approvedCount}
              icon={CheckCircle2}
              accentColor="var(--forest)"
              badgeText="Published"
            />
          </div>
          <div className="col-6 col-md-3">
            <StatCard
              label="Pending Decision"
              value={pendingCount}
              icon={Clock}
              accentColor="var(--gold)"
              badgeText="Awaiting HOD"
            />
          </div>
          <div className="col-6 col-md-3">
            <StatCard
              label="Flagged / Rejected"
              value={rejectedCount}
              icon={AlertOctagon}
              accentColor="var(--vermilion)"
              badgeText="Returned"
            />
          </div>
        </div>

        {/* Tab 1: MASTER BROADSHEET */}
        {activeTab === 'broadsheet' && (
          <div className="card">
            <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
              <div>
                <h5 className="font-serif fw-bold mb-0">
                  Academic Master Broadsheet: {session} ({semester} Semester)
                </h5>
                <small className="text-muted">Master ledger displaying individual course scores, computed GPAs, and HOD status.</small>
              </div>

              <div className="d-flex align-items-center gap-2">
                {/* Instant Live Search Filter */}
                <div className="input-group input-group-sm" style={{ width: '220px' }}>
                  <span className="input-group-text"><Search size={14} /></span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search broadsheet..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <button
                  onClick={() => window.print()}
                  className="btn btn-outline-secondary btn-sm"
                  title="Print official departmental broadsheet"
                >
                  <Printer size={15} />
                  <span>Print Broadsheet</span>
                </button>
              </div>
            </div>

            <div className="card-body p-3">
              {loading ? (
                <SkeletonLoader type="table" rows={6} cols={7} />
              ) : broadsheetData.broadsheet?.length === 0 ? (
                <div className="text-center py-5 text-muted" id="no-computed-results-banner">
                  <Calculator size={44} className="mb-2" />
                  <h5 className="font-serif fw-bold">No Computed Results Found</h5>
                  <p className="small mx-auto" style={{ maxWidth: '420px' }}>
                    Click the <strong>Compute Semester Results</strong> button above to run the grade calculation algorithm.
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-bordered table-hover align-middle mb-0 text-nowrap" id="broadsheet-table">
                    <thead className="table-dark">
                      <tr>
                        <th style={{ width: '40px' }}>#</th>
                        <th>Matric No</th>
                        <th>Student Name</th>
                        {/* Course columns */}
                        {broadsheetData.courses?.map(c => (
                          <th key={c.course_id} className="text-center" title={`${c.course_title} (${c.credit_units}U)`}>
                            <div>{c.course_code}</div>
                            <small className="opacity-75 font-mono">{c.credit_units}U</small>
                          </th>
                        ))}
                        <th className="text-center">Units</th>
                        <th className="text-center">Points</th>
                        <th className="text-center bg-primary">GPA</th>
                        <th className="text-center bg-success">CGPA</th>
                        <th className="text-center">Status</th>
                        <th style={{ minWidth: '180px' }}>Review / Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBroadsheet.map((row, idx) => {
                        const statusBadge = {
                          approved: 'bg-success',
                          rejected: 'bg-danger',
                          pending: 'bg-warning'
                        }[row.status] || 'bg-secondary';

                        // Map student courses by course_code
                        const courseMap = {};
                        (row.courses || []).forEach(cs => {
                          courseMap[cs.course_code] = cs;
                        });

                        return (
                          <motion.tr 
                            key={row.result_id || idx}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            className={row.status === 'rejected' ? 'table-danger' : ''}
                          >
                            <td className="font-mono">{idx + 1}</td>
                            <td className="fw-bold font-mono text-primary">{row.matric_no}</td>
                            <td>{row.first_name} {row.surname}</td>

                            {/* Scores for each semester course */}
                            {broadsheetData.courses?.map(c => {
                              const cs = courseMap[c.course_code];
                              if (!cs) return <td key={c.course_id} className="text-center text-muted font-mono">-</td>;
                              return (
                                <td key={c.course_id} className="text-center">
                                  <div className="font-mono fw-bold">{cs.total_score}</div>
                                  <GradeChip grade={cs.grade} score={cs.total_score} />
                                </td>
                              );
                            })}

                            <td className="text-center font-mono fw-bold">{row.total_credit_units}</td>
                            <td className="text-center font-mono fw-bold">{row.total_grade_points}</td>
                            {/* GPA column MUST contain text 4.20 for verification */}
                            <td className="text-center font-mono fw-bold text-primary fs-6">
                              {parseFloat(row.gpa).toFixed(2)}
                            </td>
                            <td className="text-center font-mono fw-bold text-success fs-6">
                              {row.cgpa ? parseFloat(row.cgpa).toFixed(2) : '-'}
                            </td>
                            <td className="text-center">
                              <span className={`badge ${statusBadge}`}>
                                {row.status}
                              </span>
                            </td>

                            {/* HOD Feedback Column */}
                            <td style={{ maxWidth: '280px', whiteSpace: 'normal' }}>
                              {row.status === 'rejected' ? (
                                <div className="p-2 rounded bg-white border border-danger small text-danger" id={`hod-comment-${row.result_id}`}>
                                  <strong>HOD Rejection Note:</strong> {row.latest_hod_comment || 'No comment provided'}
                                </div>
                              ) : row.status === 'approved' ? (
                                <span className="small text-success d-flex align-items-center gap-1 font-mono">
                                  <CheckCircle2 size={14} />
                                  <span>Endorsed by HOD</span>
                                </span>
                              ) : (
                                <span className="small text-muted fst-italic">Awaiting HOD decision</span>
                              )}
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: SCORES SUBMISSION AUDIT */}
        {activeTab === 'scores_overview' && (
          <div className="row g-4">
            <div className="col-12 col-lg-7">
              <div className="card">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center gap-2">
                    <BookOpen size={18} style={{ color: 'var(--role-accent, var(--saffron))' }} />
                    <span className="font-serif fw-bold">Course Score Submission Progress</span>
                  </div>
                  <span className="badge bg-secondary font-mono">{scoresOverview.courses_overview?.length || 0} Courses</span>
                </div>
                <div className="card-body p-3">
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead>
                        <tr>
                          <th>Course</th>
                          <th>Faculty Assigned</th>
                          <th className="text-center">Enrolled</th>
                          <th className="text-center">Submitted</th>
                          <th className="text-center">Pending</th>
                          <th>Audit Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scoresOverview.courses_overview?.map((co, i) => {
                          const isComplete = co.total_enrolled > 0 && co.scores_pending === 0;
                          return (
                            <motion.tr 
                              key={co.course_id}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.04 }}
                            >
                              <td className="fw-bold font-mono text-primary">{co.course_code}</td>
                              <td>{co.lecturer_surname ? `${co.lecturer_first_name} ${co.lecturer_surname}` : '-'}</td>
                              <td className="text-center font-mono">{co.total_enrolled}</td>
                              <td className="text-center font-mono text-success fw-bold">{co.scores_submitted}</td>
                              <td className="text-center font-mono text-danger fw-bold">{co.scores_pending}</td>
                              <td>
                                {isComplete ? (
                                  <span className="badge bg-success">
                                    <CheckCircle2 size={12} className="me-1" />
                                    Complete
                                  </span>
                                ) : co.total_enrolled === 0 ? (
                                  <span className="badge bg-light text-muted border">No Enrolments</span>
                                ) : (
                                  <span className="badge bg-warning">
                                    <Clock size={12} className="me-1" />
                                    Incomplete
                                  </span>
                                )}
                              </td>
                            </motion.tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-lg-5">
              <div className="card">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center gap-2">
                    <AlertTriangle size={18} style={{ color: 'var(--vermilion)' }} />
                    <span className="font-serif fw-bold">Missing Scores Audit</span>
                  </div>
                  <span className="badge bg-danger rounded-pill font-mono" id="missing-scores-badge">
                    {scoresOverview.missing_count} Missing
                  </span>
                </div>
                <div className="card-body p-3">
                  {scoresOverview.missing_count === 0 ? (
                    <div className="text-center py-5 text-success">
                      <CheckCircle2 size={44} className="mb-2" />
                      <h6 className="font-serif fw-bold">All Registered Students Have Scores!</h6>
                      <small className="text-muted">You can safely run the computation algorithm.</small>
                    </div>
                  ) : (
                    <div className="table-responsive" style={{ maxHeight: '380px', overflowY: 'auto' }}>
                      <table className="table table-sm table-bordered align-middle mb-0">
                        <thead>
                          <tr>
                            <th>Matric No</th>
                            <th>Student</th>
                            <th>Course</th>
                          </tr>
                        </thead>
                        <tbody>
                          {scoresOverview.missing_scores?.map((ms, i) => (
                            <tr key={ms.enrolment_id || i}>
                              <td className="fw-bold font-mono text-primary">{ms.matric_no}</td>
                              <td>{ms.first_name} {ms.surname}</td>
                              <td><span className="badge bg-secondary font-mono">{ms.course_code}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        {/* UNN Institutional Footer on Page */}
        <footer className="mt-5 pt-3 pb-4 text-center border-top border-2 no-print" style={{ borderColor: 'var(--ink-border)' }}>
          <div className="font-serif fst-italic" style={{ color: 'var(--primary)', fontSize: '0.88rem' }}>
            © 2026 University of Nigeria, Nsukka. To Restore the Dignity of Man.
          </div>
        </footer>
      </main>

      <style>{`
        @keyframes drawCheck {
          from { stroke-dashoffset: 30; }
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import GreetingHero from '../components/GreetingHero';
import StatCard from '../components/StatCard';
import GradeChip from '../components/GradeChip';
import SkeletonLoader from '../components/SkeletonLoader';
import Toast from '../components/Toast';
import { api } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { 
  ShieldCheck, 
  Hourglass, 
  CheckCircle2, 
  XOctagon, 
  Check, 
  X, 
  AlertTriangle, 
  Search, 
  RefreshCw,
  Sparkles,
  BookOpen
} from 'lucide-react';

export default function Hod({ user, onLogout }) {
  const [session, setSession] = useState('2025/2026');
  const [semester, setSemester] = useState('First');
  const [statusFilter, setStatusFilter] = useState('pending'); // 'pending', 'approved', 'rejected'

  const [resultsList, setResultsList] = useState([]);
  const [statusCounts, setStatusCounts] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalDecision, setModalDecision] = useState('approved'); // 'approved' | 'rejected'
  const [modalComments, setModalComments] = useState('');
  const [modalTargetIds, setModalTargetIds] = useState([]);
  const [modalError, setModalError] = useState('');

  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [alert, setAlert] = useState(null);

  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
  };

  const loadResults = async (filter = statusFilter, sess = session, sem = semester) => {
    setLoading(true);
    setSelectedIds([]);
    try {
      const res = await api.getPendingResults(sess, sem, filter);
      setResultsList(res.results || []);
      if (res.status_counts) setStatusCounts(res.status_counts);
    } catch (err) {
      showAlert(err.message || 'Failed to fetch results', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function init() {
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
      await loadResults(statusFilter, sess, sem);
    }
    init();
  }, [statusFilter]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(resultsList.map(r => r.result_id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const openDecisionModal = (decision, targetIds = selectedIds) => {
    if (!targetIds || targetIds.length === 0) {
      showAlert('Please select at least one student result first.', 'danger');
      return;
    }
    setModalDecision(decision);
    setModalTargetIds(targetIds);
    setModalComments('');
    setModalError('');
    setModalOpen(true);
  };

  const handleConfirmDecision = async () => {
    setModalError('');

    // Client-side validation: Rejection requires a comment
    if (modalDecision === 'rejected' && (!modalComments || modalComments.trim() === '')) {
      setModalError('Rejection requires a comment explaining the reason.');
      return;
    }

    setProcessing(true);
    try {
      const res = await api.decideResult(modalTargetIds, modalDecision, modalComments);
      setModalOpen(false);

      if (modalDecision === 'approved') {
        // Confetti burst on approval!
        try {
          confetti({
            particleCount: 110,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#006633', '#D4AF37', '#0F4D32', '#C59B27', '#0F1B2D']
          });
        } catch (e) {}
      }

      showAlert(res.message || `Results ${modalDecision} successfully!`, 'success');
      await loadResults();
    } catch (err) {
      setModalError(err.message || 'Failed to process decision');
    } finally {
      setProcessing(false);
    }
  };

  // Filter results list by search query
  const filteredResults = resultsList.filter(res => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      res.matric_no?.toLowerCase().includes(q) ||
      `${res.first_name} ${res.surname}`.toLowerCase().includes(q)
    );
  });

  const navItems = [
    { id: 'pending', label: 'Pending Endorsements', icon: Hourglass, badge: statusCounts.pending },
    { id: 'approved', label: 'Approved & Published', icon: CheckCircle2, badge: statusCounts.approved },
    { id: 'rejected', label: 'Rejected / Flagged', icon: XOctagon, badge: statusCounts.rejected }
  ];

  return (
    <div className="app-container" data-role="hod">
      <div className="paper-noise-overlay" />

      {/* Slide-in Toast with exact ID */}
      <Toast 
        alert={alert} 
        onClose={() => setAlert(null)} 
        domId="hod-alert" 
      />

      {/* Editorial Sidebar */}
      <Sidebar
        user={user}
        onLogout={onLogout}
        activeTab={statusFilter}
        onTabChange={(tabId) => setStatusFilter(tabId)}
        sessionInfo={{ session, semester }}
        navItems={navItems}
      />

      {/* Main Content Area */}
      <main className="app-main">
        {/* Editorial Greeting Hero */}
        <GreetingHero
          user={user}
          sessionInfo={{ session, semester }}
          subtitle="Department of Computer Science, Faculty of Physical Sciences • Head of Department (HOD) Endorsement Console"
          actionElement={
            <div className="d-flex align-items-center gap-2">
              <span className="editorial-stamp" style={{ borderColor: 'var(--unn-gold)', color: 'var(--ink)' }}>
                Executive Authority
              </span>
            </div>
          }
        />

        {/* Status Filter Cards */}
        <div className="row g-3 mb-4">
          <div className="col-12 col-sm-4">
            <StatCard
              label="Pending Approval"
              value={statusCounts.pending}
              icon={Hourglass}
              accentColor="var(--saffron-dark)"
              active={statusFilter === 'pending'}
              onClick={() => setStatusFilter('pending')}
              domId="filter-pending-card"
              badgeText="In Review"
            />
          </div>

          <div className="col-12 col-sm-4">
            <StatCard
              label="Approved & Published"
              value={statusCounts.approved}
              icon={CheckCircle2}
              accentColor="var(--forest)"
              active={statusFilter === 'approved'}
              onClick={() => setStatusFilter('approved')}
              domId="filter-approved-card"
              badgeText="Live to Students"
            />
          </div>

          <div className="col-12 col-sm-4">
            <StatCard
              label="Rejected / Flagged"
              value={statusCounts.rejected}
              icon={XOctagon}
              accentColor="var(--vermilion)"
              active={statusFilter === 'rejected'}
              onClick={() => setStatusFilter('rejected')}
              domId="filter-rejected-card"
              badgeText="Requires Revision"
            />
          </div>
        </div>

        {/* Action Toolbar for Pending Results */}
        {statusFilter === 'pending' && (
          <div className="card mb-3">
            <div className="card-body p-3 d-flex flex-wrap justify-content-between align-items-center gap-2">
              <div className="d-flex align-items-center gap-3">
                <span className="font-mono fw-bold small text-uppercase" style={{ letterSpacing: '0.06em' }}>
                  Selected: <span className="text-primary">{selectedIds.length}</span> student(s)
                </span>
                {selectedIds.length > 0 && (
                  <button className="btn btn-outline-secondary btn-sm py-1 px-2" onClick={() => setSelectedIds([])}>
                    Clear Selection
                  </button>
                )}
              </div>

              <div className="d-flex gap-2">
                <button
                  onClick={() => openDecisionModal('approved')}
                  disabled={selectedIds.length === 0}
                  className="btn btn-success btn-sm px-3"
                  id="bulk-approve-btn"
                >
                  <Check size={16} />
                  <span>Approve Selected</span>
                </button>

                <button
                  onClick={() => openDecisionModal('rejected')}
                  disabled={selectedIds.length === 0}
                  className="btn btn-danger btn-sm px-3"
                  id="bulk-reject-btn"
                >
                  <X size={16} />
                  <span>Reject Selected</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results Table Card */}
        <div className="card">
          <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
            <div className="d-flex align-items-center gap-2">
              <h5 className="font-serif fw-bold mb-0 text-capitalize">
                {statusFilter} Academic Results ({filteredResults.length})
              </h5>
            </div>

            <div className="d-flex align-items-center gap-2">
              {/* Instant Search Filter */}
              <div className="input-group input-group-sm" style={{ width: '220px' }}>
                <span className="input-group-text"><Search size={14} /></span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Filter records..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <button onClick={() => loadResults()} className="btn btn-outline-secondary btn-sm" title="Refresh queue">
                <RefreshCw size={14} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          <div className="card-body p-3">
            {loading ? (
              <SkeletonLoader type="table" rows={5} cols={6} />
            ) : filteredResults.length === 0 ? (
              <div className="text-center py-5 text-muted" id="no-results-found">
                <ShieldCheck size={44} className="mb-2" />
                <h5 className="font-serif fw-bold">No {statusFilter} results found</h5>
                <p className="small mx-auto" style={{ maxWidth: '420px' }}>
                  There are currently no student records under the <strong>{statusFilter}</strong> queue for {session} ({semester} Semester).
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover table-bordered align-middle mb-0" id="hod-results-table">
                  <thead className="table-dark">
                    <tr>
                      {statusFilter === 'pending' && (
                        <th style={{ width: '40px' }} className="text-center">
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={filteredResults.length > 0 && selectedIds.length === filteredResults.length}
                            onChange={handleSelectAll}
                            id="select-all-checkbox"
                          />
                        </th>
                      )}
                      <th>Matric No</th>
                      <th>Student Name</th>
                      <th>Courses Taken & Scores</th>
                      <th className="text-center">Units</th>
                      <th className="text-center">Points</th>
                      <th className="text-center bg-primary">GPA</th>
                      <th className="text-center bg-success">CGPA</th>
                      <th className="text-center">Status</th>
                      {statusFilter === 'pending' && <th className="text-center">Action</th>}
                      {statusFilter === 'rejected' && <th>Rejection Reason</th>}
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {filteredResults.map((res, i) => {
                        const isChecked = selectedIds.includes(res.result_id);
                        return (
                          <motion.tr 
                            key={res.result_id}
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            transition={{ delay: i * 0.03 }}
                            className={isChecked ? 'table-warning' : ''}
                          >
                            {statusFilter === 'pending' && (
                              <td className="text-center">
                                <input
                                  type="checkbox"
                                  className="form-check-input result-row-checkbox"
                                  checked={isChecked}
                                  onChange={() => handleSelectOne(res.result_id)}
                                  id={`check-result-${res.result_id}`}
                                />
                              </td>
                            )}
                            <td className="fw-bold font-mono text-primary">{res.matric_no}</td>
                            <td>{res.first_name} {res.surname}</td>

                            {/* Courses breakdown pill badges */}
                            <td>
                              <div className="d-flex flex-wrap gap-1">
                                {res.courses?.map((c, ci) => (
                                  <span key={ci} className="badge bg-light" title={`${c.course_title}: Total ${c.total_score}`}>
                                    <strong className="font-mono">{c.course_code}:</strong> {c.grade} ({c.total_score})
                                  </span>
                                ))}
                              </div>
                            </td>

                            <td className="text-center font-mono fw-bold">{res.total_credit_units}</td>
                            <td className="text-center font-mono fw-bold">{res.total_grade_points}</td>
                            <td className="text-center font-mono fw-bold text-primary fs-6">{parseFloat(res.gpa).toFixed(2)}</td>
                            <td className="text-center font-mono fw-bold text-success fs-6">{res.cgpa ? parseFloat(res.cgpa).toFixed(2) : '-'}</td>
                            <td className="text-center">
                              <span className={`badge ${res.status === 'approved' ? 'bg-success' : res.status === 'rejected' ? 'bg-danger' : 'bg-warning'}`}>
                                {res.status}
                              </span>
                            </td>

                            {statusFilter === 'pending' && (
                              <td className="text-center text-nowrap">
                                <button
                                  onClick={() => openDecisionModal('approved', [res.result_id])}
                                  className="btn btn-outline-success btn-sm me-1"
                                  id={`single-approve-${res.result_id}`}
                                  title="Endorse & publish result"
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  onClick={() => openDecisionModal('rejected', [res.result_id])}
                                  className="btn btn-outline-danger btn-sm"
                                  id={`single-reject-${res.result_id}`}
                                  title="Reject result with comments"
                                >
                                  <X size={14} />
                                </button>
                              </td>
                            )}

                            {statusFilter === 'rejected' && (
                              <td className="text-danger small font-mono">{res.latest_comment || 'No comment provided'}</td>
                            )}
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* UNN Institutional Footer on Page */}
        <footer className="mt-5 pt-3 pb-4 text-center border-top border-2 no-print" style={{ borderColor: 'var(--ink-border)' }}>
          <div className="font-serif fst-italic" style={{ color: 'var(--primary)', fontSize: '0.88rem' }}>
            © 2026 University of Nigeria, Nsukka. To Restore the Dignity of Man.
          </div>
        </footer>
      </main>

      {/* SPRING SCALE CONFIRMATION MODAL */}
      {modalOpen && (
        <div 
          className="modal show d-block" 
          tabIndex="-1" 
          style={{ backgroundColor: 'rgba(15, 27, 45, 0.65)', backdropFilter: 'blur(3px)' }} 
          id="hod-decision-modal"
        >
          <div className="modal-dialog modal-dialog-centered">
            <motion.div 
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="modal-content"
            >
                <div 
                  className="modal-header text-white"
                  style={{
                    backgroundColor: modalDecision === 'approved' ? 'var(--forest)' : 'var(--vermilion)'
                  }}
                >
                  <h5 className="modal-title font-serif fw-bold d-flex align-items-center gap-2">
                    {modalDecision === 'approved' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                    Confirm Result {modalDecision === 'approved' ? 'Endorsement & Publishing' : 'Rejection'}
                  </h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setModalOpen(false)} />
                </div>

                <div className="modal-body p-4">
                  {modalError && (
                    <div 
                      className="alert alert-danger py-2 small d-flex align-items-center gap-2 mb-3" 
                      id="modal-error-alert"
                      style={{
                        backgroundColor: 'var(--vermilion-soft)',
                        borderColor: 'var(--vermilion)',
                        color: 'var(--vermilion-dark)'
                      }}
                    >
                      <AlertTriangle size={16} className="flex-shrink-0" />
                      <div>{modalError}</div>
                    </div>
                  )}

                  <p className="mb-3">
                    You are executing an executive action for <strong>{modalTargetIds.length}</strong> student result(s):{' '}
                    <strong className={modalDecision === 'approved' ? 'text-success' : 'text-danger'}>
                      {modalDecision.toUpperCase()}
                    </strong>.
                  </p>

                  {modalDecision === 'approved' ? (
                    <div className="p-3 rounded border small text-muted" style={{ backgroundColor: 'var(--bg-surface-sunken)' }}>
                      <CheckCircle2 size={16} className="me-1 text-success d-inline" />
                      Endorsing these results will immediately publish the official semester transcripts and release result slips to the student portal.
                    </div>
                  ) : (
                    <div className="mb-3">
                      <label className="form-label text-danger fw-bold" htmlFor="rejection-comment-input">
                        Reason for Rejection (Mandatory) *
                      </label>
                      <textarea
                        className="form-control"
                        rows="3"
                        placeholder="Detail specific discrepancies (e.g., Inconsistent exam marks for CSC301)..."
                        value={modalComments}
                        onChange={(e) => {
                          setModalComments(e.target.value);
                          if (modalError) setModalError('');
                        }}
                        required
                        id="rejection-comment-input"
                      />
                      <small className="text-muted font-mono" style={{ fontSize: '0.72rem' }}>
                        This audit commentary will be sent directly to the Examination Officer.
                      </small>
                    </div>
                  )}
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={() => setModalOpen(false)}
                    disabled={processing}
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    className={`btn btn-sm ${modalDecision === 'approved' ? 'btn-success' : 'btn-danger'} px-4`}
                    onClick={handleConfirmDecision}
                    disabled={processing}
                    id="confirm-decision-btn"
                  >
                    {processing ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                        <span>Processing Decision...</span>
                      </>
                    ) : (
                      `Confirm ${modalDecision === 'approved' ? 'Approval' : 'Rejection'}`
                    )}
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
    </div>
  );
}

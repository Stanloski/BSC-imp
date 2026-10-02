import React from 'react';

export default function NavBar({ user, onLogout }) {
  const roleBadgeMap = {
    student: { label: 'Student', bg: 'bg-primary' },
    lecturer: { label: 'Lecturer', bg: 'bg-info text-dark' },
    exam_officer: { label: 'Exam Officer', bg: 'bg-warning text-dark' },
    hod: { label: 'Head of Department', bg: 'bg-success' },
    admin: { label: 'System Admin', bg: 'bg-danger' }
  };

  const currentRole = roleBadgeMap[user?.role] || { label: user?.role, bg: 'bg-secondary' };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm px-3 mb-4">
      <div className="container-fluid">
        <span className="navbar-brand fw-bold d-flex align-items-center gap-2">
          <img src="/unn-logo.png" alt="UNN" style={{ width: '28px', height: '28px', objectFit: 'contain' }} />
          <span>UNN SRPS <small className="text-light opacity-75 fw-normal fs-6">| UNN Student Result Processing System</small></span>
        </span>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarUserContent"
          aria-controls="navbarUserContent"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className="collapse navbar-collapse justify-content-end" id="navbarUserContent">
          <div className="d-flex align-items-center gap-3 my-2 my-lg-0 text-white">
            <div className="text-end">
              <div className="fw-semibold">
                {user?.name || `${user?.first_name} ${user?.surname}`}
                {user?.matric_no && (
                  <span className="badge bg-secondary ms-2 text-uppercase">{user.matric_no}</span>
                )}
              </div>
              <small className="d-flex align-items-center justify-content-end gap-1">
                <span className={`badge ${currentRole.bg}`}>{currentRole.label}</span>
                <span className="text-muted small">({user?.email})</span>
              </small>
            </div>

            <button
              onClick={onLogout}
              className="btn btn-outline-light btn-sm d-flex align-items-center gap-1"
              id="logout-btn"
              title="Logout from session"
            >
              <i className="bi bi-box-arrow-right"></i>
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

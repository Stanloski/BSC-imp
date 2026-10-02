import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import GreetingHero from '../components/GreetingHero';
import StatCard from '../components/StatCard';
import SkeletonLoader from '../components/SkeletonLoader';
import Toast from '../components/Toast';
import { api } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  BookOpen, 
  Sliders, 
  UserPlus, 
  BookPlus, 
  Trash2, 
  Edit3, 
  ShieldCheck, 
  GraduationCap, 
  UserCheck, 
  Calendar,
  Save,
  Clock,
  Search,
  Eye,
  EyeOff
} from 'lucide-react';

export default function Admin({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('users'); // 'users', 'courses', 'settings'
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // Users state
  const [usersList, setUsersList] = useState([]);
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userFormMode, setUserFormMode] = useState('create'); // 'create' | 'edit'
  const [userFormData, setUserFormData] = useState({
    user_id: '',
    surname: '',
    first_name: '',
    email: '',
    password: '',
    role: 'student',
    matric_no: ''
  });

  // Courses state
  const [coursesList, setCoursesList] = useState([]);
  const [lecturersList, setLecturersList] = useState([]);
  const [courseModalOpen, setCourseModalOpen] = useState(false);
  const [courseFormMode, setCourseFormMode] = useState('create'); // 'create' | 'edit'
  const [courseFormData, setCourseFormData] = useState({
    course_id: '',
    course_code: '',
    course_title: '',
    credit_units: 3,
    semester: 'First',
    level: 300,
    lecturer_id: ''
  });

  // Settings state
  const [settings, setSettings] = useState({ current_session: '2024/2025', current_semester: 'First' });
  const [savingSettings, setSavingSettings] = useState(false);

  const [loading, setLoading] = useState(true);
  const [modalSaving, setModalSaving] = useState(false);
  const [modalError, setModalError] = useState('');
  const [alert, setAlert] = useState(null);

  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const [uRes, cRes, sRes] = await Promise.all([
        api.getUsers(userRoleFilter),
        api.getCourses(),
        api.getSettings()
      ]);
      setUsersList(uRes.users || []);
      setCoursesList(cRes.courses || []);
      setLecturersList(cRes.lecturers || []);
      if (sRes) setSettings(sRes);
    } catch (err) {
      showAlert(err.message || 'Failed to load admin data', 'danger');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [userRoleFilter]);

  // --- USER HANDLERS ---
  const handleOpenUserCreate = () => {
    setUserFormMode('create');
    setUserFormData({
      user_id: '',
      surname: '',
      first_name: '',
      email: '',
      password: '',
      role: 'student',
      matric_no: ''
    });
    setModalError('');
    setUserModalOpen(true);
  };

  const handleOpenUserEdit = (u) => {
    setUserFormMode('edit');
    setUserFormData({
      user_id: u.user_id,
      surname: u.surname,
      first_name: u.first_name,
      email: u.email,
      password: '',
      role: u.role,
      matric_no: u.matric_no || ''
    });
    setModalError('');
    setUserModalOpen(true);
  };

  const handleSaveUser = async (e) => {
    e.preventDefault();
    setModalSaving(true);
    setModalError('');

    try {
      if (userFormMode === 'create') {
        await api.createUser(userFormData);
        showAlert('User created successfully!', 'success');
      } else {
        await api.updateUser(userFormData);
        showAlert('User updated successfully!', 'success');
      }
      setUserModalOpen(false);
      const uRes = await api.getUsers(userRoleFilter);
      setUsersList(uRes.users || []);
    } catch (err) {
      setModalError(err.message || 'Operation failed');
    } finally {
      setModalSaving(false);
    }
  };

  const handleDeleteUser = async (targetUser) => {
    if (!window.confirm(`Are you sure you want to delete user: ${targetUser.first_name} ${targetUser.surname} (${targetUser.email})?`)) {
      return;
    }
    try {
      await api.deleteUser(targetUser.user_id);
      showAlert('User deleted successfully.', 'success');
      const uRes = await api.getUsers(userRoleFilter);
      setUsersList(uRes.users || []);
    } catch (err) {
      showAlert(err.message || 'Failed to delete user', 'danger');
    }
  };

  // --- COURSE HANDLERS ---
  const handleOpenCourseCreate = () => {
    setCourseFormMode('create');
    setCourseFormData({
      course_id: '',
      course_code: '',
      course_title: '',
      credit_units: 3,
      semester: 'First',
      level: 300,
      lecturer_id: ''
    });
    setModalError('');
    setCourseModalOpen(true);
  };

  const handleOpenCourseEdit = (c) => {
    setCourseFormMode('edit');
    setCourseFormData({
      course_id: c.course_id,
      course_code: c.course_code,
      course_title: c.course_title,
      credit_units: c.credit_units,
      semester: c.semester,
      level: c.level,
      lecturer_id: c.lecturer_id || ''
    });
    setModalError('');
    setCourseModalOpen(true);
  };

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    setModalSaving(true);
    setModalError('');

    try {
      if (courseFormMode === 'create') {
        await api.createCourse(courseFormData);
        showAlert('Course created successfully!', 'success');
      } else {
        await api.updateCourse(courseFormData);
        showAlert('Course updated successfully!', 'success');
      }
      setCourseModalOpen(false);
      const cRes = await api.getCourses();
      setCoursesList(cRes.courses || []);
    } catch (err) {
      setModalError(err.message || 'Operation failed');
    } finally {
      setModalSaving(false);
    }
  };

  const handleAssignLecturer = async (courseId, lecturerId) => {
    try {
      await api.assignLecturer(courseId, lecturerId ? parseInt(lecturerId) : null);
      showAlert('Lecturer assigned successfully!', 'success');
      const cRes = await api.getCourses();
      setCoursesList(cRes.courses || []);
    } catch (err) {
      showAlert(err.message || 'Failed to assign lecturer', 'danger');
    }
  };

  const handleDeleteCourse = async (c) => {
    if (!window.confirm(`Are you sure you want to delete course ${c.course_code} - ${c.course_title}?`)) {
      return;
    }
    try {
      await api.deleteCourse(c.course_id);
      showAlert('Course deleted successfully.', 'success');
      const cRes = await api.getCourses();
      setCoursesList(cRes.courses || []);
    } catch (err) {
      showAlert(err.message || 'Failed to delete course', 'danger');
    }
  };

  // --- SETTINGS HANDLERS ---
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await api.updateSettings(settings);
      showAlert('Academic period settings updated successfully!', 'success');
    } catch (err) {
      showAlert(err.message || 'Failed to update settings', 'danger');
    } finally {
      setSavingSettings(false);
    }
  };

  // Filter users by search
  const filteredUsers = usersList.filter(u => {
    if (!userSearchQuery.trim()) return true;
    const q = userSearchQuery.toLowerCase();
    return (
      u.email?.toLowerCase().includes(q) ||
      `${u.first_name} ${u.surname}`.toLowerCase().includes(q) ||
      u.matric_no?.toLowerCase().includes(q)
    );
  });

  // Calculate user counts per role for stat cards
  const studentCount = usersList.filter(u => u.role === 'student').length;
  const lecturerCount = usersList.filter(u => u.role === 'lecturer').length;
  const examOfficerCount = usersList.filter(u => u.role === 'exam_officer').length;
  const hodCount = usersList.filter(u => u.role === 'hod').length;
  const adminCount = usersList.filter(u => u.role === 'admin').length;

  const navItems = [
    { id: 'users', label: 'User Directory', icon: Users, badge: usersList.length, domId: 'admin-tab-users' },
    { id: 'courses', label: 'Curriculum & Courses', icon: BookOpen, badge: coursesList.length, domId: 'admin-tab-courses' },
    { id: 'settings', label: 'Session & Term Settings', icon: Sliders, domId: 'admin-tab-settings' }
  ];

  return (
    <div className="app-container" data-role="admin">
      <div className="paper-noise-overlay" />

      {/* Slide-in Toast with exact ID */}
      <Toast 
        alert={alert} 
        onClose={() => setAlert(null)} 
        domId="admin-alert" 
      />

      {/* Editorial Sidebar */}
      <Sidebar
        user={user}
        onLogout={onLogout}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        sessionInfo={{ session: settings.current_session, semester: settings.current_semester }}
        navItems={navItems}
      />

      {/* Main Content Area */}
      <main className="app-main">
        {/* Editorial Greeting Hero */}
        <GreetingHero
          user={user}
          sessionInfo={{ session: settings.current_session, semester: settings.current_semester }}
          subtitle="Department of Computer Science, Faculty of Physical Sciences • System Administration Console"
          actionElement={
            <div className="d-flex align-items-center gap-2">
              <span className="editorial-stamp" style={{ borderColor: 'var(--unn-teal)', color: 'var(--ink)' }}>
                System Root Access
              </span>
            </div>
          }
        />

        {/* Stat Cards for Users per Role */}
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-2">
            <StatCard
              label="Students"
              value={studentCount}
              icon={GraduationCap}
              accentColor="var(--vermilion)"
            />
          </div>
          <div className="col-6 col-md-2">
            <StatCard
              label="Lecturers"
              value={lecturerCount}
              icon={BookOpen}
              accentColor="var(--forest)"
            />
          </div>
          <div className="col-6 col-md-2">
            <StatCard
              label="Exam Officers"
              value={examOfficerCount}
              icon={Sliders}
              accentColor="var(--saffron-dark)"
            />
          </div>
          <div className="col-6 col-md-2">
            <StatCard
              label="HOD"
              value={hodCount}
              icon={ShieldCheck}
              accentColor="var(--gold)"
            />
          </div>
          <div className="col-6 col-md-2">
            <StatCard
              label="Admins"
              value={adminCount}
              icon={UserCheck}
              accentColor="var(--teal)"
            />
          </div>
          <div className="col-6 col-md-2">
            <StatCard
              label="Courses"
              value={coursesList.length}
              icon={BookPlus}
              accentColor="var(--ink)"
            />
          </div>
        </div>

        {/* Tab 1: USER DIRECTORY */}
        {activeTab === 'users' && (
          <div className="row g-4">
            <div className="col-12 col-xl-9">
              <div className="card">
                <div className="card-header d-flex flex-wrap justify-content-between align-items-center gap-2">
                  <div className="d-flex align-items-center gap-3">
                    <h5 className="font-serif fw-bold mb-0">System User Directory</h5>
                    <select
                      className="form-select form-select-sm font-mono"
                      style={{ width: '150px' }}
                      value={userRoleFilter}
                      onChange={(e) => setUserRoleFilter(e.target.value)}
                    >
                      <option value="">All Roles</option>
                      <option value="student">Students</option>
                      <option value="lecturer">Lecturers</option>
                      <option value="exam_officer">Exam Officers</option>
                      <option value="hod">HOD</option>
                      <option value="admin">Admins</option>
                    </select>
                  </div>

                  <div className="d-flex align-items-center gap-2">
                    <div className="input-group input-group-sm" style={{ width: '180px' }}>
                      <span className="input-group-text"><Search size={14} /></span>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search users..."
                        value={userSearchQuery}
                        onChange={(e) => setUserSearchQuery(e.target.value)}
                      />
                    </div>

                    <button
                      onClick={handleOpenUserCreate}
                      className="btn btn-primary btn-sm px-3"
                      id="create-user-modal-btn"
                      style={{ backgroundColor: 'var(--role-accent, var(--teal))' }}
                    >
                      <UserPlus size={15} />
                      <span>Add New User</span>
                    </button>
                  </div>
                </div>

                <div className="card-body p-3">
                  {loading ? (
                    <SkeletonLoader type="table" rows={6} cols={6} />
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0" id="users-table">
                        <thead className="table-dark">
                          <tr>
                            <th style={{ width: '35px' }}>#</th>
                            <th>Full Name</th>
                            <th>Email Address</th>
                            <th>Role</th>
                            <th>Matriculation No</th>
                            <th>Registered</th>
                            <th className="text-center" style={{ width: '100px' }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredUsers.map((u, i) => {
                            const roleColor = {
                              student: 'bg-primary',
                              lecturer: 'bg-success',
                              exam_officer: 'bg-warning',
                              hod: 'bg-secondary',
                              admin: 'bg-info'
                            }[u.role] || 'bg-secondary';

                            return (
                              <motion.tr 
                                key={u.user_id}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.02 }}
                              >
                                <td className="font-mono">{i + 1}</td>
                                <td className="fw-bold font-serif">{u.first_name} {u.surname}</td>
                                <td className="font-mono small">{u.email}</td>
                                <td>
                                  <span className={`badge ${roleColor}`}>
                                    {u.role}
                                  </span>
                                </td>
                                <td>
                                  {u.matric_no ? (
                                    <span className="badge bg-light font-mono text-primary">{u.matric_no}</span>
                                  ) : (
                                    <span className="text-muted font-mono">-</span>
                                  )}
                                </td>
                                <td className="small text-muted font-mono">
                                  {new Date(u.created_at).toLocaleDateString()}
                                </td>
                                <td className="text-center">
                                  <button
                                    onClick={() => handleOpenUserEdit(u)}
                                    className="btn btn-outline-secondary btn-sm p-1 me-1"
                                    id={`edit-user-${u.user_id}`}
                                    title="Edit user"
                                  >
                                    <Edit3 size={14} />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteUser(u)}
                                    disabled={u.user_id === user.user_id}
                                    className="btn btn-outline-danger btn-sm p-1"
                                    id={`delete-user-${u.user_id}`}
                                    title="Delete user"
                                  >
                                    <Trash2 size={14} />
                                  </button>
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
            </div>

            {/* Recent Users List Sidebar */}
            <div className="col-12 col-xl-3">
              <div className="card">
                <div className="card-header">
                  <span className="font-serif fw-bold">Recent Users</span>
                </div>
                <div className="p-2 d-flex flex-column gap-2">
                  {usersList.slice(-6).reverse().map((ru) => (
                    <div 
                      key={ru.user_id}
                      className="p-2 rounded border"
                      style={{ backgroundColor: 'var(--bg-surface-sunken)', borderColor: 'var(--ink-faint)' }}
                    >
                      <div className="d-flex justify-content-between align-items-center">
                        <strong className="small font-serif">{ru.first_name} {ru.surname}</strong>
                        <span className="badge bg-light font-mono" style={{ fontSize: '0.62rem' }}>{ru.role}</span>
                      </div>
                      <div className="small font-mono text-muted text-truncate" style={{ fontSize: '0.72rem' }}>
                        {ru.email}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: COURSES & LECTURERS */}
        {activeTab === 'courses' && (
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <div>
                <h5 className="font-serif fw-bold mb-0">Course Catalog & Lecturer Allocation</h5>
                <small className="text-muted">Curriculum configuration and faculty assignment for departmental courses.</small>
              </div>

              <button
                onClick={handleOpenCourseCreate}
                className="btn btn-primary btn-sm px-3"
                id="create-course-modal-btn"
                style={{ backgroundColor: 'var(--role-accent, var(--teal))' }}
              >
                <BookPlus size={15} />
                <span>Add New Course</span>
              </button>
            </div>

            <div className="card-body p-3">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0" id="admin-courses-table">
                  <thead className="table-dark">
                    <tr>
                      <th>Code</th>
                      <th>Course Title</th>
                      <th className="text-center">Units</th>
                      <th className="text-center">Semester</th>
                      <th className="text-center">Level</th>
                      <th style={{ minWidth: '220px' }}>Assigned Faculty</th>
                      <th className="text-center">Enrolled</th>
                      <th className="text-center" style={{ width: '100px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {coursesList.map((c, i) => (
                      <motion.tr 
                        key={c.course_id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                      >
                        <td className="fw-bold font-mono text-primary">{c.course_code}</td>
                        <td>{c.course_title}</td>
                        <td className="text-center font-mono fw-bold">{c.credit_units}U</td>
                        <td className="text-center"><span className="badge bg-secondary font-mono">{c.semester}</span></td>
                        <td className="text-center font-mono">{c.level}L</td>
                        <td>
                          {/* Quick assign dropdown with exact ID */}
                          <select
                            className="form-select form-select-sm font-mono"
                            value={c.lecturer_id || ''}
                            onChange={(e) => handleAssignLecturer(c.course_id, e.target.value)}
                            id={`assign-lecturer-select-${c.course_code}`}
                          >
                            <option value="">-- Unassigned --</option>
                            {lecturersList.map((lec) => (
                              <option key={lec.user_id} value={lec.user_id}>
                                {lec.first_name} {lec.surname} ({lec.email})
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="text-center">
                          <span className="badge bg-light font-mono">{c.total_enrolments || 0}</span>
                        </td>
                        <td className="text-center">
                          <button
                            onClick={() => handleOpenCourseEdit(c)}
                            className="btn btn-outline-secondary btn-sm p-1 me-1"
                            id={`edit-course-${c.course_code}`}
                            title="Edit Course"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDeleteCourse(c)}
                            className="btn btn-outline-danger btn-sm p-1"
                            id={`delete-course-${c.course_code}`}
                            title="Delete Course"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: ACADEMIC SETTINGS */}
        {activeTab === 'settings' && (
          <div className="row justify-content-center">
            <div className="col-12 col-md-8 col-lg-6">
              <div className="card">
                <div className="card-header d-flex align-items-center gap-2">
                  <Calendar size={18} style={{ color: 'var(--teal)' }} />
                  <h5 className="font-serif fw-bold mb-0">Active Academic Session & Semester</h5>
                </div>
                <div className="card-body p-4">
                  <form onSubmit={handleSaveSettings} id="admin-settings-form">
                    <div className="mb-3">
                      <label className="form-label" htmlFor="setting-session-input">Academic Session</label>
                      <input
                        type="text"
                        className="form-control font-mono"
                        placeholder="e.g. 2024/2025"
                        value={settings.current_session}
                        onChange={(e) => setSettings({ ...settings, current_session: e.target.value })}
                        required
                        id="setting-session-input"
                      />
                      <small className="text-muted font-mono" style={{ fontSize: '0.72rem' }}>Format: YYYY/YYYY (e.g. 2024/2025)</small>
                    </div>

                    <div className="mb-4">
                      <label className="form-label" htmlFor="setting-semester-select">Active Semester</label>
                      <select
                        className="form-select font-mono"
                        value={settings.current_semester}
                        onChange={(e) => setSettings({ ...settings, current_semester: e.target.value })}
                        required
                        id="setting-semester-select"
                      >
                        <option value="First">First Semester</option>
                        <option value="Second">Second Semester</option>
                      </select>
                      <small className="text-muted font-mono" style={{ fontSize: '0.72rem' }}>Only courses in the active semester can be registered by students.</small>
                    </div>

                    <button
                      type="submit"
                      disabled={savingSettings}
                      className="btn btn-primary px-4 w-100"
                      id="save-settings-btn"
                      style={{ backgroundColor: 'var(--role-accent, var(--teal))', height: '44px' }}
                    >
                      {savingSettings ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" />
                          <span>Saving Settings...</span>
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          <span>Save Academic Settings</span>
                        </>
                      )}
                    </button>
                  </form>
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

      {/* USER CREATE / EDIT MODAL */}
      <AnimatePresence>
        {userModalOpen && (
          <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 27, 45, 0.65)', backdropFilter: 'blur(3px)' }}>
            <div className="modal-dialog modal-dialog-centered">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="modal-content"
              >
                <form onSubmit={handleSaveUser}>
                  <div className="modal-header bg-dark text-white">
                    <h5 className="modal-title font-serif fw-bold">
                      {userFormMode === 'create' ? 'Register New University User' : 'Edit User Profile'}
                    </h5>
                    <button type="button" className="btn-close btn-close-white" onClick={() => setUserModalOpen(false)} />
                  </div>
                  <div className="modal-body p-4">
                    {modalError && (
                      <div className="alert alert-danger py-2 small mb-3">{modalError}</div>
                    )}

                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <label className="form-label">First Name</label>
                        <input
                          type="text"
                          className="form-control"
                          value={userFormData.first_name}
                          onChange={(e) => setUserFormData({ ...userFormData, first_name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="col-6">
                        <label className="form-label">Surname</label>
                        <input
                          type="text"
                          className="form-control"
                          value={userFormData.surname}
                          onChange={(e) => setUserFormData({ ...userFormData, surname: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Email Address</label>
                      <input
                        type="email"
                        className="form-control font-mono"
                        value={userFormData.email}
                        onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                        required
                      />
                    </div>

                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <label className="form-label">Institutional Role</label>
                        <select
                          className="form-select font-mono"
                          value={userFormData.role}
                          onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                        >
                          <option value="student">Student</option>
                          <option value="lecturer">Lecturer</option>
                          <option value="exam_officer">Exam Officer</option>
                          <option value="hod">HOD</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div className="col-6">
                        <label className="form-label">Matric No (Students)</label>
                        <input
                          type="text"
                          className="form-control font-mono text-uppercase"
                          placeholder="CSC/2021/..."
                          value={userFormData.matric_no}
                          disabled={userFormData.role !== 'student'}
                          required={userFormData.role === 'student'}
                          onChange={(e) => setUserFormData({ ...userFormData, matric_no: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <label className="form-label mb-0">
                          {userFormMode === 'create' ? 'Password' : 'Password (leave blank to keep current)'}
                        </label>
                        {userFormMode === 'edit' && (
                          <button
                            type="button"
                            className="btn btn-outline-warning btn-sm py-0 px-2 font-mono"
                            style={{ fontSize: '0.72rem' }}
                            onClick={() => setUserFormData({ ...userFormData, password: 'Password123' })}
                            id="quick-reset-password-btn"
                          >
                            Reset to Password123
                          </button>
                        )}
                      </div>
                      <div className="input-group">
                        <input
                          type={showAdminPassword ? "text" : "password"}
                          className="form-control font-mono"
                          placeholder="••••••••"
                          value={userFormData.password}
                          required={userFormMode === 'create'}
                          onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                          autoComplete="new-password"
                          id="admin-user-password-input"
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary d-flex align-items-center justify-content-center px-3"
                          onClick={() => setShowAdminPassword(!showAdminPassword)}
                          id="toggle-admin-password-btn"
                          title={showAdminPassword ? "Hide password" : "Show password"}
                          aria-label={showAdminPassword ? "Hide password" : "Show password"}
                          tabIndex="-1"
                          style={{
                            borderColor: 'var(--ink-border, #0F1B2D)',
                            backgroundColor: 'var(--bg-surface-warm, #FAF6EE)',
                            color: 'var(--ink, #0F1B2D)'
                          }}
                        >
                          {showAdminPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {userFormMode === 'edit' && (
                        <small className="text-muted font-mono d-block mt-1" style={{ fontSize: '0.72rem' }}>
                          Resetting password flags user to change password on next login.
                        </small>
                      )}
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setUserModalOpen(false)}>
                      Cancel
                    </button>
                    <button type="submit" disabled={modalSaving} className="btn btn-primary btn-sm px-4">
                      {modalSaving ? 'Saving...' : userFormMode === 'create' ? 'Create User' : 'Update User'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* COURSE CREATE / EDIT MODAL */}
      <AnimatePresence>
        {courseModalOpen && (
          <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(15, 27, 45, 0.65)', backdropFilter: 'blur(3px)' }}>
            <div className="modal-dialog modal-dialog-centered">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="modal-content"
              >
                <form onSubmit={handleSaveCourse}>
                  <div className="modal-header bg-dark text-white">
                    <h5 className="modal-title font-serif fw-bold">
                      {courseFormMode === 'create' ? 'Add New Course' : 'Edit Course'}
                    </h5>
                    <button type="button" className="btn-close btn-close-white" onClick={() => setCourseModalOpen(false)} />
                  </div>
                  <div className="modal-body p-4">
                    {modalError && (
                      <div className="alert alert-danger py-2 small mb-3">{modalError}</div>
                    )}

                    <div className="row g-2 mb-3">
                      <div className="col-5">
                        <label className="form-label">Course Code</label>
                        <input
                          type="text"
                          className="form-control font-mono text-uppercase"
                          placeholder="CSC301"
                          value={courseFormData.course_code}
                          onChange={(e) => setCourseFormData({ ...courseFormData, course_code: e.target.value })}
                          required
                        />
                      </div>
                      <div className="col-4">
                        <label className="form-label">Credit Units</label>
                        <input
                          type="number"
                          min="1"
                          max="6"
                          className="form-control font-mono"
                          value={courseFormData.credit_units}
                          onChange={(e) => setCourseFormData({ ...courseFormData, credit_units: e.target.value })}
                          required
                        />
                      </div>
                      <div className="col-3">
                        <label className="form-label">Level</label>
                        <select
                          className="form-select font-mono"
                          value={courseFormData.level}
                          onChange={(e) => setCourseFormData({ ...courseFormData, level: e.target.value })}
                        >
                          <option value="100">100L</option>
                          <option value="200">200L</option>
                          <option value="300">300L</option>
                          <option value="400">400L</option>
                        </select>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Course Title</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Data Structures & Algorithms"
                        value={courseFormData.course_title}
                        onChange={(e) => setCourseFormData({ ...courseFormData, course_title: e.target.value })}
                        required
                      />
                    </div>

                    <div className="row g-2 mb-3">
                      <div className="col-6">
                        <label className="form-label">Semester</label>
                        <select
                          className="form-select font-mono"
                          value={courseFormData.semester}
                          onChange={(e) => setCourseFormData({ ...courseFormData, semester: e.target.value })}
                        >
                          <option value="First">First Semester</option>
                          <option value="Second">Second Semester</option>
                        </select>
                      </div>
                      <div className="col-6">
                        <label className="form-label">Assigned Lecturer</label>
                        <select
                          className="form-select font-mono"
                          value={courseFormData.lecturer_id}
                          onChange={(e) => setCourseFormData({ ...courseFormData, lecturer_id: e.target.value })}
                        >
                          <option value="">-- None --</option>
                          {lecturersList.map((lec) => (
                            <option key={lec.user_id} value={lec.user_id}>
                              {lec.first_name} {lec.surname}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setCourseModalOpen(false)}>
                      Cancel
                    </button>
                    <button type="submit" disabled={modalSaving} className="btn btn-primary btn-sm px-4">
                      {modalSaving ? 'Saving...' : courseFormMode === 'create' ? 'Create Course' : 'Update Course'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// SRPS Central API Client
export const API_BASE = 'http://localhost/srps/api';

/**
 * Universal fetch wrapper ensuring credentials: 'include' for session cookies
 */
export async function apiFetch(endpoint, options = {}) {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const config = {
    method: options.method || 'GET',
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    },
    ...options
  };

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    config.body = JSON.stringify(options.body);
  }

  let response;
  try {
    response = await fetch(url, config);
  } catch (netErr) {
    const error = new Error('Network error. Check if Apache backend is running.');
    error.status = 0;
    throw error;
  }

  let data;
  try {
    data = await response.json();
  } catch (parseErr) {
    data = { error: `Server error (${response.status})` };
  }

  if (!response.ok) {
    const errorMsg = data?.error || `Request failed with status ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;

    // Handle session expired broadcast
    if (response.status === 401 && (errorMsg.includes('Session expired') || data?.session_expired)) {
      window.dispatchEvent(new CustomEvent('srps:session_expired', { detail: 'Session expired, please log in again.' }));
    }

    throw err;
  }

  return data;
}

export const api = {
  // Auth endpoints
  login: (email, password) => apiFetch('/auth/login.php', { method: 'POST', body: { email, password } }),
  logout: () => apiFetch('/auth/logout.php', { method: 'POST' }),
  me: () => apiFetch('/auth/me.php'),
  changePassword: (new_password, confirm_password) => apiFetch('/auth/change_password.php', { method: 'POST', body: { new_password, confirm_password } }),

  // Student endpoints
  getAvailableCourses: () => apiFetch('/student/available_courses.php'),
  registerCourse: (course_id) => apiFetch('/student/register_course.php', { method: 'POST', body: { course_id } }),
  registerCourses: (course_ids) => apiFetch('/student/register_course.php', { method: 'POST', body: { course_ids } }),
  getMyCourses: (session, semester) => {
    const q = new URLSearchParams();
    if (session) q.append('session', session);
    if (semester) q.append('semester', semester);
    return apiFetch(`/student/my_courses.php?${q.toString()}`);
  },
  getStudentResults: () => apiFetch('/student/results.php'),

  // Lecturer endpoints
  getLecturerCourses: () => apiFetch('/lecturer/courses.php'),
  getLecturerStudents: (course_id, session, semester) => {
    const q = new URLSearchParams({ course_id });
    if (session) q.append('session', session);
    if (semester) q.append('semester', semester);
    return apiFetch(`/lecturer/students.php?${q.toString()}`);
  },
  submitScores: (course_id, scores) => apiFetch('/lecturer/submit_scores.php', { method: 'POST', body: { course_id, scores } }),

  // Exam Officer endpoints
  getScoresOverview: (session, semester) => {
    const q = new URLSearchParams();
    if (session) q.append('session', session);
    if (semester) q.append('semester', semester);
    return apiFetch(`/examofficer/scores.php?${q.toString()}`);
  },
  computeResults: (session, semester) => apiFetch('/examofficer/compute.php', { method: 'POST', body: { session, semester } }),
  getBroadsheet: (session, semester) => {
    const q = new URLSearchParams();
    if (session) q.append('session', session);
    if (semester) q.append('semester', semester);
    return apiFetch(`/examofficer/broadsheet.php?${q.toString()}`);
  },

  // HOD endpoints
  getPendingResults: (session, semester, status = 'pending') => {
    const q = new URLSearchParams();
    if (session) q.append('session', session);
    if (semester) q.append('semester', semester);
    if (status) q.append('status', status);
    return apiFetch(`/hod/pending.php?${q.toString()}`);
  },
  decideResult: (result_ids, decision, comments = '') => {
    return apiFetch('/hod/decide.php', {
      method: 'POST',
      body: { result_ids: Array.isArray(result_ids) ? result_ids : [result_ids], decision, comments }
    });
  },

  // Admin endpoints
  getUsers: (role = '') => apiFetch(`/admin/users.php${role ? `?role=${role}` : ''}`),
  createUser: (userData) => apiFetch('/admin/users.php', { method: 'POST', body: userData }),
  updateUser: (userData) => apiFetch('/admin/users.php', { method: 'PUT', body: userData }),
  deleteUser: (user_id) => apiFetch(`/admin/users.php?user_id=${user_id}`, { method: 'DELETE' }),

  getCourses: () => apiFetch('/admin/courses.php'),
  createCourse: (courseData) => apiFetch('/admin/courses.php', { method: 'POST', body: courseData }),
  updateCourse: (courseData) => apiFetch('/admin/courses.php', { method: 'PUT', body: courseData }),
  deleteCourse: (course_id) => apiFetch(`/admin/courses.php?course_id=${course_id}`, { method: 'DELETE' }),
  assignLecturer: (course_id, lecturer_id) => apiFetch('/admin/courses.php', {
    method: 'PUT',
    body: { course_id, lecturer_id, assign_lecturer_only: true }
  }),

  getSettings: () => apiFetch('/admin/settings.php'),
  updateSettings: (settingsData) => apiFetch('/admin/settings.php', { method: 'POST', body: settingsData })
};

<?php
// Lecturer Course Enrolled Students Endpoint
require_once __DIR__ . '/../helpers/auth.php';

$user = requireRole('lecturer');
$pdo = getDB();
$settings = getSystemSettings($pdo);

$courseId = isset($_GET['course_id']) ? intval($_GET['course_id']) : 0;
if ($courseId <= 0) {
    jsonError("Valid course_id parameter is required.", 422);
}

// Security: Verify that this course exists AND is assigned to this lecturer
$checkCourseStmt = $pdo->prepare("SELECT course_id, course_code, course_title, credit_units, semester, level, lecturer_id FROM courses WHERE course_id = :id");
$checkCourseStmt->execute([':id' => $courseId]);
$course = $checkCourseStmt->fetch();

if (!$course) {
    jsonError("Course not found.", 404);
}

if ((int)$course['lecturer_id'] !== (int)$user['user_id']) {
    jsonError("Forbidden. This course is not assigned to you.", 403);
}

$session = $_GET['session'] ?? $settings['current_session'];
$semester = $_GET['semester'] ?? $settings['current_semester'];

// Fetch students enrolled in this course for the session and semester
// Include their scores and check if results are approved
$sql = "SELECT e.enrolment_id, e.session, e.semester,
               u.user_id AS student_id, u.matric_no, u.surname, u.first_name, u.email,
               s.score_id, s.ca_score, s.exam_score, s.total_score, s.grade, s.grade_point, s.submitted_at,
               r.status AS result_status,
               CASE WHEN r.status = 'approved' THEN 1 ELSE 0 END AS is_approved
        FROM enrolments e
        JOIN users u ON e.student_id = u.user_id
        LEFT JOIN scores s ON s.enrolment_id = e.enrolment_id
        LEFT JOIN results r ON r.student_id = e.student_id AND r.session = e.session AND r.semester = e.semester
        WHERE e.course_id = :course_id AND e.session = :session AND e.semester = :semester
        ORDER BY u.matric_no ASC";

$stmt = $pdo->prepare($sql);
$stmt->execute([
    ':course_id' => $courseId,
    ':session'   => $session,
    ':semester'  => $semester
]);
$students = $stmt->fetchAll();

jsonResponse([
    'course'   => $course,
    'session'  => $session,
    'semester' => $semester,
    'students' => $students
]);

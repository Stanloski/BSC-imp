<?php
// Lecturer Assigned Courses Endpoint
require_once __DIR__ . '/../helpers/auth.php';

$user = requireRole('lecturer');
$pdo = getDB();
$settings = getSystemSettings($pdo);

$currentSession = $settings['current_session'];
$currentSemester = $settings['current_semester'];

// Fetch only courses assigned to this lecturer
$sql = "SELECT c.course_id, c.course_code, c.course_title, c.credit_units, c.semester, c.level,
               COUNT(e.enrolment_id) AS enrolled_students_count,
               COUNT(s.score_id) AS submitted_scores_count
        FROM courses c
        LEFT JOIN enrolments e ON e.course_id = c.course_id AND e.session = :session AND e.semester = :semester
        LEFT JOIN scores s ON s.enrolment_id = e.enrolment_id
        WHERE c.lecturer_id = :lecturer_id
        GROUP BY c.course_id
        ORDER BY c.course_code ASC";

$stmt = $pdo->prepare($sql);
$stmt->execute([
    ':lecturer_id' => $user['user_id'],
    ':session'     => $currentSession,
    ':semester'    => $currentSemester
]);
$courses = $stmt->fetchAll();

jsonResponse([
    'session'  => $currentSession,
    'semester' => $currentSemester,
    'courses'  => $courses
]);

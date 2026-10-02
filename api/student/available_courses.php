<?php
// Available Courses for Registration
require_once __DIR__ . '/../helpers/auth.php';

$user = requireRole('student');
$pdo = getDB();
$settings = getSystemSettings($pdo);

$currentSession = $settings['current_session'];
$currentSemester = $settings['current_semester'];

// Fetch courses for the current semester along with enrolment status for the student
$sql = "SELECT c.course_id, c.course_code, c.course_title, c.credit_units, c.semester, c.level,
               u.surname AS lecturer_surname, u.first_name AS lecturer_first_name,
               e.enrolment_id,
               CASE WHEN e.enrolment_id IS NOT NULL THEN 1 ELSE 0 END AS is_registered
        FROM courses c
        LEFT JOIN users u ON c.lecturer_id = u.user_id
        LEFT JOIN enrolments e ON e.course_id = c.course_id 
                               AND e.student_id = :student_id 
                               AND e.session = :session
        WHERE c.semester = :semester
        ORDER BY c.course_code ASC";

$stmt = $pdo->prepare($sql);
$stmt->execute([
    ':student_id' => $user['user_id'],
    ':session'    => $currentSession,
    ':semester'   => $currentSemester
]);
$courses = $stmt->fetchAll();

jsonResponse([
    'session'   => $currentSession,
    'semester'  => $currentSemester,
    'courses'   => $courses
]);

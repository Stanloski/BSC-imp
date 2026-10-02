<?php
// Student's Registered Courses Endpoint
require_once __DIR__ . '/../helpers/auth.php';

$user = requireRole('student');
$pdo = getDB();
$settings = getSystemSettings($pdo);

$session = $_GET['session'] ?? $settings['current_session'];
$semester = $_GET['semester'] ?? $settings['current_semester'];

$sql = "SELECT e.enrolment_id, e.session, e.semester, e.registered_at,
               c.course_id, c.course_code, c.course_title, c.credit_units, c.level,
               u.surname AS lecturer_surname, u.first_name AS lecturer_first_name
        FROM enrolments e
        JOIN courses c ON e.course_id = c.course_id
        LEFT JOIN users u ON c.lecturer_id = u.user_id
        WHERE e.student_id = :student_id AND e.session = :session AND e.semester = :semester
        ORDER BY c.course_code ASC";

$stmt = $pdo->prepare($sql);
$stmt->execute([
    ':student_id' => $user['user_id'],
    ':session'    => $session,
    ':semester'   => $semester
]);
$enrolments = $stmt->fetchAll();

$totalUnits = 0;
foreach ($enrolments as $e) {
    $totalUnits += (int)$e['credit_units'];
}

jsonResponse([
    'session'     => $session,
    'semester'    => $semester,
    'total_units' => $totalUnits,
    'courses'     => $enrolments
]);

<?php
// Exam Officer Scores Overview Endpoint
require_once __DIR__ . '/../helpers/auth.php';

$user = requireRole(['exam_officer', 'admin']);
$pdo = getDB();
$settings = getSystemSettings($pdo);

$session = $_GET['session'] ?? $settings['current_session'];
$semester = $_GET['semester'] ?? $settings['current_semester'];

// Course-level breakdown of enrolments vs submitted scores
$sql = "SELECT c.course_id, c.course_code, c.course_title, c.credit_units, c.level,
               u.surname AS lecturer_surname, u.first_name AS lecturer_first_name,
               COUNT(e.enrolment_id) AS total_enrolled,
               COUNT(s.score_id) AS scores_submitted,
               (COUNT(e.enrolment_id) - COUNT(s.score_id)) AS scores_pending
        FROM courses c
        LEFT JOIN users u ON c.lecturer_id = u.user_id
        LEFT JOIN enrolments e ON e.course_id = c.course_id AND e.session = :session AND e.semester = :semester
        LEFT JOIN scores s ON s.enrolment_id = e.enrolment_id
        WHERE c.semester = :course_semester
        GROUP BY c.course_id
        ORDER BY c.course_code ASC";

$stmt = $pdo->prepare($sql);
$stmt->execute([
    ':session'         => $session,
    ':semester'        => $semester,
    ':course_semester' => $semester
]);
$coursesOverview = $stmt->fetchAll();

// Enrolments with missing scores for this session and semester
$missingSql = "SELECT e.enrolment_id, e.session, e.semester,
                      u.user_id, u.matric_no, u.surname, u.first_name,
                      c.course_id, c.course_code, c.course_title,
                      lec.surname AS lecturer_surname, lec.first_name AS lecturer_first_name
               FROM enrolments e
               JOIN users u ON e.student_id = u.user_id
               JOIN courses c ON e.course_id = c.course_id
               LEFT JOIN users lec ON c.lecturer_id = lec.user_id
               LEFT JOIN scores s ON s.enrolment_id = e.enrolment_id
               WHERE e.session = :session AND e.semester = :semester
                 AND s.score_id IS NULL
               ORDER BY c.course_code ASC, u.matric_no ASC";

$missingStmt = $pdo->prepare($missingSql);
$missingStmt->execute([':session' => $session, ':semester' => $semester]);
$missingList = $missingStmt->fetchAll();

jsonResponse([
    'session'          => $session,
    'semester'         => $semester,
    'courses_overview' => $coursesOverview,
    'missing_count'    => count($missingList),
    'missing_scores'   => $missingList
]);

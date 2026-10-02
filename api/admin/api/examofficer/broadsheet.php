<?php
// Exam Officer & HOD Broadsheet View Endpoint
require_once __DIR__ . '/../helpers/auth.php';

$user = requireRole(['exam_officer', 'hod', 'admin']);
$pdo = getDB();
$settings = getSystemSettings($pdo);

$session = $_GET['session'] ?? $settings['current_session'];
$semester = $_GET['semester'] ?? $settings['current_semester'];

// Fetch all courses offered in this semester
$coursesStmt = $pdo->prepare("SELECT course_id, course_code, course_title, credit_units FROM courses WHERE semester = :semester ORDER BY course_code ASC");
$coursesStmt->execute([':semester' => $semester]);
$allCourses = $coursesStmt->fetchAll();

// Fetch results for this session & semester
$resultsSql = "
    SELECT r.result_id, r.student_id, r.session, r.semester,
           r.total_credit_units, r.total_grade_points, r.gpa, r.cgpa, r.status, r.computed_at,
           u.matric_no, u.surname, u.first_name, u.email,
           (
               SELECT ar.comments 
               FROM approval_records ar 
               WHERE ar.result_id = r.result_id 
               ORDER BY ar.decided_at DESC LIMIT 1
           ) AS latest_hod_comment,
           (
               SELECT ar.decision 
               FROM approval_records ar 
               WHERE ar.result_id = r.result_id 
               ORDER BY ar.decided_at DESC LIMIT 1
           ) AS latest_decision,
           (
               SELECT CONCAT(approver.first_name, ' ', approver.surname)
               FROM approval_records ar
               JOIN users approver ON ar.approved_by = approver.user_id
               WHERE ar.result_id = r.result_id
               ORDER BY ar.decided_at DESC LIMIT 1
           ) AS latest_approver_name
    FROM results r
    JOIN users u ON r.student_id = u.user_id
    WHERE r.session = :session AND r.semester = :semester
    ORDER BY u.matric_no ASC
";

$stmt = $pdo->prepare($resultsSql);
$stmt->execute([':session' => $session, ':semester' => $semester]);
$results = $stmt->fetchAll();

// For each student result, fetch course breakdown
$scoresStmt = $pdo->prepare("
    SELECT c.course_id, c.course_code, c.course_title, c.credit_units,
           s.score_id, s.ca_score, s.exam_score, s.total_score, s.grade, s.grade_point
    FROM enrolments e
    JOIN courses c ON e.course_id = c.course_id
    LEFT JOIN scores s ON e.enrolment_id = s.enrolment_id
    WHERE e.student_id = :student_id AND e.session = :session AND e.semester = :semester
    ORDER BY c.course_code ASC
");

$broadsheetRows = [];
foreach ($results as $res) {
    $scoresStmt->execute([
        ':student_id' => $res['student_id'],
        ':session'    => $res['session'],
        ':semester'   => $res['semester']
    ]);
    $courseScores = $scoresStmt->fetchAll();

    $res['courses'] = $courseScores;
    $broadsheetRows[] = $res;
}

jsonResponse([
    'session'     => $session,
    'semester'    => $semester,
    'courses'     => $allCourses,
    'broadsheet'  => $broadsheetRows,
    'total_count' => count($broadsheetRows)
]);

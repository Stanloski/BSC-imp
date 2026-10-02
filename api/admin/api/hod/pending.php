<?php
// HOD Pending Results Endpoint
require_once __DIR__ . '/../helpers/auth.php';

$user = requireRole('hod');
$pdo = getDB();
$settings = getSystemSettings($pdo);

$session = $_GET['session'] ?? $settings['current_session'];
$semester = $_GET['semester'] ?? $settings['current_semester'];
$statusFilter = $_GET['status'] ?? 'pending'; // 'pending', 'approved', 'rejected', 'all'

$sql = "
    SELECT r.result_id, r.student_id, r.session, r.semester,
           r.total_credit_units, r.total_grade_points, r.gpa, r.cgpa, r.status, r.computed_at,
           u.matric_no, u.surname, u.first_name, u.email,
           (
               SELECT ar.comments 
               FROM approval_records ar 
               WHERE ar.result_id = r.result_id 
               ORDER BY ar.decided_at DESC LIMIT 1
           ) AS latest_comment
    FROM results r
    JOIN users u ON r.student_id = u.user_id
    WHERE r.session = :session AND r.semester = :semester
";

if ($statusFilter !== 'all') {
    $sql .= " AND r.status = :status";
}

$sql .= " ORDER BY u.matric_no ASC";

$stmt = $pdo->prepare($sql);
$params = [':session' => $session, ':semester' => $semester];
if ($statusFilter !== 'all') {
    $params[':status'] = $statusFilter;
}
$stmt->execute($params);
$results = $stmt->fetchAll();

// Fetch course breakdown for each result
$breakdownStmt = $pdo->prepare("
    SELECT c.course_code, c.course_title, c.credit_units,
           s.ca_score, s.exam_score, s.total_score, s.grade, s.grade_point
    FROM enrolments e
    JOIN courses c ON e.course_id = c.course_id
    JOIN scores s ON e.enrolment_id = s.enrolment_id
    WHERE e.student_id = :student_id AND e.session = :session AND e.semester = :semester
    ORDER BY c.course_code ASC
");

$detailedResults = [];
foreach ($results as $res) {
    $breakdownStmt->execute([
        ':student_id' => $res['student_id'],
        ':session'    => $res['session'],
        ':semester'   => $res['semester']
    ]);
    $res['courses'] = $breakdownStmt->fetchAll();
    $detailedResults[] = $res;
}

// Also get counts by status for convenience in HOD UI
$countsStmt = $pdo->prepare("
    SELECT status, COUNT(*) AS count
    FROM results
    WHERE session = :session AND semester = :semester
    GROUP BY status
");
$countsStmt->execute([':session' => $session, ':semester' => $semester]);
$countsRows = $countsStmt->fetchAll();
$statusCounts = ['pending' => 0, 'approved' => 0, 'rejected' => 0];
foreach ($countsRows as $row) {
    $statusCounts[$row['status']] = (int)$row['count'];
}

jsonResponse([
    'session'       => $session,
    'semester'      => $semester,
    'status_filter' => $statusFilter,
    'status_counts' => $statusCounts,
    'results'       => $detailedResults
]);

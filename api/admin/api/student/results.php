<?php
// Student Results Endpoint - APPROVED RESULTS ONLY
require_once __DIR__ . '/../helpers/auth.php';

$user = requireRole('student');
$pdo = getDB();

// STRICT GATE: Fetch ONLY results with status = 'approved'
// Students must NEVER see pending or rejected results.
$sqlResults = "SELECT r.result_id, r.student_id, r.session, r.semester,
                      r.total_credit_units, r.total_grade_points, r.gpa, r.cgpa,
                      r.status, r.computed_at
               FROM results r
               WHERE r.student_id = :student_id AND r.status = 'approved'
               ORDER BY r.session DESC, r.semester DESC";

$stmt = $pdo->prepare($sqlResults);
$stmt->execute([':student_id' => $user['user_id']]);
$results = $stmt->fetchAll();

// For each approved result, attach the courses, scores, and grades breakdown
$resultsWithCourses = [];
$breakdownStmt = $pdo->prepare("
    SELECT c.course_code, c.course_title, c.credit_units,
           s.ca_score, s.exam_score, s.total_score, s.grade, s.grade_point
    FROM enrolments e
    JOIN courses c ON e.course_id = c.course_id
    JOIN scores s ON e.enrolment_id = s.enrolment_id
    WHERE e.student_id = :student_id 
      AND e.session = :session 
      AND e.semester = :semester
    ORDER BY c.course_code ASC
");

foreach ($results as $res) {
    $breakdownStmt->execute([
        ':student_id' => $user['user_id'],
        ':session'    => $res['session'],
        ':semester'   => $res['semester']
    ]);
    $courses = $breakdownStmt->fetchAll();

    $res['courses'] = $courses;
    $resultsWithCourses[] = $res;
}

jsonResponse([
    'student' => [
        'name'      => $user['name'] ?? ($user['first_name'] . ' ' . $user['surname']),
        'matric_no' => $user['matric_no'],
        'email'     => $user['email']
    ],
    'results' => $resultsWithCourses
]);

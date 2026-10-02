<?php
// Exam Officer Grade Computation Endpoint
require_once __DIR__ . '/../helpers/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError("Method Not Allowed. Use POST.", 405);
}

// "Cannot approve" - Exam officer can only compute
$user = requireRole('exam_officer');
$input = getJsonInput();
$pdo = getDB();
$settings = getSystemSettings($pdo);

$session = trim($input['session'] ?? $settings['current_session']);
$semester = trim($input['semester'] ?? $settings['current_semester']);

if (empty($session) || empty($semester)) {
    jsonError("Session and semester are required.", 422);
}

// WORKFLOW GATE: "Computation must be REFUSED (409) with a count if any registered student still has no score."
$missingSql = "SELECT e.enrolment_id, e.student_id, e.course_id,
                      u.matric_no, CONCAT(u.first_name, ' ', u.surname) AS student_name,
                      c.course_code
               FROM enrolments e
               JOIN users u ON e.student_id = u.user_id
               JOIN courses c ON e.course_id = c.course_id
               LEFT JOIN scores s ON s.enrolment_id = e.enrolment_id
               WHERE e.session = :session AND e.semester = :semester
                 AND (s.score_id IS NULL OR s.ca_score IS NULL OR s.exam_score IS NULL)";

$missingStmt = $pdo->prepare($missingSql);
$missingStmt->execute([':session' => $session, ':semester' => $semester]);
$missingRecords = $missingStmt->fetchAll();
$missingCount = count($missingRecords);

if ($missingCount > 0) {
    jsonError(
        "Computation refused: {$missingCount} registered enrolment(s) have missing scores for {$session} {$semester} Semester.",
        409,
        [
            'missing_count'    => $missingCount,
            'missing_records'  => array_slice($missingRecords, 0, 20)
        ]
    );
}

// Check if there are any enrolments at all
$totalEnrolStmt = $pdo->prepare("SELECT COUNT(*) FROM enrolments WHERE session = :session AND semester = :semester");
$totalEnrolStmt->execute([':session' => $session, ':semester' => $semester]);
$totalEnrolments = (int)$totalEnrolStmt->fetchColumn();

if ($totalEnrolments === 0) {
    jsonError("No student enrolments found for {$session} {$semester} Semester to compute.", 422);
}

// Start transaction for calculation, scores update, results upsert, and CGPA recalculation
$pdo->beginTransaction();

try {
    // 1. Update grade and grade_point for all scores in this session & semester
    // Total = CA (max 30) + Exam (max 70)
    // 70 to 100 = A, 5 | 60 to 69 = B, 4 | 50 to 59 = C, 3 | 45 to 49 = D, 2 | 40 to 44 = E, 1 | 0 to 39 = F, 0
    $fetchScoresSql = "
        SELECT s.score_id, s.ca_score, s.exam_score
        FROM scores s
        JOIN enrolments e ON s.enrolment_id = e.enrolment_id
        WHERE e.session = :session AND e.semester = :semester
    ";
    $fetchScoresStmt = $pdo->prepare($fetchScoresSql);
    $fetchScoresStmt->execute([':session' => $session, ':semester' => $semester]);
    $scoresRows = $fetchScoresStmt->fetchAll();

    $updateScoreStmt = $pdo->prepare("
        UPDATE scores 
        SET total_score = :total, grade = :grade, grade_point = :gp
        WHERE score_id = :id
    ");

    foreach ($scoresRows as $sc) {
        $ca = floatval($sc['ca_score']);
        $exam = floatval($sc['exam_score']);
        $total = $ca + $exam;

        if ($total >= 70) {
            $grade = 'A'; $gp = 5.00;
        } elseif ($total >= 60) {
            $grade = 'B'; $gp = 4.00;
        } elseif ($total >= 50) {
            $grade = 'C'; $gp = 3.00;
        } elseif ($total >= 45) {
            $grade = 'D'; $gp = 2.00;
        } elseif ($total >= 40) {
            $grade = 'E'; $gp = 1.00;
        } else {
            $grade = 'F'; $gp = 0.00;
        }

        $updateScoreStmt->execute([
            ':total' => $total,
            ':grade' => $grade,
            ':gp'    => $gp,
            ':id'    => $sc['score_id']
        ]);
    }

    // 2. Aggregate per student for this session and semester:
    // GPA = sum(grade_point x credit_units) / sum(credit_units), rounded to 2 decimals
    $gpaSql = "
        SELECT e.student_id,
               SUM(c.credit_units) AS total_credit_units,
               SUM(c.credit_units * s.grade_point) AS total_grade_points
        FROM enrolments e
        JOIN courses c ON e.course_id = c.course_id
        JOIN scores s ON e.enrolment_id = s.enrolment_id
        WHERE e.session = :session AND e.semester = :semester
        GROUP BY e.student_id
    ";
    $gpaStmt = $pdo->prepare($gpaSql);
    $gpaStmt->execute([':session' => $session, ':semester' => $semester]);
    $studentsGpa = $gpaStmt->fetchAll();

    // 3. Upsert results with status 'pending' (this also resets a rejected result to pending)
    $upsertResultStmt = $pdo->prepare("
        INSERT INTO results (student_id, session, semester, total_credit_units, total_grade_points, gpa, status, computed_by, computed_at)
        VALUES (:student_id, :session, :semester, :units, :points, :gpa, 'pending', :computed_by, CURRENT_TIMESTAMP)
        ON DUPLICATE KEY UPDATE
            total_credit_units = VALUES(total_credit_units),
            total_grade_points = VALUES(total_grade_points),
            gpa                = VALUES(gpa),
            status             = 'pending',
            computed_by        = VALUES(computed_by),
            computed_at        = CURRENT_TIMESTAMP
    ");

    foreach ($studentsGpa as $sg) {
        $units = intval($sg['total_credit_units']);
        $points = floatval($sg['total_grade_points']);
        $gpa = $units > 0 ? round($points / $units, 2) : 0.00;

        $upsertResultStmt->execute([
            ':student_id'  => $sg['student_id'],
            ':session'     => $session,
            ':semester'    => $semester,
            ':units'       => $units,
            ':points'      => $points,
            ':gpa'         => $gpa,
            ':computed_by' => $user['user_id']
        ]);
    }

    // 4. Calculate CGPA across all results of each student
    // CGPA = sum(total_grade_points) / sum(total_credit_units) across all of that student's results, rounded to 2 decimals
    $cgpaStmt = $pdo->prepare("
        SELECT SUM(total_credit_units) AS cum_units,
               SUM(total_grade_points) AS cum_points
        FROM results
        WHERE student_id = :student_id
    ");

    $updateCgpaStmt = $pdo->prepare("
        UPDATE results
        SET cgpa = :cgpa
        WHERE student_id = :student_id AND session = :session AND semester = :semester
    ");

    foreach ($studentsGpa as $sg) {
        $cgpaStmt->execute([':student_id' => $sg['student_id']]);
        $cum = $cgpaStmt->fetch();

        $cumUnits = intval($cum['cum_units'] ?? 0);
        $cumPoints = floatval($cum['cum_points'] ?? 0);
        $cgpa = $cumUnits > 0 ? round($cumPoints / $cumUnits, 2) : 0.00;

        $updateCgpaStmt->execute([
            ':cgpa'       => $cgpa,
            ':student_id' => $sg['student_id'],
            ':session'    => $session,
            ':semester'   => $semester
        ]);
    }

    $pdo->commit();

    jsonResponse([
        'message'        => "Computation completed successfully for " . count($studentsGpa) . " student(s). Status set to 'pending'.",
        'session'        => $session,
        'semester'       => $semester,
        'computed_count' => count($studentsGpa)
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    jsonError("Computation failed: " . $e->getMessage(), 500);
}

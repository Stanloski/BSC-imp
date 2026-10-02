<?php
// Lecturer Score Submission & Edit Endpoint
require_once __DIR__ . '/../helpers/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError("Method Not Allowed. Use POST.", 405);
}

$user = requireRole('lecturer');
$input = getJsonInput();

$courseId = isset($input['course_id']) ? intval($input['course_id']) : 0;
$scoresList = $input['scores'] ?? [];

if ($courseId <= 0) {
    jsonError("Valid course_id is required.", 422);
}

if (!is_array($scoresList) || empty($scoresList)) {
    jsonError("Scores array is required.", 422);
}

$pdo = getDB();

// 1. Check that course exists and is assigned to this lecturer (Reject if not theirs: 403)
$courseStmt = $pdo->prepare("SELECT course_id, course_code, lecturer_id FROM courses WHERE course_id = :id");
$courseStmt->execute([':id' => $courseId]);
$course = $courseStmt->fetch();

if (!$course) {
    jsonError("Course not found.", 404);
}

if ((int)$course['lecturer_id'] !== (int)$user['user_id']) {
    jsonError("Forbidden. Course not assigned to you.", 403);
}

// 2. Validate all score values first (Reject CA > 30 or Exam > 70 with 422)
foreach ($scoresList as $item) {
    $enrolmentId = intval($item['enrolment_id'] ?? 0);
    if ($enrolmentId <= 0) {
        jsonError("Each score entry must contain a valid enrolment_id.", 422);
    }

    if (!isset($item['ca_score']) || !isset($item['exam_score'])) {
        jsonError("Both CA score and Exam score are required for enrolment {$enrolmentId}.", 422);
    }

    if (!is_numeric($item['ca_score']) || !is_numeric($item['exam_score'])) {
        jsonError("Scores must be numeric values.", 422);
    }

    $ca = floatval($item['ca_score']);
    $exam = floatval($item['exam_score']);

    if ($ca < 0 || $ca > 30) {
        jsonError("CA score must be between 0 and 30. Received: {$ca}.", 422);
    }

    if ($exam < 0 || $exam > 70) {
        jsonError("Exam score must be between 0 and 70. Received: {$exam}.", 422);
    }
}

// 3. Process score submissions inside a transaction
$pdo->beginTransaction();

try {
    $savedCount = 0;
    $ignoredCount = 0;
    $ignoredStudents = [];

    // Prepared statements
    $checkEnrolStmt = $pdo->prepare("
        SELECT e.enrolment_id, e.student_id, e.session, e.semester, e.course_id,
               u.matric_no, CONCAT(u.first_name, ' ', u.surname) AS student_name,
               r.status AS result_status
        FROM enrolments e
        JOIN users u ON e.student_id = u.user_id
        LEFT JOIN results r ON r.student_id = e.student_id AND r.session = e.session AND r.semester = e.semester
        WHERE e.enrolment_id = :enrolment_id
    ");

    $upsertScoreStmt = $pdo->prepare("
        INSERT INTO scores (enrolment_id, ca_score, exam_score, total_score, grade, grade_point, submitted_by, submitted_at)
        VALUES (:enrolment_id, :ca_score, :exam_score, :total_score, :grade, :grade_point, :submitted_by, CURRENT_TIMESTAMP)
        ON DUPLICATE KEY UPDATE
            ca_score     = VALUES(ca_score),
            exam_score   = VALUES(exam_score),
            total_score  = VALUES(total_score),
            grade        = VALUES(grade),
            grade_point  = VALUES(grade_point),
            submitted_by = VALUES(submitted_by),
            submitted_at = CURRENT_TIMESTAMP
    ");

    foreach ($scoresList as $item) {
        $enrolmentId = intval($item['enrolment_id']);
        $ca = floatval($item['ca_score']);
        $exam = floatval($item['exam_score']);

        $checkEnrolStmt->execute([':enrolment_id' => $enrolmentId]);
        $enrol = $checkEnrolStmt->fetch();

        if (!$enrol || (int)$enrol['course_id'] !== $courseId) {
            $pdo->rollBack();
            jsonError("Enrolment ID {$enrolmentId} is not valid for this course.", 422);
        }

        // WORKFLOW GATE: "Ignore edits for any student whose result for that session and semester is already approved."
        if ($enrol['result_status'] === 'approved') {
            $ignoredCount++;
            $ignoredStudents[] = [
                'matric_no'     => $enrol['matric_no'],
                'student_name'  => $enrol['student_name'],
                'reason'        => 'Result for this session and semester is already approved and locked.'
            ];
            continue; // Ignore this update!
        }

        // Compute total, grade, and grade points
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

        $upsertScoreStmt->execute([
            ':enrolment_id' => $enrolmentId,
            ':ca_score'     => $ca,
            ':exam_score'   => $exam,
            ':total_score'  => $total,
            ':grade'        => $grade,
            ':grade_point'  => $gp,
            ':submitted_by' => $user['user_id']
        ]);
        $savedCount++;
    }

    $pdo->commit();

    jsonResponse([
        'message'          => "Score submission processed: {$savedCount} updated, {$ignoredCount} ignored (approved/locked).",
        'saved_count'      => $savedCount,
        'ignored_count'    => $ignoredCount,
        'ignored_students' => $ignoredStudents
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    jsonError("Failed to save scores: " . $e->getMessage(), 500);
}

<?php
// Course Registration Endpoint
require_once __DIR__ . '/../helpers/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError("Method Not Allowed. Use POST.", 405);
}

$user = requireRole('student');
$input = getJsonInput();

$pdo = getDB();
$settings = getSystemSettings($pdo);
$currentSession = $settings['current_session'];
$currentSemester = $settings['current_semester'];

$courseIds = [];
if (isset($input['course_ids']) && is_array($input['course_ids'])) {
    $courseIds = array_map('intval', $input['course_ids']);
} elseif (isset($input['course_id'])) {
    $courseIds = [intval($input['course_id'])];
}

if (empty($courseIds)) {
    jsonError("Please select at least one course to register.", 422);
}

$pdo->beginTransaction();

try {
    $registeredCount = 0;
    $alreadyRegistered = 0;

    $checkCourseStmt = $pdo->prepare("SELECT course_id, course_code, semester FROM courses WHERE course_id = :id");
    $checkEnrolStmt  = $pdo->prepare("SELECT enrolment_id FROM enrolments WHERE student_id = :student_id AND course_id = :course_id AND session = :session");
    $insertStmt      = $pdo->prepare("INSERT INTO enrolments (student_id, course_id, session, semester) VALUES (:student_id, :course_id, :session, :semester)");

    foreach ($courseIds as $cId) {
        $checkCourseStmt->execute([':id' => $cId]);
        $course = $checkCourseStmt->fetch();

        if (!$course) {
            $pdo->rollBack();
            jsonError("Course ID {$cId} does not exist.", 404);
        }

        if ($course['semester'] !== $currentSemester) {
            $pdo->rollBack();
            jsonError("Course {$course['course_code']} is not offered in the current semester ({$currentSemester}).", 422);
        }

        $checkEnrolStmt->execute([
            ':student_id' => $user['user_id'],
            ':course_id'  => $cId,
            ':session'    => $currentSession
        ]);

        if ($checkEnrolStmt->fetch()) {
            $alreadyRegistered++;
            continue;
        }

        $insertStmt->execute([
            ':student_id' => $user['user_id'],
            ':course_id'  => $cId,
            ':session'    => $currentSession,
            ':semester'   => $currentSemester
        ]);
        $registeredCount++;
    }

    $pdo->commit();

    if ($registeredCount === 0 && $alreadyRegistered > 0) {
        jsonError("You are already registered for the selected course(s) in {$currentSession}.", 409);
    }

    jsonResponse([
        'message'            => "Successfully registered for {$registeredCount} course(s).",
        'registered_count'   => $registeredCount,
        'already_registered' => $alreadyRegistered
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    jsonError("Registration failed: " . $e->getMessage(), 500);
}

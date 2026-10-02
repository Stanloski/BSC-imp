<?php
// Admin Courses Management Endpoint (List, Create, Update, Assign Lecturer, Delete)
require_once __DIR__ . '/../helpers/auth.php';

$user = requireRole('admin');
$pdo = getDB();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $sql = "
            SELECT c.course_id, c.course_code, c.course_title, c.credit_units, c.semester, c.level, c.lecturer_id,
                   CONCAT(u.first_name, ' ', u.surname) AS lecturer_name,
                   u.email AS lecturer_email,
                   COUNT(DISTINCT e.enrolment_id) AS total_enrolments
            FROM courses c
            LEFT JOIN users u ON c.lecturer_id = u.user_id
            LEFT JOIN enrolments e ON c.course_id = e.course_id
            GROUP BY c.course_id
            ORDER BY c.course_code ASC
        ";
        $stmt = $pdo->query($sql);
        $courses = $stmt->fetchAll();

        // Also fetch list of available lecturers for easy assignment
        $lecStmt = $pdo->query("SELECT user_id, surname, first_name, email FROM users WHERE role = 'lecturer' ORDER BY surname ASC");
        $lecturers = $lecStmt->fetchAll();

        jsonResponse([
            'courses'   => $courses,
            'lecturers' => $lecturers
        ]);
        break;

    case 'POST':
        $input = getJsonInput();
        $code = strtoupper(trim($input['course_code'] ?? ''));
        $title = trim($input['course_title'] ?? '');
        $units = intval($input['credit_units'] ?? 0);
        $semester = trim($input['semester'] ?? '');
        $level = intval($input['level'] ?? 100);
        $lecturerId = !empty($input['lecturer_id']) ? intval($input['lecturer_id']) : null;

        if (empty($code) || empty($title) || $units <= 0 || empty($semester)) {
            jsonError("Course code, title, positive credit units, and semester are required.", 422);
        }

        if (!in_array($semester, ['First', 'Second'], true)) {
            jsonError("Semester must be either 'First' or 'Second'.", 422);
        }

        // Check if course code exists
        $check = $pdo->prepare("SELECT course_id FROM courses WHERE course_code = :code");
        $check->execute([':code' => $code]);
        if ($check->fetch()) {
            jsonError("A course with code '{$code}' already exists.", 409);
        }

        // Validate lecturer if provided
        if ($lecturerId !== null) {
            $checkLec = $pdo->prepare("SELECT user_id FROM users WHERE user_id = :id AND role = 'lecturer'");
            $checkLec->execute([':id' => $lecturerId]);
            if (!$checkLec->fetch()) {
                jsonError("Specified lecturer ID is invalid or user is not a lecturer.", 422);
            }
        }

        $stmt = $pdo->prepare("
            INSERT INTO courses (course_code, course_title, credit_units, semester, level, lecturer_id)
            VALUES (:code, :title, :units, :semester, :level, :lecturer_id)
        ");
        $stmt->execute([
            ':code'        => $code,
            ':title'       => $title,
            ':units'       => $units,
            ':semester'    => $semester,
            ':level'       => $level,
            ':lecturer_id' => $lecturerId
        ]);

        $newCourseId = (int)$pdo->lastInsertId();
        jsonResponse([
            'message'   => 'Course created successfully',
            'course_id' => $newCourseId
        ], 201);
        break;

    case 'PUT':
        $input = getJsonInput();
        $courseId = intval($input['course_id'] ?? 0);
        if ($courseId <= 0) {
            jsonError("Valid course_id is required.", 422);
        }

        // Check if just assigning lecturer or updating all fields
        if (isset($input['assign_lecturer_only']) && $input['assign_lecturer_only']) {
            $lecturerId = !empty($input['lecturer_id']) ? intval($input['lecturer_id']) : null;
            if ($lecturerId !== null) {
                $checkLec = $pdo->prepare("SELECT user_id FROM users WHERE user_id = :id AND role = 'lecturer'");
                $checkLec->execute([':id' => $lecturerId]);
                if (!$checkLec->fetch()) {
                    jsonError("Specified lecturer is invalid.", 422);
                }
            }

            $stmt = $pdo->prepare("UPDATE courses SET lecturer_id = :lecturer_id WHERE course_id = :id");
            $stmt->execute([':lecturer_id' => $lecturerId, ':id' => $courseId]);
            jsonResponse(['message' => 'Lecturer assigned successfully']);
        }

        $code = strtoupper(trim($input['course_code'] ?? ''));
        $title = trim($input['course_title'] ?? '');
        $units = intval($input['credit_units'] ?? 0);
        $semester = trim($input['semester'] ?? '');
        $level = intval($input['level'] ?? 100);
        $lecturerId = !empty($input['lecturer_id']) ? intval($input['lecturer_id']) : null;

        if (empty($code) || empty($title) || $units <= 0 || empty($semester)) {
            jsonError("Course code, title, positive credit units, and semester cannot be empty.", 422);
        }

        if (!in_array($semester, ['First', 'Second'], true)) {
            jsonError("Semester must be 'First' or 'Second'.", 422);
        }

        // Check course code uniqueness
        $check = $pdo->prepare("SELECT course_id FROM courses WHERE course_code = :code AND course_id != :id");
        $check->execute([':code' => $code, ':id' => $courseId]);
        if ($check->fetch()) {
            jsonError("Another course already uses the code '{$code}'.", 409);
        }

        if ($lecturerId !== null) {
            $checkLec = $pdo->prepare("SELECT user_id FROM users WHERE user_id = :id AND role = 'lecturer'");
            $checkLec->execute([':id' => $lecturerId]);
            if (!$checkLec->fetch()) {
                jsonError("Specified lecturer is invalid.", 422);
            }
        }

        $stmt = $pdo->prepare("
            UPDATE courses 
            SET course_code = :code, course_title = :title, credit_units = :units, semester = :semester, level = :level, lecturer_id = :lecturer_id
            WHERE course_id = :id
        ");
        $stmt->execute([
            ':code'        => $code,
            ':title'       => $title,
            ':units'       => $units,
            ':semester'    => $semester,
            ':level'       => $level,
            ':lecturer_id' => $lecturerId,
            ':id'          => $courseId
        ]);

        jsonResponse(['message' => 'Course updated successfully']);
        break;

    case 'DELETE':
        $input = getJsonInput();
        $courseId = intval($_GET['course_id'] ?? $input['course_id'] ?? 0);
        if ($courseId <= 0) {
            jsonError("Valid course_id is required.", 422);
        }

        $stmt = $pdo->prepare("DELETE FROM courses WHERE course_id = :id");
        $stmt->execute([':id' => $courseId]);

        if ($stmt->rowCount() === 0) {
            jsonError("Course not found.", 404);
        }

        jsonResponse(['message' => 'Course deleted successfully']);
        break;

    default:
        jsonError("Method Not Allowed", 405);
}

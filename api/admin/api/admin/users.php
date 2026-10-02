<?php
// Admin Users Management Endpoint (CRUD)
require_once __DIR__ . '/../helpers/auth.php';

$user = requireRole('admin');
$pdo = getDB();
$method = $_SERVER['REQUEST_METHOD'];

switch ($method) {
    case 'GET':
        $roleFilter = $_GET['role'] ?? '';
        $sql = "SELECT user_id, surname, first_name, email, role, matric_no, created_at FROM users";
        $params = [];
        if (!empty($roleFilter)) {
            $sql .= " WHERE role = :role";
            $params[':role'] = $roleFilter;
        }
        $sql .= " ORDER BY user_id DESC";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $users = $stmt->fetchAll();
        jsonResponse(['users' => $users]);
        break;

    case 'POST':
        $input = getJsonInput();
        $surname = trim($input['surname'] ?? '');
        $firstName = trim($input['first_name'] ?? '');
        $email = trim($input['email'] ?? '');
        $rawPassword = $input['password'] ?? '';
        $role = trim($input['role'] ?? '');
        $matricNo = trim($input['matric_no'] ?? '') ?: null;

        if (empty($surname) || empty($firstName) || empty($email) || empty($rawPassword) || empty($role)) {
            jsonError("All fields (surname, first_name, email, password, role) are required.", 422);
        }

        $validRoles = ['student', 'lecturer', 'exam_officer', 'hod', 'admin'];
        if (!in_array($role, $validRoles, true)) {
            jsonError("Invalid role. Allowed roles: " . implode(', ', $validRoles), 422);
        }

        if ($role === 'student' && empty($matricNo)) {
            jsonError("Matric number is required for students.", 422);
        }

        // Check if email already exists
        $checkStmt = $pdo->prepare("SELECT user_id FROM users WHERE email = :email");
        $checkStmt->execute([':email' => $email]);
        if ($checkStmt->fetch()) {
            jsonError("A user with this email address already exists.", 409);
        }

        // Check matric no unique if provided
        if ($matricNo !== null) {
            $checkMatric = $pdo->prepare("SELECT user_id FROM users WHERE matric_no = :matric_no");
            $checkMatric->execute([':matric_no' => $matricNo]);
            if ($checkMatric->fetch()) {
                jsonError("A student with this matric number already exists.", 409);
            }
        }

        $hashedPassword = password_hash($rawPassword, PASSWORD_BCRYPT);
        $insertStmt = $pdo->prepare("
            INSERT INTO users (surname, first_name, email, password, role, matric_no)
            VALUES (:surname, :first_name, :email, :password, :role, :matric_no)
        ");
        $insertStmt->execute([
            ':surname'    => $surname,
            ':first_name' => $firstName,
            ':email'      => $email,
            ':password'   => $hashedPassword,
            ':role'       => $role,
            ':matric_no'  => $matricNo
        ]);

        $newUserId = (int)$pdo->lastInsertId();
        jsonResponse([
            'message' => 'User created successfully',
            'user'    => [
                'user_id'    => $newUserId,
                'surname'    => $surname,
                'first_name' => $firstName,
                'email'      => $email,
                'role'       => $role,
                'matric_no'  => $matricNo
            ]
        ], 201);
        break;

    case 'PUT':
        $input = getJsonInput();
        $targetUserId = intval($input['user_id'] ?? 0);
        if ($targetUserId <= 0) {
            jsonError("Valid user_id is required.", 422);
        }

        $surname = trim($input['surname'] ?? '');
        $firstName = trim($input['first_name'] ?? '');
        $email = trim($input['email'] ?? '');
        $role = trim($input['role'] ?? '');
        $matricNo = trim($input['matric_no'] ?? '') ?: null;
        $newPassword = $input['password'] ?? '';

        if (empty($surname) || empty($firstName) || empty($email) || empty($role)) {
            jsonError("Surname, first name, email, and role cannot be empty.", 422);
        }

        $validRoles = ['student', 'lecturer', 'exam_officer', 'hod', 'admin'];
        if (!in_array($role, $validRoles, true)) {
            jsonError("Invalid role.", 422);
        }

        // Check if email taken by someone else
        $checkEmail = $pdo->prepare("SELECT user_id FROM users WHERE email = :email AND user_id != :id");
        $checkEmail->execute([':email' => $email, ':id' => $targetUserId]);
        if ($checkEmail->fetch()) {
            jsonError("This email address is already in use by another user.", 409);
        }

        if ($matricNo !== null) {
            $checkMatric = $pdo->prepare("SELECT user_id FROM users WHERE matric_no = :matric_no AND user_id != :id");
            $checkMatric->execute([':matric_no' => $matricNo, ':id' => $targetUserId]);
            if ($checkMatric->fetch()) {
                jsonError("This matric number is already in use by another student.", 409);
            }
        }

        if (!empty($newPassword)) {
            $hashed = password_hash($newPassword, PASSWORD_BCRYPT);
            $stmt = $pdo->prepare("
                UPDATE users 
                SET surname = :surname, first_name = :first_name, email = :email, role = :role, matric_no = :matric_no, password = :password
                WHERE user_id = :id
            ");
            $stmt->execute([
                ':surname'    => $surname,
                ':first_name' => $firstName,
                ':email'      => $email,
                ':role'       => $role,
                ':matric_no'  => $matricNo,
                ':password'   => $hashed,
                ':id'         => $targetUserId
            ]);
        } else {
            $stmt = $pdo->prepare("
                UPDATE users 
                SET surname = :surname, first_name = :first_name, email = :email, role = :role, matric_no = :matric_no
                WHERE user_id = :id
            ");
            $stmt->execute([
                ':surname'    => $surname,
                ':first_name' => $firstName,
                ':email'      => $email,
                ':role'       => $role,
                ':matric_no'  => $matricNo,
                ':id'         => $targetUserId
            ]);
        }

        jsonResponse(['message' => 'User updated successfully']);
        break;

    case 'DELETE':
        $input = getJsonInput();
        $targetUserId = intval($_GET['user_id'] ?? $input['user_id'] ?? 0);

        if ($targetUserId <= 0) {
            jsonError("Valid user_id is required.", 422);
        }

        // Prevent admin from deleting themselves
        if ($targetUserId === (int)$user['user_id']) {
            jsonError("You cannot delete your own account.", 403);
        }

        $stmt = $pdo->prepare("DELETE FROM users WHERE user_id = :id");
        $stmt->execute([':id' => $targetUserId]);

        if ($stmt->rowCount() === 0) {
            jsonError("User not found or already deleted.", 404);
        }

        jsonResponse(['message' => 'User deleted successfully']);
        break;

    default:
        jsonError("Method Not Allowed", 405);
}

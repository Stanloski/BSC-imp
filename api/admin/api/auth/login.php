<?php
// User Login Endpoint
require_once __DIR__ . '/../config/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError("Method Not Allowed. Use POST.", 405);
}

$input = getJsonInput();
$email = trim($input['email'] ?? '');
$password = $input['password'] ?? '';

if (empty($email) || empty($password)) {
    jsonError("Email and password are required.", 422);
}

$pdo = getDB();
$stmt = $pdo->prepare("SELECT user_id, surname, first_name, email, password, role, matric_no FROM users WHERE email = :email LIMIT 1");
$stmt->execute([':email' => $email]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password'])) {
    jsonError("Invalid email or password.", 401);
}

// Regenerate session ID upon successful authentication for security
session_regenerate_id(true);

$safeUser = [
    'user_id'    => (int)$user['user_id'],
    'surname'    => $user['surname'],
    'first_name' => $user['first_name'],
    'name'       => $user['first_name'] . ' ' . $user['surname'],
    'email'      => $user['email'],
    'role'       => $user['role'],
    'matric_no'  => $user['matric_no']
];

$_SESSION['user'] = $safeUser;

jsonResponse([
    'message' => 'Login successful',
    'user'    => $safeUser
]);

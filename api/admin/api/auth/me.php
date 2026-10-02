<?php
// Current Authenticated User Endpoint
require_once __DIR__ . '/../helpers/auth.php';

if (!isset($_SESSION['user']) || empty($_SESSION['user']['user_id'])) {
    jsonError("Not authenticated", 401);
}

// Fetch fresh details from database to keep session in sync with any role/matric changes
$pdo = getDB();
$stmt = $pdo->prepare("SELECT user_id, surname, first_name, email, role, matric_no FROM users WHERE user_id = :id LIMIT 1");
$stmt->execute([':id' => $_SESSION['user']['user_id']]);
$user = $stmt->fetch();

if (!$user) {
    $_SESSION = [];
    session_destroy();
    jsonError("User account no longer exists", 401);
}

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

jsonResponse(['user' => $safeUser]);

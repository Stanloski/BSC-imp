<?php
// Change Password Endpoint (Logged-in users only)
require_once __DIR__ . '/../helpers/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError("Method Not Allowed. Use POST.", 405);
}

$user = requireAuth();
$input = getJsonInput();
$newPassword = $input['new_password'] ?? '';
$confirmPassword = $input['confirm_password'] ?? null;

if (empty($newPassword)) {
    jsonError("New password is required.", 422);
}

// 1. Password must be at least 8 characters
if (strlen($newPassword) < 8) {
    jsonError("Password must be at least 8 characters long.", 422);
}

// 2. Password must include at least one number
if (!preg_match('/[0-9]/', $newPassword)) {
    jsonError("Password must include at least one number.", 422);
}

// 3. Password cannot equal Password123 (case-insensitive)
if (strcasecmp($newPassword, 'Password123') === 0) {
    jsonError("New password cannot be the default seeded password (Password123).", 422);
}

// 4. Confirm password match if supplied
if ($confirmPassword !== null && $newPassword !== $confirmPassword) {
    jsonError("New password and confirm password do not match.", 422);
}

// Hash with standard BCRYPT
$hashed = password_hash($newPassword, PASSWORD_BCRYPT);

$pdo = getDB();
$stmt = $pdo->prepare("UPDATE users SET password = :password, must_change_password = 0 WHERE user_id = :id");
$stmt->execute([
    ':password' => $hashed,
    ':id'       => $user['user_id']
]);

// Update active session state
$_SESSION['user']['must_change_password'] = 0;

jsonResponse([
    'message' => 'Password changed successfully',
    'user'    => $_SESSION['user']
]);

<?php
// User Login Endpoint with Rate Limiting & Account Guessing Protection
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

// Client IP resolution
$ip = $_SERVER['HTTP_X_FORWARDED_FOR'] ?? $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
$ip = trim(explode(',', $ip)[0]);

$pdo = getDB();

// 1. Rate Limiting Check: Block if >= 5 failed attempts in the last 15 minutes for this email or IP
$rateLimitStmt = $pdo->prepare("
    SELECT COUNT(*) as attempt_count, 
           UNIX_TIMESTAMP(MAX(attempted_at)) as last_attempt_ts, 
           UNIX_TIMESTAMP(NOW()) as current_ts
    FROM login_attempts
    WHERE (email = :email OR ip_address = :ip)
      AND attempted_at >= NOW() - INTERVAL 15 MINUTE
");
$rateLimitStmt->execute([':email' => $email, ':ip' => $ip]);
$rateData = $rateLimitStmt->fetch();

$attemptCount = (int)($rateData['attempt_count'] ?? 0);
if ($attemptCount >= 5) {
    $lastAttemptTs = !empty($rateData['last_attempt_ts']) ? (int)$rateData['last_attempt_ts'] : time();
    $currentTs = !empty($rateData['current_ts']) ? (int)$rateData['current_ts'] : time();
    $elapsed = max(0, $currentTs - $lastAttemptTs);
    $retryAfter = max(60, 900 - $elapsed); // 15 minutes = 900 seconds

    header("Retry-After: " . $retryAfter);
    jsonError("Too many attempts. Try again later.", 429, [
        'retry_after' => $retryAfter,
        'lockout'     => true
    ]);
}

// 2. Fetch User by Email
$stmt = $pdo->prepare("
    SELECT user_id, surname, first_name, email, password, role, matric_no, must_change_password
    FROM users 
    WHERE email = :email 
    LIMIT 1
");
$stmt->execute([':email' => $email]);
$user = $stmt->fetch();

// 3. Verify Password
if (!$user || !password_verify($password, $user['password'])) {
    // 500 ms delay on failed logins to thwart timing & brute-force attacks
    usleep(500000);

    // Record failed attempt
    $logStmt = $pdo->prepare("
        INSERT INTO login_attempts (email, ip_address, attempted_at)
        VALUES (:email, :ip, NOW())
    ");
    $logStmt->execute([':email' => $email, ':ip' => $ip]);

    jsonError("Invalid email or password.", 401);
}

// 4. Successful Authentication: Clear failed attempts for this email
$clearStmt = $pdo->prepare("DELETE FROM login_attempts WHERE email = :email");
$clearStmt->execute([':email' => $email]);

// Regenerate session ID upon successful authentication for security
session_regenerate_id(true);

$safeUser = [
    'user_id'              => (int)$user['user_id'],
    'surname'              => $user['surname'],
    'first_name'           => $user['first_name'],
    'name'                 => $user['first_name'] . ' ' . $user['surname'],
    'email'                => $user['email'],
    'role'                 => $user['role'],
    'matric_no'            => $user['matric_no'],
    'must_change_password' => (int)$user['must_change_password']
];

$_SESSION['user'] = $safeUser;
$_SESSION['last_activity'] = time();

jsonResponse([
    'message' => 'Login successful',
    'user'    => $safeUser
]);


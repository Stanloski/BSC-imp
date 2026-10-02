<?php
// CORS, Cache-Control and Session Security Configuration
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_httponly', '1');
    ini_set('session.use_only_cookies', '1');
    session_set_cookie_params([
        'lifetime' => 0, // Session cookie expires when browser session closes
        'path'     => '/',
        'domain'   => '',
        'secure'   => false,
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    session_start();
}

// Enforce Cache-Control on all API responses (prevents BFcache / history back navigation data leakage)
header("Cache-Control: no-store, no-cache, must-revalidate, max-age=0");
header("Pragma: no-cache");
header("Expires: 0");

// Allow CORS from Vite React dev server
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Max-Age: 86400");

// Respond to preflight OPTIONS requests immediately
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Session Idle Timeout: 20 minutes (1200 seconds)
$idleTimeout = 1200;
if (isset($_SESSION['user'])) {
    $currentScript = basename($_SERVER['SCRIPT_NAME'] ?? '');
    $isExempt = in_array($currentScript, ['login.php', 'logout.php']);

    if (isset($_SESSION['last_activity']) && (time() - $_SESSION['last_activity']) > $idleTimeout) {
        $_SESSION = [];
        session_unset();
        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(
                session_name(),
                '',
                time() - 42000,
                $params["path"] ?: '/',
                $params["domain"],
                $params["secure"],
                $params["httponly"]
            );
        }
        session_destroy();

        if (!$isExempt) {
            http_response_code(401);
            header('Content-Type: application/json; charset=utf-8');
            echo json_encode([
                'error' => 'Session expired, please log in again.',
                'session_expired' => true
            ], JSON_UNESCAPED_UNICODE);
            exit;
        }
    } else {
        $_SESSION['last_activity'] = time();
    }
}


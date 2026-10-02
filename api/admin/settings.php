<?php
// Academic Settings Endpoint (current session and semester)
require_once __DIR__ . '/../helpers/auth.php';

$pdo = getDB();
$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    // Authenticated users can view settings
    requireAuth();
    $settings = getSystemSettings($pdo);
    jsonResponse($settings);
}

// Updating settings requires admin role
$user = requireRole('admin');

if ($method === 'POST' || $method === 'PUT') {
    $input = getJsonInput();
    $session = trim($input['current_session'] ?? '');
    $semester = trim($input['current_semester'] ?? '');

    if (empty($session) || empty($semester)) {
        jsonError("Both current_session and current_semester are required.", 422);
    }

    if (!in_array($semester, ['First', 'Second'], true)) {
        jsonError("current_semester must be either 'First' or 'Second'.", 422);
    }

    $stmt = $pdo->prepare("
        INSERT INTO settings (setting_key, setting_value) 
        VALUES (:key, :val) 
        ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
    ");

    $stmt->execute([':key' => 'current_session', ':val' => $session]);
    $stmt->execute([':key' => 'current_semester', ':val' => $semester]);

    jsonResponse([
        'message'          => 'Academic settings updated successfully',
        'current_session'  => $session,
        'current_semester' => $semester
    ]);
}

jsonError("Method Not Allowed", 405);

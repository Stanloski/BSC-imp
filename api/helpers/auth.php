<?php
// Authentication & Role Enforcement Helper
require_once __DIR__ . '/../config/db.php';

function requireAuth(): array {
    if (!isset($_SESSION['user']) || empty($_SESSION['user']['user_id'])) {
        jsonError("Unauthorized. Please log in to continue.", 401);
    }
    return $_SESSION['user'];
}

function requireRole($allowedRoles): array {
    $user = requireAuth();

    if (!empty($user['must_change_password'])) {
        jsonError("Password change required before accessing system resources.", 403, [
            'must_change_password' => true
        ]);
    }

    $roles = is_array($allowedRoles) ? $allowedRoles : [$allowedRoles];

    if (!in_array($user['role'], $roles, true)) {
        jsonError("Forbidden. Access denied for role: " . $user['role'], 403);
    }

    return $user;
}

function getCurrentUser(): ?array {
    return $_SESSION['user'] ?? null;
}

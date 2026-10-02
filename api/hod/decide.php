<?php
// HOD Decision Endpoint (Approve / Reject single or multiple results)
require_once __DIR__ . '/../helpers/auth.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonError("Method Not Allowed. Use POST.", 405);
}

$user = requireRole('hod');
$input = getJsonInput();

$decision = trim($input['decision'] ?? '');
$comments = trim($input['comments'] ?? '');
$resultIds = $input['result_ids'] ?? [];

// If a single result_id was passed, wrap it in an array
if (isset($input['result_id']) && empty($resultIds)) {
    $resultIds = [intval($input['result_id'])];
}

// 1. Validate Decision
if (!in_array($decision, ['approved', 'rejected'], true)) {
    jsonError("Invalid decision. Allowed values are 'approved' or 'rejected'.", 422);
}

// 2. Validate Result IDs
if (!is_array($resultIds) || empty($resultIds)) {
    jsonError("Please select at least one result to " . $decision . ".", 422);
}

// 3. WORKFLOW GATE: "Rejection requires a comment."
// TEST REQUIREMENT: "HOD rejecting with no comment (refused)"
if ($decision === 'rejected' && empty($comments)) {
    jsonError("Rejection requires a comment explaining the reason.", 422);
}

$pdo = getDB();
$pdo->beginTransaction();

try {
    $updateResultStmt = $pdo->prepare("UPDATE results SET status = :status WHERE result_id = :id");
    $insertApprovalStmt = $pdo->prepare("
        INSERT INTO approval_records (result_id, approved_by, decision, comments, decided_at)
        VALUES (:result_id, :approved_by, :decision, :comments, CURRENT_TIMESTAMP)
    ");

    $processedCount = 0;

    foreach ($resultIds as $rId) {
        $id = intval($rId);
        if ($id <= 0) continue;

        // Verify result exists
        $checkStmt = $pdo->prepare("SELECT result_id, status FROM results WHERE result_id = :id");
        $checkStmt->execute([':id' => $id]);
        $existing = $checkStmt->fetch();

        if (!$existing) {
            $pdo->rollBack();
            jsonError("Result ID {$id} not found.", 404);
        }

        // Update status in results table
        $updateResultStmt->execute([
            ':status' => $decision,
            ':id'     => $id
        ]);

        // Insert audit log in approval_records table
        $insertApprovalStmt->execute([
            ':result_id'   => $id,
            ':approved_by' => $user['user_id'],
            ':decision'    => $decision,
            ':comments'    => !empty($comments) ? $comments : null
        ]);

        $processedCount++;
    }

    $pdo->commit();

    jsonResponse([
        'message'         => "Successfully {$decision} {$processedCount} result(s).",
        'decision'        => $decision,
        'processed_count' => $processedCount
    ]);

} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    jsonError("Failed to record decision: " . $e->getMessage(), 500);
}

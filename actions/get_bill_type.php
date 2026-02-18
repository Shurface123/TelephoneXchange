<?php
session_start();
require_once '../config/database.php';
require_once '../includes/functions.php';

// Check authentication
if (!isLoggedIn()) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$bill_type_id = (int)($_GET['id'] ?? 0);

if ($bill_type_id === 0) {
    echo json_encode(['success' => false, 'message' => 'Invalid bill type ID']);
    exit;
}

try {
    $bill_type = fetchOne($db, "SELECT * FROM bill_types WHERE id = ?", [$bill_type_id]);

    if (!$bill_type) {
        echo json_encode(['success' => false, 'message' => 'Bill type not found']);
        exit;
    }

    echo json_encode([
        'success' => true,
        'bill_type' => $bill_type
    ]);

} catch (PDOException $e) {
    error_log("Get bill type error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Database error occurred']);
}
?>

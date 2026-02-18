<?php
session_start();
require_once '../config/database.php';
require_once '../includes/functions.php';

// Check authentication
if (!isLoggedIn()) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$department_id = (int)($_GET['department_id'] ?? 0);

if ($department_id === 0) {
    echo json_encode([]);
    exit;
}

try {
    $staff = fetchAll($db, "
        SELECT e.id, e.first_name, e.last_name, e.position, e.extension
        FROM employees e
        WHERE e.department_id = ? AND e.is_active = 1
        ORDER BY e.first_name, e.last_name
    ", [$department_id]);

    header('Content-Type: application/json');
    echo json_encode($staff);

} catch (PDOException $e) {
    error_log("Get department staff error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Database error']);
}
?>

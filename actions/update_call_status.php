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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $call_id = (int)($_POST['call_id'] ?? 0);
    $status = sanitizeInput($_POST['status'] ?? '');

    // Validate input
    if ($call_id === 0 || empty($status)) {
        echo json_encode(['success' => false, 'message' => 'Invalid parameters']);
        exit;
    }

    // Validate status
    $valid_statuses = ['pending', 'connected', 'completed', 'missed', 'transferred', 'cancelled'];
    if (!in_array($status, $valid_statuses)) {
        echo json_encode(['success' => false, 'message' => 'Invalid status']);
        exit;
    }

    // Get current call info
    $call = fetchOne($db, "SELECT * FROM calls WHERE id = ?", [$call_id]);
    if (!$call) {
        echo json_encode(['success' => false, 'message' => 'Call not found']);
        exit;
    }

    // Update call status
    $update_fields = ['call_status = ?'];
    $update_params = [$status];

    // Set end time for completed calls
    if ($status === 'completed' && $call['call_status'] !== 'completed') {
        $update_fields[] = 'end_time = NOW()';
        
        // Calculate duration if start_time exists
        if ($call['start_time']) {
            $update_fields[] = 'duration_seconds = TIMESTAMPDIFF(SECOND, start_time, NOW())';
        }
    }

    // Set start time for connected calls
    if ($status === 'connected' && $call['call_status'] === 'pending') {
        $update_fields[] = 'start_time = NOW()';
    }

    $update_params[] = $call_id;
    $update_query = "UPDATE calls SET " . implode(', ', $update_fields) . " WHERE id = ?";
    
    executeQuery($db, $update_query, $update_params);

    echo json_encode([
        'success' => true,
        'message' => 'Call status updated successfully'
    ]);

} catch (PDOException $e) {
    error_log("Update call status error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Database error occurred']);
} catch (Exception $e) {
    error_log("Update call status error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'An error occurred while updating call status']);
}
?>

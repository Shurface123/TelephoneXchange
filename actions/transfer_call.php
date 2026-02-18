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

// Check role
if (!hasRole('receptionist') && !hasRole('admin')) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Access denied']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $call_id = (int)($_POST['call_id'] ?? 0);
    $department_id = (int)($_POST['department_id'] ?? 0);
    $employee_id = !empty($_POST['employee_id']) ? (int)$_POST['employee_id'] : null;
    $transfer_reason = sanitizeInput($_POST['transfer_reason'] ?? '');
    $transfer_notes = sanitizeInput($_POST['transfer_notes'] ?? '');

    // Validate input
    if ($call_id === 0 || $department_id === 0) {
        echo json_encode(['success' => false, 'message' => 'Invalid parameters']);
        exit;
    }

    // Get current call info
    $call = fetchOne($db, "SELECT * FROM calls WHERE id = ?", [$call_id]);
    if (!$call) {
        echo json_encode(['success' => false, 'message' => 'Call not found']);
        exit;
    }

    // Check if call can be transferred
    if (!in_array($call['call_status'], ['pending', 'connected'])) {
        echo json_encode(['success' => false, 'message' => 'Call cannot be transferred in its current status']);
        exit;
    }

    // Start transaction
    $db->beginTransaction();

    // Record the transfer
    $transfer_query = "INSERT INTO call_transfers (
        call_id, from_department_id, from_employee_id, to_department_id, 
        to_employee_id, transfer_reason, transfer_notes, transferred_by, transfer_time
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())";

    executeQuery($db, $transfer_query, [
        $call_id, $call['department_id'], $call['employee_id'], 
        $department_id, $employee_id, $transfer_reason, $transfer_notes, $_SESSION['user_id']
    ]);

    // Update call assignment
    $update_query = "UPDATE calls SET 
        department_id = ?, 
        employee_id = ?, 
        call_status = ?, 
        transfer_count = transfer_count + 1,
        updated_at = NOW()
        WHERE id = ?";

    $new_status = $employee_id ? 'connected' : 'pending';
    executeQuery($db, $update_query, [$department_id, $employee_id, $new_status, $call_id]);

    // Commit transaction
    $db->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Call transferred successfully'
    ]);

} catch (PDOException $e) {
    // Rollback transaction
    if ($db->inTransaction()) {
        $db->rollback();
    }
    
    error_log("Transfer call error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Database error occurred']);
} catch (Exception $e) {
    // Rollback transaction
    if ($db->inTransaction()) {
        $db->rollback();
    }
    
    error_log("Transfer call error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'An error occurred while transferring the call']);
}
?>

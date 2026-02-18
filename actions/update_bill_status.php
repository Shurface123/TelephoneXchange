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
if (!hasRole('admin') && !hasRole('receptionist')) {
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
    $bill_id = (int)($_POST['bill_id'] ?? 0);
    $status = sanitizeInput($_POST['status'] ?? '');
    $payment_date = $_POST['payment_date'] ?? null;
    $payment_method = sanitizeInput($_POST['payment_method'] ?? '');
    $payment_reference = sanitizeInput($_POST['payment_reference'] ?? '');

    // Validate input
    if ($bill_id === 0 || empty($status)) {
        echo json_encode(['success' => false, 'message' => 'Invalid parameters']);
        exit;
    }

    // Validate status
    $valid_statuses = ['draft', 'pending', 'sent', 'paid', 'overdue', 'cancelled'];
    if (!in_array($status, $valid_statuses)) {
        echo json_encode(['success' => false, 'message' => 'Invalid status']);
        exit;
    }

    // Get current bill info
    $bill = fetchOne($db, "SELECT * FROM bills WHERE id = ?", [$bill_id]);
    if (!$bill) {
        echo json_encode(['success' => false, 'message' => 'Bill not found']);
        exit;
    }

    // Update bill status
    $update_fields = ['bill_status = ?'];
    $update_params = [$status];

    // Set payment details for paid status
    if ($status === 'paid') {
        if ($payment_date) {
            $update_fields[] = 'paid_date = ?';
            $update_params[] = $payment_date;
        } else {
            $update_fields[] = 'paid_date = CURDATE()';
        }
        
        if ($payment_method) {
            $update_fields[] = 'payment_method = ?';
            $update_params[] = $payment_method;
        }
        
        if ($payment_reference) {
            $update_fields[] = 'payment_reference = ?';
            $update_params[] = $payment_reference;
        }
    }

    $update_fields[] = 'updated_at = NOW()';
    $update_params[] = $bill_id;

    $update_query = "UPDATE bills SET " . implode(', ', $update_fields) . " WHERE id = ?";
    executeQuery($db, $update_query, $update_params);

    echo json_encode([
        'success' => true,
        'message' => 'Bill status updated successfully'
    ]);

} catch (PDOException $e) {
    error_log("Update bill status error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Database error occurred']);
} catch (Exception $e) {
    error_log("Update bill status error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'An error occurred while updating bill status']);
}
?>

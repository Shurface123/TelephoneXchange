<?php
session_start();
require_once '../includes/functions.php';
require_once '../config/database.php';

requireLogin();

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => 'Invalid request method']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    $fault_id = (int)$input['fault_id'];
    $status = trim($input['status']);
    $assigned_to = isset($input['assigned_to']) ? (int)$input['assigned_to'] : null;
    $resolution_notes = isset($input['resolution_notes']) ? trim($input['resolution_notes']) : '';
    
    // Validate required fields
    if (!$fault_id || empty($status)) {
        throw new Exception('Fault ID and status are required');
    }
    
    // Validate status
    $valid_statuses = ['open', 'in_progress', 'resolved', 'closed'];
    if (!in_array($status, $valid_statuses)) {
        throw new Exception('Invalid status');
    }
    
    // Check if user has permission to update faults
    if (!hasRole('admin') && !hasRole('technician')) {
        throw new Exception('Insufficient permissions');
    }
    
    // Get current fault details
    $current_query = "SELECT * FROM fault_reporting WHERE id = ?";
    $current_stmt = mysqli_prepare($conn, $current_query);
    mysqli_stmt_bind_param($current_stmt, "i", $fault_id);
    mysqli_stmt_execute($current_stmt);
    $current_result = mysqli_stmt_get_result($current_stmt);
    $current_fault = mysqli_fetch_assoc($current_result);
    
    if (!$current_fault) {
        throw new Exception('Fault not found');
    }
    
    // Build update query
    $update_fields = ['status = ?'];
    $params = [$status];
    $param_types = 's';
    
    if ($assigned_to) {
        $update_fields[] = 'assigned_to = ?';
        $params[] = $assigned_to;
        $param_types .= 'i';
    }
    
    if ($resolution_notes) {
        $update_fields[] = 'resolution_notes = ?';
        $params[] = $resolution_notes;
        $param_types .= 's';
    }
    
    if ($status === 'resolved' || $status === 'closed') {
        $update_fields[] = 'resolved_at = NOW()';
    }
    
    $update_fields[] = 'updated_at = NOW()';
    $params[] = $fault_id;
    $param_types .= 'i';
    
    $query = "UPDATE fault_reporting SET " . implode(', ', $update_fields) . " WHERE id = ?";
    
    $stmt = mysqli_prepare($conn, $query);
    mysqli_stmt_bind_param($stmt, $param_types, ...$params);
    
    if (mysqli_stmt_execute($stmt)) {
        // Log the activity
        $user_id = $_SESSION['user_id'];
        $activity_desc = "Updated fault #$fault_id status from '{$current_fault['status']}' to '$status'";
        logActivity($conn, $user_id, 'fault_updated', $activity_desc);
        
        echo json_encode([
            'success' => true,
            'message' => 'Fault status updated successfully'
        ]);
    } else {
        throw new Exception('Failed to update fault status: ' . mysqli_error($conn));
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>

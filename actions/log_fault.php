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
    $equipment_type = trim($_POST['equipment_type']);
    $fault_description = trim($_POST['fault_description']);
    $priority = trim($_POST['priority']);
    $location = trim($_POST['location']);
    $reported_by = $_SESSION['user_id'];
    
    // Validate required fields
    if (empty($equipment_type) || empty($fault_description) || empty($priority) || empty($location)) {
        throw new Exception('All fields are required');
    }
    
    // Validate priority
    $valid_priorities = ['low', 'medium', 'high', 'critical'];
    if (!in_array($priority, $valid_priorities)) {
        throw new Exception('Invalid priority level');
    }
    
    // Insert fault report
    $query = "INSERT INTO fault_reporting (equipment_type, fault_description, priority, location, 
                                         reported_by, status, created_at) 
              VALUES (?, ?, ?, ?, ?, 'open', NOW())";
    
    $stmt = mysqli_prepare($conn, $query);
    mysqli_stmt_bind_param($stmt, "ssssi", $equipment_type, $fault_description, $priority, $location, $reported_by);
    
    if (mysqli_stmt_execute($stmt)) {
        $fault_id = mysqli_insert_id($conn);
        
        // Log the activity
        logActivity($conn, $reported_by, 'fault_reported', "Reported fault #$fault_id: $equipment_type");
        
        echo json_encode([
            'success' => true,
            'message' => 'Fault reported successfully',
            'fault_id' => $fault_id
        ]);
    } else {
        throw new Exception('Failed to report fault: ' . mysqli_error($conn));
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>

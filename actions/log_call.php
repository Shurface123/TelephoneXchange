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
    // Sanitize and validate input
    $caller_name = sanitizeInput($_POST['caller_name'] ?? '');
    $caller_phone = sanitizeInput($_POST['caller_phone'] ?? '');
    $caller_company = sanitizeInput($_POST['caller_company'] ?? '');
    $call_type_id = (int)($_POST['call_type_id'] ?? 0);
    $department_id = (int)($_POST['department_id'] ?? 0);
    $employee_id = !empty($_POST['employee_id']) ? (int)$_POST['employee_id'] : null;
    $priority = sanitizeInput($_POST['priority'] ?? 'medium');
    $call_reason = sanitizeInput($_POST['call_reason'] ?? '');
    $call_notes = sanitizeInput($_POST['call_notes'] ?? '');
    $follow_up_required = isset($_POST['follow_up_required']) ? 1 : 0;
    $follow_up_date = !empty($_POST['follow_up_date']) ? $_POST['follow_up_date'] : null;

    // Validate required fields
    if (empty($caller_name) || empty($caller_phone) || empty($call_reason) || $call_type_id === 0 || $department_id === 0) {
        echo json_encode(['success' => false, 'message' => 'Please fill in all required fields']);
        exit;
    }

    // Validate priority
    if (!in_array($priority, ['low', 'medium', 'high', 'urgent'])) {
        $priority = 'medium';
    }

    // Start transaction
    $db->beginTransaction();

    // Check if contact exists, if not create one
    $contact_id = null;
    $existing_contact = fetchOne($db, "SELECT id FROM contacts WHERE phone = ?", [$caller_phone]);
    
    if ($existing_contact) {
        $contact_id = $existing_contact['id'];
        // Update contact info if provided
        if (!empty($caller_company)) {
            executeQuery($db, "UPDATE contacts SET name = ?, company = ?, updated_at = NOW() WHERE id = ?", 
                        [$caller_name, $caller_company, $contact_id]);
        }
    } else {
        // Create new contact
        $contact_query = "INSERT INTO contacts (name, phone, company, contact_type, created_at) VALUES (?, ?, ?, 'individual', NOW())";
        $contact_stmt = executeQuery($db, $contact_query, [$caller_name, $caller_phone, $caller_company]);
        $contact_id = $db->lastInsertId();
    }

    // Generate call reference
    $call_reference = 'CALL' . date('Ymd') . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);

    // Insert call record
    $call_query = "INSERT INTO calls (
        call_reference, contact_id, caller_name, caller_phone, call_type_id, 
        department_id, employee_id, call_reason, call_notes, call_status, 
        priority, follow_up_required, follow_up_date, recorded_by, 
        start_time, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, NOW(), NOW())";

    $call_params = [
        $call_reference, $contact_id, $caller_name, $caller_phone, $call_type_id,
        $department_id, $employee_id, $call_reason, $call_notes, $priority,
        $follow_up_required, $follow_up_date, $_SESSION['user_id']
    ];

    $call_stmt = executeQuery($db, $call_query, $call_params);
    $call_id = $db->lastInsertId();

    // If specific employee is assigned, update call status to connected
    if ($employee_id) {
        executeQuery($db, "UPDATE calls SET call_status = 'connected', start_time = NOW() WHERE id = ?", [$call_id]);
    }

    // Commit transaction
    $db->commit();

    // Return success response
    echo json_encode([
        'success' => true,
        'message' => 'Call logged successfully',
        'call_id' => $call_id,
        'call_reference' => $call_reference,
        'reload' => true
    ]);

} catch (PDOException $e) {
    // Rollback transaction
    if ($db->inTransaction()) {
        $db->rollback();
    }
    
    error_log("Call logging error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Database error occurred']);
} catch (Exception $e) {
    // Rollback transaction
    if ($db->inTransaction()) {
        $db->rollback();
    }
    
    error_log("Call logging error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'An error occurred while logging the call']);
}
?>

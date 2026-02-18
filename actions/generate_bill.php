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
if (!hasRole('admin')) {
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
    $account_name = sanitizeInput($_POST['account_name'] ?? '');
    $account_number = sanitizeInput($_POST['account_number'] ?? '');
    $bill_type_id = (int)($_POST['bill_type_id'] ?? 0);
    $department_id = !empty($_POST['department_id']) ? (int)$_POST['department_id'] : null;
    $billing_period_start = $_POST['billing_period_start'] ?? '';
    $billing_period_end = $_POST['billing_period_end'] ?? '';
    $due_date = $_POST['due_date'] ?? '';
    $tax_rate = (float)($_POST['tax_rate'] ?? 12.5);
    $notes = sanitizeInput($_POST['notes'] ?? '');
    $auto_calculate = isset($_POST['auto_calculate']);

    // Validate required fields
    if (empty($account_name) || $bill_type_id === 0 || empty($billing_period_start) || empty($billing_period_end)) {
        echo json_encode(['success' => false, 'message' => 'Please fill in all required fields']);
        exit;
    }

    // Validate dates
    if (strtotime($billing_period_start) >= strtotime($billing_period_end)) {
        echo json_encode(['success' => false, 'message' => 'End date must be after start date']);
        exit;
    }

    // Start transaction
    $db->beginTransaction();

    // Generate invoice number
    $invoice_number = generateInvoiceNumber();

    // Calculate bill amounts if auto_calculate is enabled
    $total_calls = 0;
    $total_duration = 0;
    $subtotal = 0;

    if ($auto_calculate) {
        // Get calls for the billing period
        $calls_query = "
            SELECT c.*, ct.rate_per_minute, ct.billing_unit, ct.is_billable
            FROM calls c
            JOIN call_types ct ON c.call_type_id = ct.id
            WHERE c.call_status = 'completed'
            AND DATE(c.created_at) BETWEEN ? AND ?
            AND ct.is_billable = 1
        ";
        
        $calls_params = [$billing_period_start, $billing_period_end];
        
        if ($department_id) {
            $calls_query .= " AND c.department_id = ?";
            $calls_params[] = $department_id;
        }

        $billable_calls = fetchAll($db, $calls_query, $calls_params);

        foreach ($billable_calls as $call) {
            $total_calls++;
            $total_duration += $call['duration_seconds'];

            // Calculate charge based on billing unit
            if ($call['billing_unit'] === 'minute') {
                $minutes = ceil($call['duration_seconds'] / 60);
                $charge = $minutes * $call['rate_per_minute'];
            } elseif ($call['billing_unit'] === 'second') {
                $charge = $call['duration_seconds'] * ($call['rate_per_minute'] / 60);
            } else { // per call
                $charge = $call['rate_per_minute'];
            }

            $subtotal += $charge;
        }
    }

    // Calculate tax and total
    $tax_amount = $subtotal * ($tax_rate / 100);
    $total_amount = $subtotal + $tax_amount;

    // Insert bill record
    $bill_query = "INSERT INTO bills (
        invoice_number, account_name, account_number, bill_type_id, department_id,
        billing_period_start, billing_period_end, total_calls, total_duration_seconds,
        subtotal, tax_amount, total_amount, currency, bill_status, due_date,
        notes, generated_by, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'GHS', 'draft', ?, ?, ?, NOW())";

    $bill_params = [
        $invoice_number, $account_name, $account_number, $bill_type_id, $department_id,
        $billing_period_start, $billing_period_end, $total_calls, $total_duration,
        $subtotal, $tax_amount, $total_amount, $due_date, $notes, $_SESSION['user_id']
    ];

    executeQuery($db, $bill_query, $bill_params);
    $bill_id = $db->lastInsertId();

    // Insert bill items if auto_calculate is enabled
    if ($auto_calculate && !empty($billable_calls)) {
        // Group calls by type for bill items
        $call_types_summary = [];
        
        foreach ($billable_calls as $call) {
            $type_id = $call['call_type_id'];
            
            if (!isset($call_types_summary[$type_id])) {
                $call_types_summary[$type_id] = [
                    'type_name' => $call['type_name'] ?? 'Unknown',
                    'rate_per_minute' => $call['rate_per_minute'],
                    'billing_unit' => $call['billing_unit'],
                    'quantity' => 0,
                    'total_duration' => 0,
                    'total_price' => 0
                ];
            }

            $call_types_summary[$type_id]['quantity']++;
            $call_types_summary[$type_id]['total_duration'] += $call['duration_seconds'];

            // Calculate price for this call
            if ($call['billing_unit'] === 'minute') {
                $minutes = ceil($call['duration_seconds'] / 60);
                $price = $minutes * $call['rate_per_minute'];
            } elseif ($call['billing_unit'] === 'second') {
                $price = $call['duration_seconds'] * ($call['rate_per_minute'] / 60);
            } else {
                $price = $call['rate_per_minute'];
            }

            $call_types_summary[$type_id]['total_price'] += $price;
        }

        // Insert bill items
        foreach ($call_types_summary as $type_id => $summary) {
            $description = $summary['type_name'] . ' - ' . $summary['quantity'] . ' calls';
            if ($summary['billing_unit'] !== 'call') {
                $description .= ' (' . formatDuration($summary['total_duration']) . ' total)';
            }

            $item_query = "INSERT INTO bill_items (
                bill_id, call_type_id, description, quantity, unit_price, total_price
            ) VALUES (?, ?, ?, ?, ?, ?)";

            executeQuery($db, $item_query, [
                $bill_id, $type_id, $description, $summary['quantity'],
                $summary['rate_per_minute'], $summary['total_price']
            ]);
        }
    }

    // Commit transaction
    $db->commit();

    echo json_encode([
        'success' => true,
        'message' => 'Bill generated successfully',
        'bill_id' => $bill_id,
        'invoice_number' => $invoice_number,
        'reload' => true
    ]);

} catch (PDOException $e) {
    // Rollback transaction
    if ($db->inTransaction()) {
        $db->rollback();
    }
    
    error_log("Generate bill error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Database error occurred']);
} catch (Exception $e) {
    // Rollback transaction
    if ($db->inTransaction()) {
        $db->rollback();
    }
    
    error_log("Generate bill error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'An error occurred while generating the bill']);
}
?>

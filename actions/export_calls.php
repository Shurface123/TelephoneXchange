<?php
session_start();
require_once '../config/database.php';
require_once '../includes/functions.php';

// Check authentication
if (!isLoggedIn()) {
    http_response_code(401);
    exit('Unauthorized');
}

// Get filter parameters (same as calls.php)
$status_filter = $_GET['status'] ?? '';
$department_filter = $_GET['department'] ?? '';
$date_from = $_GET['date_from'] ?? '';
$date_to = $_GET['date_to'] ?? '';
$search = $_GET['search'] ?? '';

// Build WHERE clause
$where_conditions = [];
$params = [];

if (!empty($status_filter)) {
    $where_conditions[] = "c.call_status = ?";
    $params[] = $status_filter;
}

if (!empty($department_filter)) {
    $where_conditions[] = "c.department_id = ?";
    $params[] = $department_filter;
}

if (!empty($date_from)) {
    $where_conditions[] = "DATE(c.created_at) >= ?";
    $params[] = $date_from;
}

if (!empty($date_to)) {
    $where_conditions[] = "DATE(c.created_at) <= ?";
    $params[] = $date_to;
}

if (!empty($search)) {
    $where_conditions[] = "(c.caller_name LIKE ? OR c.caller_phone LIKE ? OR c.call_reason LIKE ?)";
    $search_param = "%{$search}%";
    $params[] = $search_param;
    $params[] = $search_param;
    $params[] = $search_param;
}

$where_clause = !empty($where_conditions) ? 'WHERE ' . implode(' AND ', $where_conditions) : '';

try {
    // Get calls for export
    $calls_query = "
        SELECT c.call_reference, c.caller_name, c.caller_phone, c.call_reason, c.call_notes,
               c.call_status, c.priority, c.duration_seconds, c.created_at, c.start_time, c.end_time,
               d.department_name, ct.type_name as call_type,
               CONCAT(e.first_name, ' ', e.last_name) as assigned_employee,
               CONCAT(u.first_name, ' ', u.last_name) as recorded_by_name,
               c.follow_up_required, c.follow_up_date
        FROM calls c
        LEFT JOIN departments d ON c.department_id = d.id
        LEFT JOIN call_types ct ON c.call_type_id = ct.id
        LEFT JOIN employees e ON c.employee_id = e.id
        LEFT JOIN users u ON c.recorded_by = u.id
        {$where_clause}
        ORDER BY c.created_at DESC
    ";

    $calls = fetchAll($db, $calls_query, $params);

    // Set headers for CSV download
    $filename = 'calls_export_' . date('Y-m-d_H-i-s') . '.csv';
    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="' . $filename . '"');
    header('Cache-Control: no-cache, must-revalidate');
    header('Expires: Sat, 26 Jul 1997 05:00:00 GMT');

    // Open output stream
    $output = fopen('php://output', 'w');

    // Write CSV header
    fputcsv($output, [
        'Reference',
        'Caller Name',
        'Phone',
        'Department',
        'Call Type',
        'Assigned Employee',
        'Status',
        'Priority',
        'Duration',
        'Created Date',
        'Start Time',
        'End Time',
        'Reason',
        'Notes',
        'Follow-up Required',
        'Follow-up Date',
        'Recorded By'
    ]);

    // Write data rows
    foreach ($calls as $call) {
        fputcsv($output, [
            $call['call_reference'],
            $call['caller_name'],
            $call['caller_phone'],
            $call['department_name'] ?? 'Unassigned',
            $call['call_type'] ?? 'N/A',
            $call['assigned_employee'] ?? 'Unassigned',
            ucfirst($call['call_status']),
            ucfirst($call['priority']),
            $call['duration_seconds'] > 0 ? formatDuration($call['duration_seconds']) : '0:00:00',
            date('Y-m-d H:i:s', strtotime($call['created_at'])),
            $call['start_time'] ? date('Y-m-d H:i:s', strtotime($call['start_time'])) : '',
            $call['end_time'] ? date('Y-m-d H:i:s', strtotime($call['end_time'])) : '',
            $call['call_reason'],
            $call['call_notes'] ?? '',
            $call['follow_up_required'] ? 'Yes' : 'No',
            $call['follow_up_date'] ?? '',
            $call['recorded_by_name']
        ]);
    }

    fclose($output);

} catch (PDOException $e) {
    error_log("Export calls error: " . $e->getMessage());
    http_response_code(500);
    exit('Database error occurred');
} catch (Exception $e) {
    error_log("Export calls error: " . $e->getMessage());
    http_response_code(500);
    exit('An error occurred while exporting calls');
}
?>

<?php
session_start();
require_once '../includes/functions.php';
require_once '../config/database.php';

requireLogin();

$report_type = $_GET['report_type'] ?? 'calls';
$date_from = $_GET['date_from'] ?? date('Y-m-01');
$date_to = $_GET['date_to'] ?? date('Y-m-d');
$department_id = $_GET['department_id'] ?? '';
$format = $_GET['format'] ?? 'csv';

// Set headers for download
if ($format === 'csv') {
    header('Content-Type: text/csv');
    header('Content-Disposition: attachment; filename="' . $report_type . '_report_' . date('Y-m-d') . '.csv"');
} else {
    header('Content-Type: application/vnd.ms-excel');
    header('Content-Disposition: attachment; filename="' . $report_type . '_report_' . date('Y-m-d') . '.xls"');
}

$output = fopen('php://output', 'w');

try {
    if ($report_type === 'calls') {
        // Export call data
        fputcsv($output, ['Call ID', 'Date', 'Caller Name', 'Phone', 'Department', 'Status', 'Duration', 'Notes']);
        
        $query = "SELECT c.id, c.call_date, c.caller_name, c.caller_phone, d.name as department, 
                         c.status, c.duration, c.notes
                  FROM calls c
                  LEFT JOIN departments d ON c.department_id = d.id
                  WHERE DATE(c.call_date) BETWEEN ? AND ?";
        
        $params = [$date_from, $date_to];
        
        if ($department_id) {
            $query .= " AND c.department_id = ?";
            $params[] = $department_id;
        }
        
        $query .= " ORDER BY c.call_date DESC";
        
        $stmt = mysqli_prepare($conn, $query);
        
        if ($department_id) {
            mysqli_stmt_bind_param($stmt, "ssi", $date_from, $date_to, $department_id);
        } else {
            mysqli_stmt_bind_param($stmt, "ss", $date_from, $date_to);
        }
        
        mysqli_stmt_execute($stmt);
        $result = mysqli_stmt_get_result($stmt);
        
        while ($row = mysqli_fetch_assoc($result)) {
            fputcsv($output, [
                $row['id'],
                $row['call_date'],
                $row['caller_name'],
                $row['caller_phone'],
                $row['department'],
                $row['status'],
                $row['duration'] . ' min',
                $row['notes']
            ]);
        }
        
    } elseif ($report_type === 'billing') {
        // Export billing data
        fputcsv($output, ['Bill ID', 'Account Name', 'Account Number', 'Bill Date', 'Period', 'Amount', 'Status']);
        
        $query = "SELECT b.id, b.account_name, b.account_number, b.bill_date, 
                         bt.name as period, b.total_amount, b.status
                  FROM bills b
                  LEFT JOIN bill_types bt ON b.bill_type_id = bt.id
                  WHERE DATE(b.bill_date) BETWEEN ? AND ?
                  ORDER BY b.bill_date DESC";
        
        $stmt = mysqli_prepare($conn, $query);
        mysqli_stmt_bind_param($stmt, "ss", $date_from, $date_to);
        mysqli_stmt_execute($stmt);
        $result = mysqli_stmt_get_result($stmt);
        
        while ($row = mysqli_fetch_assoc($result)) {
            fputcsv($output, [
                $row['id'],
                $row['account_name'],
                $row['account_number'],
                $row['bill_date'],
                $row['period'],
                'GH₵' . number_format($row['total_amount'], 2),
                ucfirst($row['status'])
            ]);
        }
    }
    
} catch (Exception $e) {
    fputcsv($output, ['Error: ' . $e->getMessage()]);
}

fclose($output);
?>

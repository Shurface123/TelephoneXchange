<?php
session_start();
require_once '../includes/functions.php';
require_once '../config/database.php';

requireLogin();

header('Content-Type: application/json');

$date_from = $_GET['date_from'] ?? date('Y-m-01');
$date_to = $_GET['date_to'] ?? date('Y-m-d');

try {
    // Get daily revenue data
    $query = "SELECT DATE(bill_date) as bill_date, SUM(total_amount) as revenue 
              FROM bills 
              WHERE DATE(bill_date) BETWEEN ? AND ?
              GROUP BY DATE(bill_date) 
              ORDER BY bill_date";
    
    $stmt = mysqli_prepare($conn, $query);
    mysqli_stmt_bind_param($stmt, "ss", $date_from, $date_to);
    mysqli_stmt_execute($stmt);
    $result = mysqli_stmt_get_result($stmt);
    
    $labels = [];
    $values = [];
    
    while ($row = mysqli_fetch_assoc($result)) {
        $labels[] = date('M j', strtotime($row['bill_date']));
        $values[] = (float)$row['revenue'];
    }
    
    // Fill in missing dates with zero values
    $start_date = new DateTime($date_from);
    $end_date = new DateTime($date_to);
    $complete_labels = [];
    $complete_values = [];
    
    while ($start_date <= $end_date) {
        $date_str = $start_date->format('M j');
        $complete_labels[] = $date_str;
        
        $index = array_search($date_str, $labels);
        $complete_values[] = $index !== false ? $values[$index] : 0;
        
        $start_date->add(new DateInterval('P1D'));
    }
    
    echo json_encode([
        'labels' => $complete_labels,
        'values' => $complete_values,
        'success' => true
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>

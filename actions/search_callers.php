<?php
session_start();
require_once '../config/database.php';
require_once '../includes/functions.php';

// Check authentication
if (!isLoggedIn()) {
    http_response_code(401);
    echo json_encode(['error' => 'Unauthorized']);
    exit;
}

$query = sanitizeInput($_GET['q'] ?? '');

if (strlen($query) < 2) {
    echo json_encode([]);
    exit;
}

try {
    $search_query = "%{$query}%";
    $callers = fetchAll($db, "
        SELECT DISTINCT name, phone, company, contact_type
        FROM contacts
        WHERE (name LIKE ? OR phone LIKE ? OR company LIKE ?)
        AND is_blacklisted = 0
        ORDER BY name
        LIMIT 20
    ", [$search_query, $search_query, $search_query]);

    header('Content-Type: application/json');
    echo json_encode($callers);

} catch (PDOException $e) {
    error_log("Search callers error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Database error']);
}
?>

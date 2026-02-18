<?php
session_start();
require_once 'config/database.php';
require_once 'includes/functions.php';

// Simple routing system
$page = $_GET['page'] ?? 'dashboard';
$allowed_pages = ['dashboard', 'login', 'receptionist', 'calls', 'billing', 'reports', 'maintenance', 'admin'];

// Check authentication for protected pages
if (!in_array($page, ['login']) && !isLoggedIn()) {
    header('Location: index.php?page=login');
    exit;
}

// Include the requested page
if (in_array($page, $allowed_pages)) {
    include "pages/{$page}.php";
} else {
    include 'pages/404.php';
}
?>

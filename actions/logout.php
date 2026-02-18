<?php
session_start();
require_once '../config/database.php';

// Log the logout if user is logged in
if (isset($_SESSION['user_id'])) {
    try {
        $log_query = "INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address, user_agent) 
                      VALUES (?, 'LOGOUT', 'users', ?, ?, ?, ?)";
        $stmt = $db->prepare($log_query);
        $stmt->execute([
            $_SESSION['user_id'],
            $_SESSION['user_id'],
            json_encode(['logout_time' => date('Y-m-d H:i:s')]),
            $_SERVER['REMOTE_ADDR'] ?? 'unknown',
            $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
        ]);
    } catch (PDOException $e) {
        error_log("Logout logging error: " . $e->getMessage());
    }
}

// Clear all session variables
$_SESSION = array();

// Delete the session cookie
if (ini_get("session.use_cookies")) {
    $params = session_get_cookie_params();
    setcookie(session_name(), '', time() - 42000,
        $params["path"], $params["domain"],
        $params["secure"], $params["httponly"]
    );
}

// Delete remember me cookie
if (isset($_COOKIE['remember_user'])) {
    setcookie('remember_user', '', time() - 3600, '/', '', false, true);
}

// Destroy the session
session_destroy();

// Set success message for login page
session_start();
$_SESSION['success_message'] = 'You have been successfully logged out.';

// Redirect to login page
header('Location: ../index.php?page=login');
exit;
?>

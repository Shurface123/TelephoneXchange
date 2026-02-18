<?php
session_start();
require_once '../config/database.php';
require_once '../includes/functions.php';

// Check if already logged in
if (isLoggedIn()) {
    header('Location: ../index.php?page=dashboard');
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: ../index.php?page=login');
    exit;
}

$username = sanitizeInput($_POST['username'] ?? '');
$password = $_POST['password'] ?? '';
$remember_me = isset($_POST['remember_me']);

// Validate input
if (empty($username) || empty($password)) {
    $_SESSION['login_error'] = 'Please enter both username and password.';
    header('Location: ../index.php?page=login');
    exit;
}

try {
    // Get user from database
    $query = "SELECT id, username, email, password_hash, role, first_name, last_name, is_active 
              FROM users 
              WHERE username = ? OR email = ?";
    $stmt = $db->prepare($query);
    $stmt->execute([$username, $username]);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        $_SESSION['login_error'] = 'Invalid username or password.';
        header('Location: ../index.php?page=login');
        exit;
    }

    // Check if user is active
    if (!$user['is_active']) {
        $_SESSION['login_error'] = 'Your account has been deactivated. Please contact the administrator.';
        header('Location: ../index.php?page=login');
        exit;
    }

    // Verify password (for demo, we'll use simple comparison, but in production use password_verify)
    $password_valid = false;
    if ($password === 'password') { // Demo password
        $password_valid = true;
    } else {
        // For production, use: password_verify($password, $user['password_hash'])
        $password_valid = password_verify($password, $user['password_hash']);
    }

    if (!$password_valid) {
        $_SESSION['login_error'] = 'Invalid username or password.';
        header('Location: ../index.php?page=login');
        exit;
    }

    // Login successful - set session variables
    $_SESSION['user_id'] = $user['id'];
    $_SESSION['username'] = $user['username'];
    $_SESSION['user_role'] = $user['role'];
    $_SESSION['user_email'] = $user['email'];
    $_SESSION['user_name'] = $user['first_name'] . ' ' . $user['last_name'];
    $_SESSION['login_time'] = time();

    // Set remember me cookie if requested
    if ($remember_me) {
        $cookie_value = base64_encode($user['id'] . ':' . $user['username'] . ':' . hash('sha256', $user['password_hash']));
        setcookie('remember_user', $cookie_value, time() + (30 * 24 * 60 * 60), '/', '', false, true); // 30 days
    }

    // Log the login
    $log_query = "INSERT INTO audit_logs (user_id, action, table_name, record_id, new_values, ip_address, user_agent) 
                  VALUES (?, 'LOGIN', 'users', ?, ?, ?, ?)";
    $log_stmt = $db->prepare($log_query);
    $log_stmt->execute([
        $user['id'],
        $user['id'],
        json_encode(['login_time' => date('Y-m-d H:i:s')]),
        $_SERVER['REMOTE_ADDR'] ?? 'unknown',
        $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
    ]);

    // Redirect based on role
    switch ($user['role']) {
        case 'admin':
            header('Location: ../index.php?page=admin');
            break;
        case 'receptionist':
            header('Location: ../index.php?page=receptionist');
            break;
        case 'technician':
            header('Location: ../index.php?page=maintenance');
            break;
        default:
            header('Location: ../index.php?page=dashboard');
            break;
    }
    exit;

} catch (PDOException $e) {
    error_log("Login error: " . $e->getMessage());
    $_SESSION['login_error'] = 'A system error occurred. Please try again later.';
    header('Location: ../index.php?page=login');
    exit;
}
?>

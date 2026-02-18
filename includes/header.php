<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $page_title ?? 'COCOBOD CHED Telephone Exchange'; ?></title>
    <link rel="stylesheet" href="assets/css/style.css">
    <link rel="stylesheet" href="assets/css/components.css">
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
</head>
<body>
    <?php if (isLoggedIn()): ?>
    <nav class="navbar">
        <div class="nav-container">
            <div class="nav-brand">
                <i class="fas fa-phone"></i>
                <span> COCOBOD CHED TELEPHONE EXCHANGE </span>
            </div>
            <ul class="nav-menu">
                <li><a href="index.php?page=dashboard" class="<?php echo $page === 'dashboard' ? 'active' : ''; ?>">
                    <i class="fas fa-tachometer-alt"></i> Dashboard
                </a></li>
                
                <?php if (hasRole('receptionist') || hasRole('admin')): ?>
                <li><a href="index.php?page=receptionist" class="<?php echo $page === 'receptionist' ? 'active' : ''; ?>">
                    <i class="fas fa-headset"></i> Reception
                </a></li>
                <?php endif; ?>
                
                <li><a href="index.php?page=calls" class="<?php echo $page === 'calls' ? 'active' : ''; ?>">
                    <i class="fas fa-phone-alt"></i> Calls
                </a></li>
                
                <?php if (hasRole('admin') || hasRole('receptionist')): ?>
                <li><a href="index.php?page=billing" class="<?php echo $page === 'billing' ? 'active' : ''; ?>">
                    <i class="fas fa-file-invoice-dollar"></i> Billing
                </a></li>
                <?php endif; ?>
                
                <li><a href="index.php?page=reports" class="<?php echo $page === 'reports' ? 'active' : ''; ?>">
                    <i class="fas fa-chart-bar"></i> Reports
                </a></li>
                
                <li><a href="index.php?page=maintenance" class="<?php echo $page === 'maintenance' ? 'active' : ''; ?>">
                    <i class="fas fa-tools"></i> Maintenance
                </a></li>
                
                <?php if (hasRole('admin')): ?>
                <li><a href="index.php?page=admin" class="<?php echo $page === 'admin' ? 'active' : ''; ?>">
                    <i class="fas fa-cog"></i> Admin
                </a></li>
                <?php endif; ?>
            </ul>
            <div class="nav-user">
                <span class="user-info">
                    <i class="fas fa-user"></i>
                    <?php echo $_SESSION['username'] ?? 'User'; ?>
                    <span class="user-role">(<?php echo ucfirst($_SESSION['user_role'] ?? 'user'); ?>)</span>
                </span>
                <a href="actions/logout.php" class="logout-btn">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </a>
            </div>
        </div>
    </nav>
    <?php endif; ?>
    
    <main class="main-content">

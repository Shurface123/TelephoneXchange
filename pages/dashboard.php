<?php
requireLogin();
$page_title = 'Dashboard - COCOBOD CHED Telephone Exchange';
include 'includes/header.php';

// Get dashboard statistics
$stats = [];

// Total calls today
$today_calls = fetchOne($db, "SELECT COUNT(*) as count FROM calls WHERE DATE(created_at) = CURDATE()");
$stats['today_calls'] = $today_calls['count'] ?? 0;

// Active calls
$active_calls = fetchOne($db, "SELECT COUNT(*) as count FROM calls WHERE call_status IN ('pending', 'connected')");
$stats['active_calls'] = $active_calls['count'] ?? 0;

// Pending bills
$pending_bills = fetchOne($db, "SELECT COUNT(*) as count FROM bills WHERE bill_status = 'pending'");
$stats['pending_bills'] = $pending_bills['count'] ?? 0;

// Open faults
$open_faults = fetchOne($db, "SELECT COUNT(*) as count FROM fault_reports WHERE fault_status IN ('open', 'assigned', 'in_progress')");
$stats['open_faults'] = $open_faults['count'] ?? 0;

// Recent calls
$recent_calls = fetchAll($db, "
    SELECT c.*, d.department_name, ct.type_name as call_type
    FROM calls c
    LEFT JOIN departments d ON c.department_id = d.id
    LEFT JOIN call_types ct ON c.call_type_id = ct.id
    ORDER BY c.created_at DESC
    LIMIT 10
");

// Department call statistics
$dept_stats = fetchAll($db, "
    SELECT d.department_name, COUNT(c.id) as call_count
    FROM departments d
    LEFT JOIN calls c ON d.id = c.department_id AND DATE(c.created_at) = CURDATE()
    WHERE d.is_active = 1
    GROUP BY d.id, d.department_name
    ORDER BY call_count DESC
");
?>

<div class="dashboard-header" style="margin-bottom: 2rem;">
    <h1 style="font-size: 2rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem;">
        Welcome back, <?php echo htmlspecialchars($_SESSION['user_name']); ?>
    </h1>
    <p style="color: var(--text-secondary);">
        Here's what's happening with your telephone exchange system today.
    </p>
</div>

<!-- Statistics Cards -->
<div class="stats-grid">
    <div class="stat-card">
        <div class="stat-header">
            <span class="stat-title">Today's Calls</span>
            <div class="stat-icon primary">
                <i class="fas fa-phone"></i>
            </div>
        </div>
        <div class="stat-value"><?php echo number_format($stats['today_calls']); ?></div>
        <div class="stat-change positive">
            <i class="fas fa-arrow-up"></i>
            <span>+12% from yesterday</span>
        </div>
    </div>

    <div class="stat-card">
        <div class="stat-header">
            <span class="stat-title">Active Calls</span>
            <div class="stat-icon warning">
                <i class="fas fa-phone-volume"></i>
            </div>
        </div>
        <div class="stat-value"><?php echo number_format($stats['active_calls']); ?></div>
        <div class="stat-change">
            <i class="fas fa-clock"></i>
            <span>Currently in progress</span>
        </div>
    </div>

    <div class="stat-card">
        <div class="stat-header">
            <span class="stat-title">Pending Bills</span>
            <div class="stat-icon danger">
                <i class="fas fa-file-invoice-dollar"></i>
            </div>
        </div>
        <div class="stat-value"><?php echo number_format($stats['pending_bills']); ?></div>
        <div class="stat-change negative">
            <i class="fas fa-exclamation-triangle"></i>
            <span>Requires attention</span>
        </div>
    </div>

    <div class="stat-card">
        <div class="stat-header">
            <span class="stat-title">Open Faults</span>
            <div class="stat-icon success">
                <i class="fas fa-tools"></i>
            </div>
        </div>
        <div class="stat-value"><?php echo number_format($stats['open_faults']); ?></div>
        <div class="stat-change">
            <i class="fas fa-wrench"></i>
            <span>Under maintenance</span>
        </div>
    </div>
</div>

<!-- Main Content Grid -->
<div class="grid grid-cols-2" style="margin-top: 2rem;">
    <!-- Recent Calls -->
    <div class="card">
        <div class="card-header">
            <h2 class="card-title">Recent Calls</h2>
            <a href="index.php?page=calls" class="btn btn-outline">View All</a>
        </div>
        <div class="card-content">
            <?php if (empty($recent_calls)): ?>
                <p style="text-align: center; color: var(--text-secondary); padding: 2rem;">
                    No calls recorded yet today.
                </p>
            <?php else: ?>
                <div style="overflow-x: auto;">
                    <table class="table">
                        <thead>
                            <tr>
                                <th>Caller</th>
                                <th>Department</th>
                                <th>Status</th>
                                <th>Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($recent_calls as $call): ?>
                                <tr>
                                    <td>
                                        <div>
                                            <div style="font-weight: 500;"><?php echo htmlspecialchars($call['caller_name']); ?></div>
                                            <div style="font-size: 0.875rem; color: var(--text-secondary);">
                                                <?php echo htmlspecialchars($call['caller_phone']); ?>
                                            </div>
                                        </div>
                                    </td>
                                    <td><?php echo htmlspecialchars($call['department_name'] ?? 'N/A'); ?></td>
                                    <td>
                                        <span class="call-status <?php echo $call['call_status']; ?>">
                                            <?php echo ucfirst($call['call_status']); ?>
                                        </span>
                                    </td>
                                    <td style="font-size: 0.875rem; color: var(--text-secondary);">
                                        <?php echo date('H:i', strtotime($call['created_at'])); ?>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            <?php endif; ?>
        </div>
    </div>

    <!-- Department Statistics -->
    <div class="card">
        <div class="card-header">
            <h2 class="card-title">Department Activity</h2>
            <span style="font-size: 0.875rem; color: var(--text-secondary);">Today's calls by department</span>
        </div>
        <div class="card-content">
            <?php if (empty($dept_stats)): ?>
                <p style="text-align: center; color: var(--text-secondary); padding: 2rem;">
                    No department data available.
                </p>
            <?php else: ?>
                <div style="space-y: 1rem;">
                    <?php foreach ($dept_stats as $dept): ?>
                        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.75rem 0; border-bottom: 1px solid var(--border-color);">
                            <span style="font-weight: 500;"><?php echo htmlspecialchars($dept['department_name']); ?></span>
                            <span class="badge badge-info"><?php echo number_format($dept['call_count']); ?> calls</span>
                        </div>
                    <?php endforeach; ?>
                </div>
            <?php endif; ?>
        </div>
    </div>
</div>

<!-- Quick Actions -->
<?php if (hasRole('receptionist') || hasRole('admin')): ?>
<div class="card" style="margin-top: 2rem;">
    <div class="card-header">
        <h2 class="card-title">Quick Actions</h2>
    </div>
    <div class="card-content">
        <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
            <a href="index.php?page=receptionist" class="btn btn-primary">
                <i class="fas fa-plus"></i> New Call
            </a>
            <a href="index.php?page=calls" class="btn btn-secondary">
                <i class="fas fa-list"></i> View All Calls
            </a>
            <?php if (hasRole('admin')): ?>
                <a href="index.php?page=billing" class="btn btn-success">
                    <i class="fas fa-file-invoice"></i> Generate Bill
                </a>
                <a href="index.php?page=reports" class="btn btn-warning">
                    <i class="fas fa-chart-line"></i> View Reports
                </a>
            <?php endif; ?>
        </div>
    </div>
</div>
<?php endif; ?>

<?php include 'includes/footer.php'; ?>

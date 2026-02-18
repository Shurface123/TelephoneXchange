<?php



requireLogin();
requireRole('admin');
$page_title = 'Admin Panel - COCOBOD CHED Telephone Exchange';
include 'includes/header.php';

// Get users for management
$users = fetchAll($db, "
    SELECT u.*, e.employee_id, d.department_name
    FROM users u
    LEFT JOIN employees e ON u.id = e.user_id
    LEFT JOIN departments d ON e.department_id = d.id
    ORDER BY u.created_at DESC
");

// Get system statistics
$system_stats = [
    'total_users' => fetchOne($db, "SELECT COUNT(*) as count FROM users")['count'],
    'total_departments' => fetchOne($db, "SELECT COUNT(*) as count FROM departments WHERE is_active = 1")['count'],
    'total_calls_today' => fetchOne($db, "SELECT COUNT(*) as count FROM calls WHERE DATE(created_at) = CURDATE()")['count'],
    'total_bills_pending' => fetchOne($db, "SELECT COUNT(*) as count FROM bills WHERE bill_status = 'pending'")['count']
];
?>

<div class="admin-header" style="margin-bottom: 2rem;">
    <h1 style="font-size: 2rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem;">
        System Administration
    </h1>
    <p style="color: var(--text-secondary);">
        Manage users, system settings, and monitor overall system performance.
    </p>
</div>

<!-- System Statistics -->
<div class="stats-grid">
    <div class="stat-card">
        <div class="stat-header">
            <span class="stat-title">Total Users</span>
            <div class="stat-icon primary">
                <i class="fas fa-users"></i>
            </div>
        </div>
        <div class="stat-value"><?php echo number_format($system_stats['total_users']); ?></div>
    </div>

    <div class="stat-card">
        <div class="stat-header">
            <span class="stat-title">Active Departments</span>
            <div class="stat-icon success">
                <i class="fas fa-building"></i>
            </div>
        </div>
        <div class="stat-value"><?php echo number_format($system_stats['total_departments']); ?></div>
    </div>

    <div class="stat-card">
        <div class="stat-header">
            <span class="stat-title">Calls Today</span>
            <div class="stat-icon warning">
                <i class="fas fa-phone"></i>
            </div>
        </div>
        <div class="stat-value"><?php echo number_format($system_stats['total_calls_today']); ?></div>
    </div>

    <div class="stat-card">
        <div class="stat-header">
            <span class="stat-title">Pending Bills</span>
            <div class="stat-icon danger">
                <i class="fas fa-file-invoice"></i>
            </div>
        </div>
        <div class="stat-value"><?php echo number_format($system_stats['total_bills_pending']); ?></div>
    </div>
</div>

<!-- User Management -->
<div class="card" style="margin-top: 2rem;">
    <div class="card-header">
        <h2 class="card-title">User Management</h2>
        <button class="btn btn-primary" data-modal="addUserModal">
            <i class="fas fa-plus"></i> Add User
        </button>
    </div>
    <div class="card-content">
        <div style="overflow-x: auto;">
            <table class="table">
                <thead>
                    <tr>
                        <th>User</th>
                        <th>Role</th>
                        <th>Department</th>
                        <th>Status</th>
                        <th>Last Login</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($users as $user): ?>
                        <tr>
                            <td>
                                <div>
                                    <div style="font-weight: 500;"><?php echo htmlspecialchars($user['first_name'] . ' ' . $user['last_name']); ?></div>
                                    <div style="font-size: 0.875rem; color: var(--text-secondary);">
                                        <?php echo htmlspecialchars($user['email']); ?>
                                    </div>
                                </div>
                            </td>
                            <td>
                                <span class="badge badge-info">
                                    <?php echo ucfirst($user['role']); ?>
                                </span>
                            </td>
                            <td><?php echo htmlspecialchars($user['department_name'] ?? 'N/A'); ?></td>
                            <td>
                                <span class="badge <?php echo $user['is_active'] ? 'badge-success' : 'badge-danger'; ?>">
                                    <?php echo $user['is_active'] ? 'Active' : 'Inactive'; ?>
                                </span>
                            </td>
                            <td style="font-size: 0.875rem; color: var(--text-secondary);">
                                <?php echo date('M j, Y', strtotime($user['updated_at'])); ?>
                            </td>
                            <td>
                                <div style="display: flex; gap: 0.5rem;">
                                    <button class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" 
                                            onclick="editUser(<?php echo $user['id']; ?>)">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-danger" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" 
                                            onclick="toggleUserStatus(<?php echo $user['id']; ?>, <?php echo $user['is_active'] ? 'false' : 'true'; ?>)">
                                        <i class="fas fa-<?php echo $user['is_active'] ? 'ban' : 'check'; ?>"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    </div>
</div>

<!-- Add User Modal -->
<div id="addUserModal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h3 class="modal-title">Add New User</h3>
            <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
            <form id="addUserForm" action="actions/manage_user.php" method="POST">
                <input type="hidden" name="action" value="add">
                
                <div class="grid grid-cols-2">
                    <div class="form-group">
                        <label for="first_name" class="form-label">First Name</label>
                        <input type="text" id="first_name" name="first_name" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label for="last_name" class="form-label">Last Name</label>
                        <input type="text" id="last_name" name="last_name" class="form-input" required>
                    </div>
                </div>

                <div class="form-group">
                    <label for="username" class="form-label">Username</label>
                    <input type="text" id="username" name="username" class="form-input" required>
                </div>

                <div class="form-group">
                    <label for="email" class="form-label">Email</label>
                    <input type="email" id="email" name="email" class="form-input" required>
                </div>

                <div class="form-group">
                    <label for="phone" class="form-label">Phone</label>
                    <input type="tel" id="phone" name="phone" class="form-input">
                </div>

                <div class="form-group">
                    <label for="role" class="form-label">Role</label>
                    <select id="role" name="role" class="form-select" required>
                        <option value="">Select Role</option>
                        <option value="admin">Administrator</option>
                        <option value="receptionist">Receptionist</option>
                        <option value="technician">Technician</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="password" class="form-label">Password</label>
                    <input type="password" id="password" name="password" class="form-input" required>
                </div>
            </form>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-modal-close>Cancel</button>
            <button type="submit" form="addUserForm" class="btn btn-primary">Add User</button>
        </div>
    </div>
</div>

<script>
function editUser(userId) {
    // Implementation for editing user
    alert('Edit user functionality - User ID: ' + userId);
}

function toggleUserStatus(userId, newStatus) {
    if (confirm('Are you sure you want to ' + (newStatus === 'true' ? 'activate' : 'deactivate') + ' this user?')) {
        // Implementation for toggling user status
        alert('Toggle user status - User ID: ' + userId + ', New Status: ' + newStatus);
    }
}
</script>

<?php include 'includes/footer.php'; ?>

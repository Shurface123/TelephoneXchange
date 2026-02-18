<?php




requireLogin();
$page_title = 'Call Management - COCOBOD CHED Telephone Exchange';
include 'includes/header.php';

// Get filter parameters
$status_filter = $_GET['status'] ?? '';
$department_filter = $_GET['department'] ?? '';
$date_from = $_GET['date_from'] ?? '';
$date_to = $_GET['date_to'] ?? '';
$search = $_GET['search'] ?? '';
$page_num = max(1, (int)($_GET['page'] ?? 1));
$per_page = 20;
$offset = ($page_num - 1) * $per_page;

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

// Get total count for pagination
$count_query = "SELECT COUNT(*) as total FROM calls c {$where_clause}";
$total_calls = fetchOne($db, $count_query, $params)['total'];
$total_pages = ceil($total_calls / $per_page);

// Get calls with pagination
$calls_query = "
    SELECT c.*, d.department_name, ct.type_name as call_type,
           CONCAT(e.first_name, ' ', e.last_name) as assigned_employee,
           CONCAT(u.first_name, ' ', u.last_name) as recorded_by_name
    FROM calls c
    LEFT JOIN departments d ON c.department_id = d.id
    LEFT JOIN call_types ct ON c.call_type_id = ct.id
    LEFT JOIN employees e ON c.employee_id = e.id
    LEFT JOIN users u ON c.recorded_by = u.id
    {$where_clause}
    ORDER BY c.created_at DESC
    LIMIT {$per_page} OFFSET {$offset}
";

$calls = fetchAll($db, $calls_query, $params);

// Get departments for filter
$departments = fetchAll($db, "SELECT * FROM departments WHERE is_active = 1 ORDER BY department_name");

// Get call statistics
$stats = [
    'total_today' => fetchOne($db, "SELECT COUNT(*) as count FROM calls WHERE DATE(created_at) = CURDATE()")['count'],
    'active' => fetchOne($db, "SELECT COUNT(*) as count FROM calls WHERE call_status IN ('pending', 'connected')")['count'],
    'completed_today' => fetchOne($db, "SELECT COUNT(*) as count FROM calls WHERE call_status = 'completed' AND DATE(created_at) = CURDATE()")['count'],
    'avg_duration' => fetchOne($db, "SELECT AVG(duration_seconds) as avg FROM calls WHERE call_status = 'completed' AND DATE(created_at) = CURDATE()")['avg'] ?? 0
];
?>

<div class="calls-header" style="margin-bottom: 2rem;">
    <h1 style="font-size: 2rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem;">
        Call Management
    </h1>
    <p style="color: var(--text-secondary);">
        Track, manage, and analyze all telephone calls in the system.
    </p>
</div>

<!-- Call Statistics -->
<div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-bottom: 2rem;">
    <div class="stat-card">
        <div class="stat-header">
            <span class="stat-title">Today's Calls</span>
            <div class="stat-icon primary">
                <i class="fas fa-phone"></i>
            </div>
        </div>
        <div class="stat-value"><?php echo number_format($stats['total_today']); ?></div>
    </div>

    <div class="stat-card">
        <div class="stat-header">
            <span class="stat-title">Active Calls</span>
            <div class="stat-icon warning">
                <i class="fas fa-phone-volume"></i>
            </div>
        </div>
        <div class="stat-value"><?php echo number_format($stats['active']); ?></div>
    </div>

    <div class="stat-card">
        <div class="stat-header">
            <span class="stat-title">Completed Today</span>
            <div class="stat-icon success">
                <i class="fas fa-check-circle"></i>
            </div>
        </div>
        <div class="stat-value"><?php echo number_format($stats['completed_today']); ?></div>
    </div>

    <div class="stat-card">
        <div class="stat-header">
            <span class="stat-title">Avg Duration</span>
            <div class="stat-icon info">
                <i class="fas fa-clock"></i>
            </div>
        </div>
        <div class="stat-value"><?php echo formatDuration((int)$stats['avg_duration']); ?></div>
    </div>
</div>

<!-- Filters and Search -->
<div class="search-filters">
    <form method="GET" action="index.php">
        <input type="hidden" name="page" value="calls">
        
        <div class="filter-row">
            <div class="form-group">
                <label for="search" class="form-label">Search</label>
                <input type="text" id="search" name="search" class="form-input" 
                       placeholder="Name, phone, or reason..." value="<?php echo htmlspecialchars($search); ?>">
            </div>

            <div class="form-group">
                <label for="status" class="form-label">Status</label>
                <select id="status" name="status" class="form-select">
                    <option value="">All Statuses</option>
                    <option value="pending" <?php echo $status_filter === 'pending' ? 'selected' : ''; ?>>Pending</option>
                    <option value="connected" <?php echo $status_filter === 'connected' ? 'selected' : ''; ?>>Connected</option>
                    <option value="completed" <?php echo $status_filter === 'completed' ? 'selected' : ''; ?>>Completed</option>
                    <option value="missed" <?php echo $status_filter === 'missed' ? 'selected' : ''; ?>>Missed</option>
                    <option value="transferred" <?php echo $status_filter === 'transferred' ? 'selected' : ''; ?>>Transferred</option>
                    <option value="cancelled" <?php echo $status_filter === 'cancelled' ? 'selected' : ''; ?>>Cancelled</option>
                </select>
            </div>

            <div class="form-group">
                <label for="department" class="form-label">Department</label>
                <select id="department" name="department" class="form-select">
                    <option value="">All Departments</option>
                    <?php foreach ($departments as $dept): ?>
                        <option value="<?php echo $dept['id']; ?>" <?php echo $department_filter == $dept['id'] ? 'selected' : ''; ?>>
                            <?php echo htmlspecialchars($dept['department_name']); ?>
                        </option>
                    <?php endforeach; ?>
                </select>
            </div>

            <div class="form-group">
                <label for="date_from" class="form-label">From Date</label>
                <input type="date" id="date_from" name="date_from" class="form-input" 
                       value="<?php echo htmlspecialchars($date_from); ?>">
            </div>

            <div class="form-group">
                <label for="date_to" class="form-label">To Date</label>
                <input type="date" id="date_to" name="date_to" class="form-input" 
                       value="<?php echo htmlspecialchars($date_to); ?>">
            </div>

            <div class="form-group">
                <label class="form-label">&nbsp;</label>
                <div style="display: flex; gap: 0.5rem;">
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-search"></i> Filter
                    </button>
                    <a href="index.php?page=calls" class="btn btn-secondary">
                        <i class="fas fa-times"></i> Clear
                    </a>
                    <button type="button" class="btn btn-success" onclick="exportCalls()">
                        <i class="fas fa-download"></i> Export
                    </button>
                </div>
            </div>
        </div>
    </form>
</div>

<!-- Calls Table -->
<div class="card">
    <div class="card-header">
        <h2 class="card-title">
            Call History 
            <span style="font-size: 0.875rem; font-weight: normal; color: var(--text-secondary);">
                (<?php echo number_format($total_calls); ?> total calls)
            </span>
        </h2>
        <?php if (hasRole('receptionist') || hasRole('admin')): ?>
            <a href="index.php?page=receptionist" class="btn btn-primary">
                <i class="fas fa-plus"></i> New Call
            </a>
        <?php endif; ?>
    </div>
    <div class="card-content">
        <?php if (empty($calls)): ?>
            <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                <i class="fas fa-phone" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                <h3>No calls found</h3>
                <p>No calls match your current filters.</p>
            </div>
        <?php else: ?>
            <div style="overflow-x: auto;">
                <table class="table">
                    <thead>
                        <tr>
                            <th data-sort="call_reference">Reference</th>
                            <th data-sort="caller_name">Caller</th>
                            <th data-sort="department_name">Department</th>
                            <th data-sort="call_type">Type</th>
                            <th data-sort="call_status">Status</th>
                            <th data-sort="priority">Priority</th>
                            <th data-sort="duration_seconds">Duration</th>
                            <th data-sort="created_at">Date/Time</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($calls as $call): ?>
                            <tr>
                                <td>
                                    <span style="font-family: monospace; font-size: 0.875rem;">
                                        <?php echo htmlspecialchars($call['call_reference']); ?>
                                    </span>
                                </td>
                                <td>
                                    <div>
                                        <div style="font-weight: 500;">
                                            <?php echo htmlspecialchars($call['caller_name']); ?>
                                        </div>
                                        <div style="font-size: 0.875rem; color: var(--text-secondary);">
                                            <?php echo htmlspecialchars($call['caller_phone']); ?>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <span style="font-size: 0.875rem;">
                                        <?php echo htmlspecialchars($call['department_name'] ?? 'Unassigned'); ?>
                                    </span>
                                    <?php if ($call['assigned_employee']): ?>
                                        <div style="font-size: 0.75rem; color: var(--text-secondary);">
                                            <?php echo htmlspecialchars($call['assigned_employee']); ?>
                                        </div>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <span class="badge badge-info">
                                        <?php echo htmlspecialchars($call['call_type'] ?? 'N/A'); ?>
                                    </span>
                                </td>
                                <td>
                                    <span class="call-status <?php echo $call['call_status']; ?>">
                                        <?php echo ucfirst($call['call_status']); ?>
                                    </span>
                                </td>
                                <td>
                                    <span class="priority <?php echo $call['priority']; ?>">
                                        <i class="fas fa-<?php echo $call['priority'] === 'high' ? 'exclamation-triangle' : ($call['priority'] === 'urgent' ? 'exclamation-circle' : 'circle'); ?>"></i>
                                        <?php echo ucfirst($call['priority']); ?>
                                    </span>
                                </td>
                                <td data-value="<?php echo $call['duration_seconds']; ?>">
                                    <?php if ($call['duration_seconds'] > 0): ?>
                                        <span style="font-family: monospace;">
                                            <?php echo formatDuration($call['duration_seconds']); ?>
                                        </span>
                                    <?php else: ?>
                                        <span style="color: var(--text-secondary);">-</span>
                                    <?php endif; ?>
                                </td>
                                <td data-value="<?php echo $call['created_at']; ?>">
                                    <div style="font-size: 0.875rem;">
                                        <?php echo date('M j, Y', strtotime($call['created_at'])); ?>
                                    </div>
                                    <div style="font-size: 0.75rem; color: var(--text-secondary);">
                                        <?php echo date('H:i', strtotime($call['created_at'])); ?>
                                    </div>
                                </td>
                                <td>
                                    <div style="display: flex; gap: 0.25rem;">
                                        <button class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" 
                                                onclick="viewCallDetails(<?php echo $call['id']; ?>)">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        
                                        <?php if (in_array($call['call_status'], ['pending', 'connected']) && (hasRole('receptionist') || hasRole('admin'))): ?>
                                            <button class="btn btn-warning" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" 
                                                    onclick="transferCall(<?php echo $call['id']; ?>)">
                                                <i class="fas fa-exchange-alt"></i>
                                            </button>
                                            
                                            <button class="btn btn-success" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" 
                                                    onclick="completeCall(<?php echo $call['id']; ?>)">
                                                <i class="fas fa-check"></i>
                                            </button>
                                        <?php endif; ?>
                                        
                                        <?php if ($call['follow_up_required'] && $call['call_status'] === 'completed'): ?>
                                            <button class="btn btn-info" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" 
                                                    onclick="makeFollowUp(<?php echo $call['id']; ?>)">
                                                <i class="fas fa-phone"></i>
                                            </button>
                                        <?php endif; ?>
                                    </div>
                                </td>
                            </tr>
                        <?php endforeach; ?>
                    </tbody>
                </table>
            </div>

            <!-- Pagination -->
            <?php if ($total_pages > 1): ?>
                <div class="pagination">
                    <?php if ($page_num > 1): ?>
                        <a href="?page=calls&<?php echo http_build_query(array_merge($_GET, ['page' => $page_num - 1])); ?>">
                            <i class="fas fa-chevron-left"></i> Previous
                        </a>
                    <?php endif; ?>

                    <?php for ($i = max(1, $page_num - 2); $i <= min($total_pages, $page_num + 2); $i++): ?>
                        <?php if ($i === $page_num): ?>
                            <span class="current"><?php echo $i; ?></span>
                        <?php else: ?>
                            <a href="?page=calls&<?php echo http_build_query(array_merge($_GET, ['page' => $i])); ?>">
                                <?php echo $i; ?>
                            </a>
                        <?php endif; ?>
                    <?php endfor; ?>

                    <?php if ($page_num < $total_pages): ?>
                        <a href="?page=calls&<?php echo http_build_query(array_merge($_GET, ['page' => $page_num + 1])); ?>">
                            Next <i class="fas fa-chevron-right"></i>
                        </a>
                    <?php endif; ?>
                </div>
            <?php endif; ?>
        <?php endif; ?>
    </div>
</div>

<!-- Call Details Modal -->
<div id="callDetailsModal" class="modal">
    <div class="modal-content" style="max-width: 800px;">
        <div class="modal-header">
            <h3 class="modal-title">Call Details</h3>
            <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body" id="callDetailsContent">
            <!-- Call details will be loaded here -->
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-modal-close>Close</button>
        </div>
    </div>
</div>

<!-- Call Transfer Modal -->
<div id="callTransferModal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h3 class="modal-title">Transfer Call</h3>
            <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
            <form id="transferCallForm">
                <input type="hidden" id="transfer_call_id" name="call_id">
                
                <div class="form-group">
                    <label for="transfer_department" class="form-label">Transfer to Department</label>
                    <select id="transfer_department" name="department_id" class="form-select" required 
                            onchange="loadTransferStaff(this.value)">
                        <option value="">Select department</option>
                        <?php foreach ($departments as $dept): ?>
                            <option value="<?php echo $dept['id']; ?>">
                                <?php echo htmlspecialchars($dept['department_name']); ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                </div>

                <div class="form-group">
                    <label for="transfer_employee" class="form-label">Specific Staff (Optional)</label>
                    <select id="transfer_employee" name="employee_id" class="form-select">
                        <option value="">Any available staff</option>
                    </select>
                </div>

                <div class="form-group">
                    <label for="transfer_reason" class="form-label">Transfer Reason</label>
                    <textarea id="transfer_reason" name="transfer_reason" class="form-textarea" 
                              placeholder="Reason for transferring this call" rows="3"></textarea>
                </div>

                <div class="form-group">
                    <label for="transfer_notes" class="form-label">Transfer Notes</label>
                    <textarea id="transfer_notes" name="transfer_notes" class="form-textarea" 
                              placeholder="Additional notes for the receiving department" rows="2"></textarea>
                </div>
            </form>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-modal-close>Cancel</button>
            <button type="button" class="btn btn-primary" onclick="submitTransfer()">Transfer Call</button>
        </div>
    </div>
</div>

<script>
// View call details
function viewCallDetails(callId) {
    const modal = document.getElementById('callDetailsModal');
    const content = document.getElementById('callDetailsContent');
    
    content.innerHTML = '<div style="text-align: center; padding: 2rem;"><span class="spinner"></span> Loading...</div>';
    modal.classList.add('active');
    
    fetch(`actions/get_call_details.php?id=${callId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                content.innerHTML = data.html;
            } else {
                content.innerHTML = '<div class="alert alert-danger">Error loading call details</div>';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            content.innerHTML = '<div class="alert alert-danger">Error loading call details</div>';
        });
}

// Transfer call
function transferCall(callId) {
    document.getElementById('transfer_call_id').value = callId;
    document.getElementById('callTransferModal').classList.add('active');
}

// Load transfer staff
function loadTransferStaff(departmentId) {
    const employeeSelect = document.getElementById('transfer_employee');
    employeeSelect.innerHTML = '<option value="">Loading...</option>';
    
    if (!departmentId) {
        employeeSelect.innerHTML = '<option value="">Any available staff</option>';
        return;
    }
    
    fetch(`actions/get_department_staff.php?department_id=${departmentId}`)
        .then(response => response.json())
        .then(data => {
            employeeSelect.innerHTML = '<option value="">Any available staff</option>';
            data.forEach(employee => {
                const option = document.createElement('option');
                option.value = employee.id;
                option.textContent = `${employee.first_name} ${employee.last_name} - ${employee.position}`;
                employeeSelect.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error loading staff:', error);
            employeeSelect.innerHTML = '<option value="">Error loading staff</option>';
        });
}

// Submit transfer
function submitTransfer() {
    const form = document.getElementById('transferCallForm');
    const formData = new FormData(form);
    
    fetch('actions/transfer_call.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showAlert('success', 'Call transferred successfully');
            document.getElementById('callTransferModal').classList.remove('active');
            location.reload();
        } else {
            showAlert('danger', data.message || 'Error transferring call');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAlert('danger', 'Error transferring call');
    });
}

// Complete call
function completeCall(callId) {
    if (confirm('Mark this call as completed?')) {
        fetch('actions/update_call_status.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `call_id=${callId}&status=completed`
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('success', 'Call marked as completed');
                location.reload();
            } else {
                showAlert('danger', data.message || 'Error updating call status');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('danger', 'Error updating call status');
        });
    }
}

// Make follow-up
function makeFollowUp(callId) {
    // Implementation for making follow-up call
    alert('Make follow-up call functionality - Call ID: ' + callId);
}

// Export calls
function exportCalls() {
    const params = new URLSearchParams(window.location.search);
    params.set('export', 'csv');
    window.open(`actions/export_calls.php?${params.toString()}`, '_blank');
}
</script>

<?php include 'includes/footer.php'; ?>

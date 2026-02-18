<?php
requireLogin();
if (!hasRole('admin') && !hasRole('receptionist')) {
    header('Location: index.php?page=unauthorized');
    exit;
}

$page_title = 'Billing Management - COCOBOD CHED Telephone Exchange';
include 'includes/header.php';

// Get filter parameters
$status_filter = $_GET['status'] ?? '';
$type_filter = $_GET['type'] ?? '';
$date_from = $_GET['date_from'] ?? '';
$date_to = $_GET['date_to'] ?? '';
$search = $_GET['search'] ?? '';
$page_num = max(1, (int)($_GET['page'] ?? 1));
$per_page = 15;
$offset = ($page_num - 1) * $per_page;

// Build WHERE clause for bills
$where_conditions = [];
$params = [];

if (!empty($status_filter)) {
    $where_conditions[] = "b.bill_status = ?";
    $params[] = $status_filter;
}

if (!empty($type_filter)) {
    $where_conditions[] = "b.bill_type_id = ?";
    $params[] = $type_filter;
}

if (!empty($date_from)) {
    $where_conditions[] = "DATE(b.created_at) >= ?";
    $params[] = $date_from;
}

if (!empty($date_to)) {
    $where_conditions[] = "DATE(b.created_at) <= ?";
    $params[] = $date_to;
}

if (!empty($search)) {
    $where_conditions[] = "(b.account_name LIKE ? OR b.invoice_number LIKE ? OR b.account_number LIKE ?)";
    $search_param = "%{$search}%";
    $params[] = $search_param;
    $params[] = $search_param;
    $params[] = $search_param;
}

$where_clause = !empty($where_conditions) ? 'WHERE ' . implode(' AND ', $where_conditions) : '';

// Get total count for pagination
$count_query = "SELECT COUNT(*) as total FROM bills b {$where_clause}";
$total_bills = fetchOne($db, $count_query, $params)['total'];
$total_pages = ceil($total_bills / $per_page);

// Get bills with pagination
$bills_query = "
    SELECT b.*, bt.type_name as bill_type_name, d.department_name,
           CONCAT(u.first_name, ' ', u.last_name) as generated_by_name,
           DATEDIFF(CURDATE(), b.due_date) as days_overdue
    FROM bills b
    LEFT JOIN bill_types bt ON b.bill_type_id = bt.id
    LEFT JOIN departments d ON b.department_id = d.id
    LEFT JOIN users u ON b.generated_by = u.id
    {$where_clause}
    ORDER BY b.created_at DESC
    LIMIT {$per_page} OFFSET {$offset}
";

$bills = fetchAll($db, $bills_query, $params);

// Get bill types for filter
$bill_types = fetchAll($db, "SELECT * FROM bill_types WHERE is_active = 1 ORDER BY type_name");

// Get departments for bill generation
$departments = fetchAll($db, "SELECT * FROM departments WHERE is_active = 1 ORDER BY department_name");

// Get billing statistics
$stats = [
    'total_pending' => fetchOne($db, "SELECT COUNT(*) as count FROM bills WHERE bill_status = 'pending'")['count'],
    'total_overdue' => fetchOne($db, "SELECT COUNT(*) as count FROM bills WHERE bill_status IN ('pending', 'sent') AND due_date < CURDATE()")['count'],
    'total_paid_this_month' => fetchOne($db, "SELECT COUNT(*) as count FROM bills WHERE bill_status = 'paid' AND MONTH(paid_date) = MONTH(CURDATE()) AND YEAR(paid_date) = YEAR(CURDATE())")['count'],
    'revenue_this_month' => fetchOne($db, "SELECT COALESCE(SUM(total_amount), 0) as total FROM bills WHERE bill_status = 'paid' AND MONTH(paid_date) = MONTH(CURDATE()) AND YEAR(paid_date) = YEAR(CURDATE())")['total']
];
?>

<div class="billing-header" style="margin-bottom: 2rem;">
    <h1 style="font-size: 2rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem;">
        Billing Management
    </h1>
    <p style="color: var(--text-secondary);">
        Generate bills, track payments, and manage billing cycles for telephone services.
    </p>
</div>

<!-- Billing Statistics -->
<div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); margin-bottom: 2rem;">
    <div class="stat-card">
        <div class="stat-header">
            <span class="stat-title">Pending Bills</span>
            <div class="stat-icon warning">
                <i class="fas fa-file-invoice"></i>
            </div>
        </div>
        <div class="stat-value"><?php echo number_format($stats['total_pending']); ?></div>
    </div>

    <div class="stat-card">
        <div class="stat-header">
            <span class="stat-title">Overdue Bills</span>
            <div class="stat-icon danger">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
        </div>
        <div class="stat-value"><?php echo number_format($stats['total_overdue']); ?></div>
    </div>

    <div class="stat-card">
        <div class="stat-header">
            <span class="stat-title">Paid This Month</span>
            <div class="stat-icon success">
                <i class="fas fa-check-circle"></i>
            </div>
        </div>
        <div class="stat-value"><?php echo number_format($stats['total_paid_this_month']); ?></div>
    </div>

    <div class="stat-card">
        <div class="stat-header">
            <span class="stat-title">Revenue This Month</span>
            <div class="stat-icon primary">
                <i class="fas fa-dollar-sign"></i>
            </div>
        </div>
        <div class="stat-value"><?php echo formatCurrency($stats['revenue_this_month']); ?></div>
    </div>
</div>

<!-- Quick Actions -->
<?php if (hasRole('admin')): ?>
<div class="card" style="margin-bottom: 2rem;">
    <div class="card-header">
        <h2 class="card-title">Quick Actions</h2>
    </div>
    <div class="card-content">
        <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
            <button class="btn btn-primary" data-modal="generateBillModal">
                <i class="fas fa-plus"></i> Generate New Bill
            </button>
            <button class="btn btn-success" onclick="generateAutoBills()">
                <i class="fas fa-magic"></i> Auto-Generate Bills
            </button>
            <button class="btn btn-info" onclick="exportBills()">
                <i class="fas fa-download"></i> Export Bills
            </button>
            <button class="btn btn-warning" onclick="sendOverdueReminders()">
                <i class="fas fa-bell"></i> Send Overdue Reminders
            </button>
        </div>
    </div>
</div>
<?php endif; ?>

<!-- Filters and Search -->
<div class="search-filters">
    <form method="GET" action="index.php">
        <input type="hidden" name="page" value="billing">
        
        <div class="filter-row">
            <div class="form-group">
                <label for="search" class="form-label">Search</label>
                <input type="text" id="search" name="search" class="form-input" 
                       placeholder="Account name, invoice number..." value="<?php echo htmlspecialchars($search); ?>">
            </div>

            <div class="form-group">
                <label for="status" class="form-label">Status</label>
                <select id="status" name="status" class="form-select">
                    <option value="">All Statuses</option>
                    <option value="draft" <?php echo $status_filter === 'draft' ? 'selected' : ''; ?>>Draft</option>
                    <option value="pending" <?php echo $status_filter === 'pending' ? 'selected' : ''; ?>>Pending</option>
                    <option value="sent" <?php echo $status_filter === 'sent' ? 'selected' : ''; ?>>Sent</option>
                    <option value="paid" <?php echo $status_filter === 'paid' ? 'selected' : ''; ?>>Paid</option>
                    <option value="overdue" <?php echo $status_filter === 'overdue' ? 'selected' : ''; ?>>Overdue</option>
                    <option value="cancelled" <?php echo $status_filter === 'cancelled' ? 'selected' : ''; ?>>Cancelled</option>
                </select>
            </div>

            <div class="form-group">
                <label for="type" class="form-label">Bill Type</label>
                <select id="type" name="type" class="form-select">
                    <option value="">All Types</option>
                    <?php foreach ($bill_types as $type): ?>
                        <option value="<?php echo $type['id']; ?>" <?php echo $type_filter == $type['id'] ? 'selected' : ''; ?>>
                            <?php echo htmlspecialchars($type['type_name']); ?>
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
                    <a href="index.php?page=billing" class="btn btn-secondary">
                        <i class="fas fa-times"></i> Clear
                    </a>
                </div>
            </div>
        </div>
    </form>
</div>

<!-- Bills Table -->
<div class="card">
    <div class="card-header">
        <h2 class="card-title">
            Bills & Invoices
            <span style="font-size: 0.875rem; font-weight: normal; color: var(--text-secondary);">
                (<?php echo number_format($total_bills); ?> total bills)
            </span>
        </h2>
    </div>
    <div class="card-content">
        <?php if (empty($bills)): ?>
            <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                <i class="fas fa-file-invoice" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;"></i>
                <h3>No bills found</h3>
                <p>No bills match your current filters.</p>
            </div>
        <?php else: ?>
            <div style="overflow-x: auto;">
                <table class="table">
                    <thead>
                        <tr>
                            <th data-sort="invoice_number">Invoice #</th>
                            <th data-sort="account_name">Account</th>
                            <th data-sort="bill_type_name">Type</th>
                            <th data-sort="billing_period_start">Period</th>
                            <th data-sort="total_amount">Amount</th>
                            <th data-sort="bill_status">Status</th>
                            <th data-sort="due_date">Due Date</th>
                            <th data-sort="created_at">Created</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php foreach ($bills as $bill): ?>
                            <tr>
                                <td>
                                    <span style="font-family: monospace; font-weight: 500;">
                                        <?php echo htmlspecialchars($bill['invoice_number']); ?>
                                    </span>
                                </td>
                                <td>
                                    <div>
                                        <div style="font-weight: 500;">
                                            <?php echo htmlspecialchars($bill['account_name']); ?>
                                        </div>
                                        <?php if ($bill['account_number']): ?>
                                            <div style="font-size: 0.875rem; color: var(--text-secondary);">
                                                <?php echo htmlspecialchars($bill['account_number']); ?>
                                            </div>
                                        <?php endif; ?>
                                    </div>
                                </td>
                                <td>
                                    <span class="badge badge-info">
                                        <?php echo htmlspecialchars($bill['bill_type_name']); ?>
                                    </span>
                                </td>
                                <td>
                                    <div style="font-size: 0.875rem;">
                                        <?php echo date('M j', strtotime($bill['billing_period_start'])); ?> - 
                                        <?php echo date('M j, Y', strtotime($bill['billing_period_end'])); ?>
                                    </div>
                                </td>
                                <td data-value="<?php echo $bill['total_amount']; ?>">
                                    <span style="font-weight: 500;">
                                        <?php echo formatCurrency($bill['total_amount']); ?>
                                    </span>
                                </td>
                                <td>
                                    <?php
                                    $status_class = 'badge-info';
                                    if ($bill['bill_status'] === 'paid') $status_class = 'badge-success';
                                    elseif ($bill['bill_status'] === 'overdue' || ($bill['bill_status'] === 'pending' && $bill['days_overdue'] > 0)) $status_class = 'badge-danger';
                                    elseif ($bill['bill_status'] === 'sent') $status_class = 'badge-warning';
                                    ?>
                                    <span class="badge <?php echo $status_class; ?>">
                                        <?php echo ucfirst($bill['bill_status']); ?>
                                        <?php if ($bill['days_overdue'] > 0 && $bill['bill_status'] !== 'paid'): ?>
                                            (<?php echo $bill['days_overdue']; ?>d overdue)
                                        <?php endif; ?>
                                    </span>
                                </td>
                                <td data-value="<?php echo $bill['due_date']; ?>">
                                    <?php if ($bill['due_date']): ?>
                                        <div style="font-size: 0.875rem;">
                                            <?php echo date('M j, Y', strtotime($bill['due_date'])); ?>
                                        </div>
                                    <?php else: ?>
                                        <span style="color: var(--text-secondary);">-</span>
                                    <?php endif; ?>
                                </td>
                                <td data-value="<?php echo $bill['created_at']; ?>">
                                    <div style="font-size: 0.875rem;">
                                        <?php echo date('M j, Y', strtotime($bill['created_at'])); ?>
                                    </div>
                                </td>
                                <td>
                                    <div style="display: flex; gap: 0.25rem;">
                                        <button class="btn btn-outline" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" 
                                                onclick="viewBillDetails(<?php echo $bill['id']; ?>)">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        
                                        <button class="btn btn-info" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" 
                                                onclick="downloadBillPDF(<?php echo $bill['id']; ?>)">
                                            <i class="fas fa-file-pdf"></i>
                                        </button>
                                        
                                        <?php if ($bill['bill_status'] !== 'paid' && hasRole('admin')): ?>
                                            <button class="btn btn-success" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" 
                                                    onclick="markAsPaid(<?php echo $bill['id']; ?>)">
                                                <i class="fas fa-check"></i>
                                            </button>
                                        <?php endif; ?>
                                        
                                        <?php if (in_array($bill['bill_status'], ['draft', 'pending']) && hasRole('admin')): ?>
                                            <button class="btn btn-warning" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;" 
                                                    onclick="sendBill(<?php echo $bill['id']; ?>)">
                                                <i class="fas fa-paper-plane"></i>
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
                        <a href="?page=billing&<?php echo http_build_query(array_merge($_GET, ['page' => $page_num - 1])); ?>">
                            <i class="fas fa-chevron-left"></i> Previous
                        </a>
                    <?php endif; ?>

                    <?php for ($i = max(1, $page_num - 2); $i <= min($total_pages, $page_num + 2); $i++): ?>
                        <?php if ($i === $page_num): ?>
                            <span class="current"><?php echo $i; ?></span>
                        <?php else: ?>
                            <a href="?page=billing&<?php echo http_build_query(array_merge($_GET, ['page' => $i])); ?>">
                                <?php echo $i; ?>
                            </a>
                        <?php endif; ?>
                    <?php endfor; ?>

                    <?php if ($page_num < $total_pages): ?>
                        <a href="?page=billing&<?php echo http_build_query(array_merge($_GET, ['page' => $page_num + 1])); ?>">
                            Next <i class="fas fa-chevron-right"></i>
                        </a>
                    <?php endif; ?>
                </div>
            <?php endif; ?>
        <?php endif; ?>
    </div>
</div>

<!-- Generate Bill Modal -->
<div id="generateBillModal" class="modal">
    <div class="modal-content" style="max-width: 600px;">
        <div class="modal-header">
            <h3 class="modal-title">Generate New Bill</h3>
            <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
            <form id="generateBillForm" action="actions/generate_bill.php" method="POST" data-ajax="true">
                <div class="grid grid-cols-2">
                    <div class="form-group">
                        <label for="account_name" class="form-label">Account Name *</label>
                        <input type="text" id="account_name" name="account_name" class="form-input" required 
                               placeholder="Enter account name">
                    </div>
                    <div class="form-group">
                        <label for="account_number" class="form-label">Account Number</label>
                        <input type="text" id="account_number" name="account_number" class="form-input" 
                               placeholder="Optional account number">
                    </div>
                </div>

                <div class="grid grid-cols-2">
                    <div class="form-group">
                        <label for="bill_type_id" class="form-label">Billing Type *</label>
                        <select id="bill_type_id" name="bill_type_id" class="form-select" required>
                            <option value="">Select billing type</option>
                            <?php foreach ($bill_types as $type): ?>
                                <option value="<?php echo $type['id']; ?>">
                                    <?php echo htmlspecialchars($type['type_name']); ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="department_id" class="form-label">Department (Optional)</label>
                        <select id="department_id" name="department_id" class="form-select">
                            <option value="">All departments</option>
                            <?php foreach ($departments as $dept): ?>
                                <option value="<?php echo $dept['id']; ?>">
                                    <?php echo htmlspecialchars($dept['department_name']); ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                </div>

                <div class="grid grid-cols-2">
                    <div class="form-group">
                        <label for="billing_period_start" class="form-label">Period Start *</label>
                        <input type="date" id="billing_period_start" name="billing_period_start" class="form-input" required>
                    </div>
                    <div class="form-group">
                        <label for="billing_period_end" class="form-label">Period End *</label>
                        <input type="date" id="billing_period_end" name="billing_period_end" class="form-input" required>
                    </div>
                </div>

                <div class="grid grid-cols-2">
                    <div class="form-group">
                        <label for="due_date" class="form-label">Due Date</label>
                        <input type="date" id="due_date" name="due_date" class="form-input" 
                               value="<?php echo date('Y-m-d', strtotime('+30 days')); ?>">
                    </div>
                    <div class="form-group">
                        <label for="tax_rate" class="form-label">Tax Rate (%)</label>
                        <input type="number" id="tax_rate" name="tax_rate" class="form-input" 
                               value="12.5" step="0.01" min="0" max="100">
                    </div>
                </div>

                <div class="form-group">
                    <label for="notes" class="form-label">Notes</label>
                    <textarea id="notes" name="notes" class="form-textarea" 
                              placeholder="Additional notes for this bill" rows="3"></textarea>
                </div>

                <div class="form-group">
                    <label class="form-label" style="display: flex; align-items: center; gap: 0.5rem;">
                        <input type="checkbox" id="auto_calculate" name="auto_calculate" checked>
                        Automatically calculate charges from call records
                    </label>
                </div>
            </form>
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-modal-close>Cancel</button>
            <button type="submit" form="generateBillForm" class="btn btn-primary">Generate Bill</button>
        </div>
    </div>
</div>

<!-- Bill Details Modal -->
<div id="billDetailsModal" class="modal">
    <div class="modal-content" style="max-width: 900px;">
        <div class="modal-header">
            <h3 class="modal-title">Bill Details</h3>
            <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body" id="billDetailsContent">
            <!-- Bill details will be loaded here -->
        </div>
        <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-modal-close>Close</button>
        </div>
    </div>
</div>

<script>
// Set default period dates based on bill type
document.getElementById('bill_type_id').addEventListener('change', function() {
    const billTypeId = this.value;
    const startDate = document.getElementById('billing_period_start');
    const endDate = document.getElementById('billing_period_end');
    
    if (!billTypeId) return;
    
    const today = new Date();
    let start, end;
    
    // Get bill type info to determine period
    fetch(`actions/get_bill_type.php?id=${billTypeId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const period = data.bill_type.billing_period;
                
                switch(period) {
                    case 'daily':
                        start = new Date(today);
                        end = new Date(today);
                        break;
                    case 'weekly':
                        start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
                        end = new Date(today);
                        break;
                    case 'monthly':
                        start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
                        end = new Date(today.getFullYear(), today.getMonth(), 0);
                        break;
                    case 'yearly':
                        start = new Date(today.getFullYear() - 1, 0, 1);
                        end = new Date(today.getFullYear() - 1, 11, 31);
                        break;
                    default:
                        return;
                }
                
                startDate.value = start.toISOString().split('T')[0];
                endDate.value = end.toISOString().split('T')[0];
            }
        })
        .catch(error => console.error('Error:', error));
});

// View bill details
function viewBillDetails(billId) {
    const modal = document.getElementById('billDetailsModal');
    const content = document.getElementById('billDetailsContent');
    
    content.innerHTML = '<div style="text-align: center; padding: 2rem;"><span class="spinner"></span> Loading...</div>';
    modal.classList.add('active');
    
    fetch(`actions/get_bill_details.php?id=${billId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                content.innerHTML = data.html;
            } else {
                content.innerHTML = '<div class="alert alert-danger">Error loading bill details</div>';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            content.innerHTML = '<div class="alert alert-danger">Error loading bill details</div>';
        });
}

// Download bill PDF
function downloadBillPDF(billId) {
    window.open(`actions/generate_bill_pdf.php?id=${billId}`, '_blank');
}

// Mark bill as paid
function markAsPaid(billId) {
    if (confirm('Mark this bill as paid?')) {
        fetch('actions/update_bill_status.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `bill_id=${billId}&status=paid&payment_date=${new Date().toISOString().split('T')[0]}`
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('success', 'Bill marked as paid');
                location.reload();
            } else {
                showAlert('danger', data.message || 'Error updating bill status');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('danger', 'Error updating bill status');
        });
    }
}

// Send bill
function sendBill(billId) {
    if (confirm('Send this bill to the customer?')) {
        fetch('actions/send_bill.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `bill_id=${billId}`
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('success', 'Bill sent successfully');
                location.reload();
            } else {
                showAlert('danger', data.message || 'Error sending bill');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('danger', 'Error sending bill');
        });
    }
}

// Generate auto bills
function generateAutoBills() {
    if (confirm('Generate bills automatically for all departments based on their call usage?')) {
        fetch('actions/generate_auto_bills.php', {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('success', `Generated ${data.count} bills successfully`);
                location.reload();
            } else {
                showAlert('danger', data.message || 'Error generating auto bills');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('danger', 'Error generating auto bills');
        });
    }
}

// Export bills
function exportBills() {
    const params = new URLSearchParams(window.location.search);
    params.set('export', 'csv');
    window.open(`actions/export_bills.php?${params.toString()}`, '_blank');
}

// Send overdue reminders
function sendOverdueReminders() {
    if (confirm('Send reminder notifications for all overdue bills?')) {
        fetch('actions/send_overdue_reminders.php', {
            method: 'POST'
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showAlert('success', `Sent ${data.count} reminder notifications`);
            } else {
                showAlert('danger', data.message || 'Error sending reminders');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showAlert('danger', 'Error sending reminders');
        });
    }
}
</script>

<?php include 'includes/footer.php'; ?>

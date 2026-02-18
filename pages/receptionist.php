<?php
requireLogin();
if (!hasRole('receptionist') && !hasRole('admin')) {
    header('Location: index.php?page=unauthorized');
    exit;
}

$page_title = 'Receptionist Dashboard - COCOBOD Telephone Exchange';
include 'includes/header.php';

// Get departments for dropdown
$departments = fetchAll($db, "SELECT * FROM departments WHERE is_active = 1 ORDER BY department_name");

// Get call types
$call_types = fetchAll($db, "SELECT * FROM call_types ORDER BY type_name");

// Get active calls
$active_calls = fetchAll($db, "
    SELECT c.*, d.department_name, ct.type_name as call_type,
           CONCAT(e.first_name, ' ', e.last_name) as assigned_employee
    FROM calls c
    LEFT JOIN departments d ON c.department_id = d.id
    LEFT JOIN call_types ct ON c.call_type_id = ct.id
    LEFT JOIN employees e ON c.employee_id = e.id
    WHERE c.call_status IN ('pending', 'connected')
    ORDER BY c.priority DESC, c.created_at ASC
");

// Get follow-up calls for today
$follow_ups = fetchAll($db, "
    SELECT c.*, d.department_name
    FROM calls c
    LEFT JOIN departments d ON c.department_id = d.id
    WHERE c.follow_up_required = 1 
    AND c.follow_up_date = CURDATE()
    AND c.call_status = 'completed'
    ORDER BY c.created_at ASC
");

// Get recent contacts for quick access
$recent_contacts = fetchAll($db, "
    SELECT DISTINCT c.name, c.phone, c.company, c.contact_type
    FROM contacts c
    JOIN calls ca ON c.id = ca.contact_id
    WHERE ca.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
    ORDER BY ca.created_at DESC
    LIMIT 10
");
?>

<div class="receptionist-header" style="margin-bottom: 2rem;">
    <h1 style="font-size: 2rem; font-weight: 600; color: var(--text-primary); margin-bottom: 0.5rem;">
        Reception Desk
    </h1>
    <p style="color: var(--text-secondary);">
        Manage incoming calls, route to departments, and track call activities.
    </p>
</div>

<!-- Quick Stats -->
<div class="stats-grid" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
    <div class="stat-card">
        <div class="stat-header">
            <span class="stat-title">Active Calls</span>
            <div class="stat-icon warning">
                <i class="fas fa-phone-volume"></i>
            </div>
        </div>
        <div class="stat-value" id="active-calls-count"><?php echo count($active_calls); ?></div>
    </div>

    <div class="stat-card">
        <div class="stat-header">
            <span class="stat-title">Follow-ups Today</span>
            <div class="stat-icon info">
                <i class="fas fa-calendar-check"></i>
            </div>
        </div>
        <div class="stat-value"><?php echo count($follow_ups); ?></div>
    </div>

    <div class="stat-card">
        <div class="stat-header">
            <span class="stat-title">Calls Today</span>
            <div class="stat-icon success">
                <i class="fas fa-phone"></i>
            </div>
        </div>
        <div class="stat-value">
            <?php 
            $today_calls = fetchOne($db, "SELECT COUNT(*) as count FROM calls WHERE DATE(created_at) = CURDATE()");
            echo $today_calls['count'] ?? 0;
            ?>
        </div>
    </div>
</div>

<!-- Main Content Grid -->
<div class="grid grid-cols-3" style="margin-top: 2rem; gap: 1.5rem;">
    <!-- Call Intake Form -->
    <div class="card" style="grid-column: span 2;">
        <div class="card-header">
            <h2 class="card-title">New Call Intake</h2>
            <div style="display: flex; gap: 0.5rem;">
                <button class="btn btn-outline" onclick="clearForm()">
                    <i class="fas fa-eraser"></i> Clear
                </button>
                <button class="btn btn-secondary" data-modal="callerSearchModal">
                    <i class="fas fa-search"></i> Search Caller
                </button>
            </div>
        </div>
        <div class="card-content">
            <form id="callIntakeForm" action="actions/log_call.php" method="POST" data-ajax="true">
                <div class="grid grid-cols-2">
                    <div class="form-group">
                        <label for="caller_name" class="form-label">
                            <i class="fas fa-user"></i> Caller Name *
                        </label>
                        <input type="text" id="caller_name" name="caller_name" class="form-input" required 
                               placeholder="Enter caller's full name">
                    </div>
                    <div class="form-group">
                        <label for="caller_phone" class="form-label">
                            <i class="fas fa-phone"></i> Phone Number *
                        </label>
                        <input type="tel" id="caller_phone" name="caller_phone" class="form-input" required 
                               placeholder="+233 XX XXX XXXX">
                    </div>
                </div>

                <div class="grid grid-cols-2">
                    <div class="form-group">
                        <label for="caller_company" class="form-label">
                            <i class="fas fa-building"></i> Company/Organization
                        </label>
                        <input type="text" id="caller_company" name="caller_company" class="form-input" 
                               placeholder="Optional">
                    </div>
                    <div class="form-group">
                        <label for="call_type_id" class="form-label">
                            <i class="fas fa-tag"></i> Call Type *
                        </label>
                        <select id="call_type_id" name="call_type_id" class="form-select" required>
                            <option value="">Select call type</option>
                            <?php foreach ($call_types as $type): ?>
                                <option value="<?php echo $type['id']; ?>">
                                    <?php echo htmlspecialchars($type['type_name']); ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                </div>

                <div class="grid grid-cols-2">
                    <div class="form-group">
                        <label for="department_id" class="form-label">
                            <i class="fas fa-building"></i> Department *
                        </label>
                        <select id="department_id" name="department_id" class="form-select" required onchange="loadDepartmentStaff(this.value)">
                            <option value="">Select department</option>
                            <?php foreach ($departments as $dept): ?>
                                <option value="<?php echo $dept['id']; ?>">
                                    <?php echo htmlspecialchars($dept['department_name']); ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="employee_id" class="form-label">
                            <i class="fas fa-user-tie"></i> Specific Staff (Optional)
                        </label>
                        <select id="employee_id" name="employee_id" class="form-select">
                            <option value="">Any available staff</option>
                        </select>
                    </div>
                </div>

                <div class="grid grid-cols-2">
                    <div class="form-group">
                        <label for="priority" class="form-label">
                            <i class="fas fa-exclamation-circle"></i> Priority
                        </label>
                        <select id="priority" name="priority" class="form-select">
                            <option value="low">Low</option>
                            <option value="medium" selected>Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label" style="display: flex; align-items: center; gap: 0.5rem;">
                            <input type="checkbox" id="follow_up_required" name="follow_up_required">
                            <i class="fas fa-calendar-plus"></i> Requires Follow-up
                        </label>
                        <input type="date" id="follow_up_date" name="follow_up_date" class="form-input" 
                               style="display: none;" min="<?php echo date('Y-m-d'); ?>">
                    </div>
                </div>

                <div class="form-group">
                    <label for="call_reason" class="form-label">
                        <i class="fas fa-comment"></i> Reason for Call *
                    </label>
                    <textarea id="call_reason" name="call_reason" class="form-textarea" required 
                              placeholder="Brief description of the caller's inquiry or request" rows="3"></textarea>
                </div>

                <div class="form-group">
                    <label for="call_notes" class="form-label">
                        <i class="fas fa-sticky-note"></i> Additional Notes
                    </label>
                    <textarea id="call_notes" name="call_notes" class="form-textarea" 
                              placeholder="Any additional information or special instructions" rows="2"></textarea>
                </div>

                <div style="display: flex; gap: 1rem; justify-content: flex-end;">
                    <button type="button" class="btn btn-secondary" onclick="clearForm()">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-phone-alt"></i> Log Call & Route
                    </button>
                </div>
            </form>
        </div>
    </div>

    <!-- Active Calls & Quick Actions -->
    <div style="display: flex; flex-direction: column; gap: 1.5rem;">
        <!-- Active Calls -->
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Active Calls</h3>
                <button class="btn btn-outline" onclick="refreshActiveCalls()" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
                    <i class="fas fa-sync-alt"></i>
                </button>
            </div>
            <div class="card-content">
                <div id="active-calls-list">
                    <?php if (empty($active_calls)): ?>
                        <p style="text-align: center; color: var(--text-secondary); padding: 1rem;">
                            No active calls
                        </p>
                    <?php else: ?>
                        <?php foreach ($active_calls as $call): ?>
                            <div class="call-item" style="padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 0.375rem; margin-bottom: 0.5rem;">
                                <div style="display: flex; justify-content: between; align-items: start; margin-bottom: 0.5rem;">
                                    <div style="flex: 1;">
                                        <div style="font-weight: 500; font-size: 0.875rem;">
                                            <?php echo htmlspecialchars($call['caller_name']); ?>
                                        </div>
                                        <div style="font-size: 0.75rem; color: var(--text-secondary);">
                                            <?php echo htmlspecialchars($call['caller_phone']); ?>
                                        </div>
                                    </div>
                                    <span class="priority <?php echo $call['priority']; ?>">
                                        <?php echo ucfirst($call['priority']); ?>
                                    </span>
                                </div>
                                <div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.5rem;">
                                    <?php echo htmlspecialchars($call['department_name'] ?? 'Unassigned'); ?>
                                </div>
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <span class="call-status <?php echo $call['call_status']; ?>" id="call-status-<?php echo $call['id']; ?>">
                                        <?php echo ucfirst($call['call_status']); ?>
                                    </span>
                                    <div style="display: flex; gap: 0.25rem;">
                                        <button class="btn btn-outline" style="padding: 0.125rem 0.25rem; font-size: 0.625rem;" 
                                                onclick="transferCall(<?php echo $call['id']; ?>)">
                                            <i class="fas fa-exchange-alt"></i>
                                        </button>
                                        <button class="btn btn-success" style="padding: 0.125rem 0.25rem; font-size: 0.625rem;" 
                                                onclick="completeCall(<?php echo $call['id']; ?>)">
                                            <i class="fas fa-check"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        <?php endforeach; ?>
                    <?php endif; ?>
                </div>
            </div>
        </div>

        <!-- Follow-up Notifications -->
        <?php if (!empty($follow_ups)): ?>
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Follow-ups Today</h3>
                <span class="badge badge-warning"><?php echo count($follow_ups); ?></span>
            </div>
            <div class="card-content">
                <?php foreach ($follow_ups as $followup): ?>
                    <div style="padding: 0.5rem; border: 1px solid var(--warning-color); border-radius: 0.375rem; margin-bottom: 0.5rem; background-color: rgba(245, 158, 11, 0.1);">
                        <div style="font-weight: 500; font-size: 0.875rem;">
                            <?php echo htmlspecialchars($followup['caller_name']); ?>
                        </div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary);">
                            <?php echo htmlspecialchars($followup['caller_phone']); ?>
                        </div>
                        <div style="font-size: 0.75rem; margin-top: 0.25rem;">
                            <?php echo htmlspecialchars($followup['follow_up_notes'] ?? 'No notes'); ?>
                        </div>
                        <button class="btn btn-warning" style="padding: 0.125rem 0.5rem; font-size: 0.625rem; margin-top: 0.25rem;" 
                                onclick="makeFollowUpCall(<?php echo $followup['id']; ?>)">
                            <i class="fas fa-phone"></i> Call Now
                        </button>
                    </div>
                <?php endforeach; ?>
            </div>
        </div>
        <?php endif; ?>

        <!-- Recent Contacts -->
        <div class="card">
            <div class="card-header">
                <h3 class="card-title">Recent Contacts</h3>
            </div>
            <div class="card-content">
                <?php if (empty($recent_contacts)): ?>
                    <p style="text-align: center; color: var(--text-secondary); padding: 1rem; font-size: 0.875rem;">
                        No recent contacts
                    </p>
                <?php else: ?>
                    <?php foreach ($recent_contacts as $contact): ?>
                        <div style="padding: 0.5rem; border-bottom: 1px solid var(--border-color); cursor: pointer;" 
                             onclick="fillCallerInfo('<?php echo htmlspecialchars($contact['name']); ?>', '<?php echo htmlspecialchars($contact['phone']); ?>', '<?php echo htmlspecialchars($contact['company'] ?? ''); ?>')">
                            <div style="font-weight: 500; font-size: 0.875rem;">
                                <?php echo htmlspecialchars($contact['name']); ?>
                            </div>
                            <div style="font-size: 0.75rem; color: var(--text-secondary);">
                                <?php echo htmlspecialchars($contact['phone']); ?>
                                <?php if ($contact['company']): ?>
                                    • <?php echo htmlspecialchars($contact['company']); ?>
                                <?php endif; ?>
                            </div>
                        </div>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>
        </div>
    </div>
</div>

<!-- Caller Search Modal -->
<div id="callerSearchModal" class="modal">
    <div class="modal-content">
        <div class="modal-header">
            <h3 class="modal-title">Search Existing Caller</h3>
            <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
            <div class="form-group">
                <label for="search_query" class="form-label">Search by name or phone</label>
                <input type="text" id="search_query" class="form-input" placeholder="Enter name or phone number" 
                       oninput="searchCallers(this.value)">
            </div>
            <div id="search_results" style="max-height: 300px; overflow-y: auto;">
                <!-- Search results will be populated here -->
            </div>
        </div>
    </div>
</div>

<script>
// Follow-up checkbox toggle
document.getElementById('follow_up_required').addEventListener('change', function() {
    const followUpDate = document.getElementById('follow_up_date');
    if (this.checked) {
        followUpDate.style.display = 'block';
        followUpDate.required = true;
    } else {
        followUpDate.style.display = 'none';
        followUpDate.required = false;
        followUpDate.value = '';
    }
});

// Load department staff
function loadDepartmentStaff(departmentId) {
    const employeeSelect = document.getElementById('employee_id');
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

// Clear form
function clearForm() {
    document.getElementById('callIntakeForm').reset();
    document.getElementById('employee_id').innerHTML = '<option value="">Any available staff</option>';
    document.getElementById('follow_up_date').style.display = 'none';
}

// Fill caller info from recent contacts
function fillCallerInfo(name, phone, company) {
    document.getElementById('caller_name').value = name;
    document.getElementById('caller_phone').value = phone;
    document.getElementById('caller_company').value = company || '';
}

// Search callers
function searchCallers(query) {
    const resultsDiv = document.getElementById('search_results');
    
    if (query.length < 2) {
        resultsDiv.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 1rem;">Enter at least 2 characters to search</p>';
        return;
    }
    
    fetch(`actions/search_callers.php?q=${encodeURIComponent(query)}`)
        .then(response => response.json())
        .then(data => {
            if (data.length === 0) {
                resultsDiv.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 1rem;">No callers found</p>';
                return;
            }
            
            let html = '';
            data.forEach(caller => {
                html += `
                    <div style="padding: 0.75rem; border: 1px solid var(--border-color); border-radius: 0.375rem; margin-bottom: 0.5rem; cursor: pointer;" 
                         onclick="selectCaller('${caller.name}', '${caller.phone}', '${caller.company || ''}')">
                        <div style="font-weight: 500;">${caller.name}</div>
                        <div style="font-size: 0.875rem; color: var(--text-secondary);">${caller.phone}</div>
                        ${caller.company ? `<div style="font-size: 0.75rem; color: var(--text-secondary);">${caller.company}</div>` : ''}
                    </div>
                `;
            });
            resultsDiv.innerHTML = html;
        })
        .catch(error => {
            console.error('Search error:', error);
            resultsDiv.innerHTML = '<p style="text-align: center; color: var(--danger-color); padding: 1rem;">Error searching callers</p>';
        });
}

// Select caller from search
function selectCaller(name, phone, company) {
    fillCallerInfo(name, phone, company);
    document.getElementById('callerSearchModal').classList.remove('active');
}

// Refresh active calls
function refreshActiveCalls() {
    // Implementation for refreshing active calls
    location.reload();
}

// Transfer call
function transferCall(callId) {
    // Implementation for call transfer
    alert('Transfer call functionality - Call ID: ' + callId);
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
                refreshActiveCalls();
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

// Make follow-up call
function makeFollowUpCall(callId) {
    // Implementation for making follow-up call
    alert('Make follow-up call functionality - Call ID: ' + callId);
}
</script>

<?php include 'includes/footer.php'; ?>

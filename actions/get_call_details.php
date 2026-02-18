<?php
session_start();
require_once '../config/database.php';
require_once '../includes/functions.php';

// Check authentication
if (!isLoggedIn()) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Unauthorized']);
    exit;
}

$call_id = (int)($_GET['id'] ?? 0);

if ($call_id === 0) {
    echo json_encode(['success' => false, 'message' => 'Invalid call ID']);
    exit;
}

try {
    // Get call details
    $call = fetchOne($db, "
        SELECT c.*, d.department_name, ct.type_name as call_type,
               CONCAT(e.first_name, ' ', e.last_name) as assigned_employee,
               CONCAT(u.first_name, ' ', u.last_name) as recorded_by_name,
               co.company, co.email as contact_email
        FROM calls c
        LEFT JOIN departments d ON c.department_id = d.id
        LEFT JOIN call_types ct ON c.call_type_id = ct.id
        LEFT JOIN employees e ON c.employee_id = e.id
        LEFT JOIN users u ON c.recorded_by = u.id
        LEFT JOIN contacts co ON c.contact_id = co.id
        WHERE c.id = ?
    ", [$call_id]);

    if (!$call) {
        echo json_encode(['success' => false, 'message' => 'Call not found']);
        exit;
    }

    // Get call transfers
    $transfers = fetchAll($db, "
        SELECT ct.*, 
               fd.department_name as from_department,
               td.department_name as to_department,
               CONCAT(fe.first_name, ' ', fe.last_name) as from_employee,
               CONCAT(te.first_name, ' ', te.last_name) as to_employee,
               CONCAT(u.first_name, ' ', u.last_name) as transferred_by_name
        FROM call_transfers ct
        LEFT JOIN departments fd ON ct.from_department_id = fd.id
        LEFT JOIN departments td ON ct.to_department_id = td.id
        LEFT JOIN employees fe ON ct.from_employee_id = fe.id
        LEFT JOIN employees te ON ct.to_employee_id = te.id
        LEFT JOIN users u ON ct.transferred_by = u.id
        WHERE ct.call_id = ?
        ORDER BY ct.transfer_time ASC
    ", [$call_id]);

    // Generate HTML
    ob_start();
    ?>
    <div class="call-details">
        <div class="grid grid-cols-2" style="gap: 1.5rem; margin-bottom: 1.5rem;">
            <!-- Basic Information -->
            <div>
                <h4 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 1rem; color: var(--text-primary);">
                    Call Information
                </h4>
                <div style="space-y: 0.75rem;">
                    <div>
                        <strong>Reference:</strong> 
                        <span style="font-family: monospace;"><?php echo htmlspecialchars($call['call_reference']); ?></span>
                    </div>
                    <div>
                        <strong>Caller:</strong> <?php echo htmlspecialchars($call['caller_name']); ?>
                    </div>
                    <div>
                        <strong>Phone:</strong> <?php echo htmlspecialchars($call['caller_phone']); ?>
                    </div>
                    <?php if ($call['company']): ?>
                    <div>
                        <strong>Company:</strong> <?php echo htmlspecialchars($call['company']); ?>
                    </div>
                    <?php endif; ?>
                    <?php if ($call['contact_email']): ?>
                    <div>
                        <strong>Email:</strong> <?php echo htmlspecialchars($call['contact_email']); ?>
                    </div>
                    <?php endif; ?>
                    <div>
                        <strong>Type:</strong> 
                        <span class="badge badge-info"><?php echo htmlspecialchars($call['call_type'] ?? 'N/A'); ?></span>
                    </div>
                    <div>
                        <strong>Status:</strong> 
                        <span class="call-status <?php echo $call['call_status']; ?>">
                            <?php echo ucfirst($call['call_status']); ?>
                        </span>
                    </div>
                    <div>
                        <strong>Priority:</strong> 
                        <span class="priority <?php echo $call['priority']; ?>">
                            <?php echo ucfirst($call['priority']); ?>
                        </span>
                    </div>
                </div>
            </div>

            <!-- Assignment & Timing -->
            <div>
                <h4 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 1rem; color: var(--text-primary);">
                    Assignment & Timing
                </h4>
                <div style="space-y: 0.75rem;">
                    <div>
                        <strong>Department:</strong> <?php echo htmlspecialchars($call['department_name'] ?? 'Unassigned'); ?>
                    </div>
                    <?php if ($call['assigned_employee']): ?>
                    <div>
                        <strong>Assigned to:</strong> <?php echo htmlspecialchars($call['assigned_employee']); ?>
                    </div>
                    <?php endif; ?>
                    <div>
                        <strong>Recorded by:</strong> <?php echo htmlspecialchars($call['recorded_by_name']); ?>
                    </div>
                    <div>
                        <strong>Created:</strong> <?php echo date('M j, Y H:i', strtotime($call['created_at'])); ?>
                    </div>
                    <?php if ($call['start_time']): ?>
                    <div>
                        <strong>Started:</strong> <?php echo date('M j, Y H:i', strtotime($call['start_time'])); ?>
                    </div>
                    <?php endif; ?>
                    <?php if ($call['end_time']): ?>
                    <div>
                        <strong>Ended:</strong> <?php echo date('M j, Y H:i', strtotime($call['end_time'])); ?>
                    </div>
                    <?php endif; ?>
                    <?php if ($call['duration_seconds'] > 0): ?>
                    <div>
                        <strong>Duration:</strong> 
                        <span style="font-family: monospace;"><?php echo formatDuration($call['duration_seconds']); ?></span>
                    </div>
                    <?php endif; ?>
                </div>
            </div>
        </div>

        <!-- Call Reason -->
        <div style="margin-bottom: 1.5rem;">
            <h4 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-primary);">
                Reason for Call
            </h4>
            <div style="background-color: var(--background-color); padding: 1rem; border-radius: 0.375rem; border: 1px solid var(--border-color);">
                <?php echo nl2br(htmlspecialchars($call['call_reason'])); ?>
            </div>
        </div>

        <!-- Call Notes -->
        <?php if ($call['call_notes']): ?>
        <div style="margin-bottom: 1.5rem;">
            <h4 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-primary);">
                Additional Notes
            </h4>
            <div style="background-color: var(--background-color); padding: 1rem; border-radius: 0.375rem; border: 1px solid var(--border-color);">
                <?php echo nl2br(htmlspecialchars($call['call_notes'])); ?>
            </div>
        </div>
        <?php endif; ?>

        <!-- Follow-up Information -->
        <?php if ($call['follow_up_required']): ?>
        <div style="margin-bottom: 1.5rem;">
            <h4 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-primary);">
                Follow-up Required
            </h4>
            <div style="background-color: rgba(245, 158, 11, 0.1); padding: 1rem; border-radius: 0.375rem; border: 1px solid var(--warning-color);">
                <div><strong>Follow-up Date:</strong> <?php echo $call['follow_up_date'] ? date('M j, Y', strtotime($call['follow_up_date'])) : 'Not specified'; ?></div>
                <?php if ($call['follow_up_notes']): ?>
                <div style="margin-top: 0.5rem;">
                    <strong>Follow-up Notes:</strong><br>
                    <?php echo nl2br(htmlspecialchars($call['follow_up_notes'])); ?>
                </div>
                <?php endif; ?>
            </div>
        </div>
        <?php endif; ?>

        <!-- Call Transfers -->
        <?php if (!empty($transfers)): ?>
        <div>
            <h4 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-primary);">
                Transfer History
            </h4>
            <div style="space-y: 0.75rem;">
                <?php foreach ($transfers as $transfer): ?>
                <div style="background-color: var(--background-color); padding: 1rem; border-radius: 0.375rem; border: 1px solid var(--border-color);">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                        <div>
                            <strong>From:</strong> <?php echo htmlspecialchars($transfer['from_department'] ?? 'N/A'); ?>
                            <?php if ($transfer['from_employee']): ?>
                                (<?php echo htmlspecialchars($transfer['from_employee']); ?>)
                            <?php endif; ?>
                        </div>
                        <div style="font-size: 0.875rem; color: var(--text-secondary);">
                            <?php echo date('M j, Y H:i', strtotime($transfer['transfer_time'])); ?>
                        </div>
                    </div>
                    <div style="margin-bottom: 0.5rem;">
                        <strong>To:</strong> <?php echo htmlspecialchars($transfer['to_department'] ?? 'N/A'); ?>
                        <?php if ($transfer['to_employee']): ?>
                            (<?php echo htmlspecialchars($transfer['to_employee']); ?>)
                        <?php endif; ?>
                    </div>
                    <div style="margin-bottom: 0.5rem;">
                        <strong>Transferred by:</strong> <?php echo htmlspecialchars($transfer['transferred_by_name']); ?>
                    </div>
                    <?php if ($transfer['transfer_reason']): ?>
                    <div style="margin-bottom: 0.5rem;">
                        <strong>Reason:</strong> <?php echo htmlspecialchars($transfer['transfer_reason']); ?>
                    </div>
                    <?php endif; ?>
                    <?php if ($transfer['transfer_notes']): ?>
                    <div>
                        <strong>Notes:</strong> <?php echo htmlspecialchars($transfer['transfer_notes']); ?>
                    </div>
                    <?php endif; ?>
                </div>
                <?php endforeach; ?>
            </div>
        </div>
        <?php endif; ?>
    </div>
    <?php
    $html = ob_get_clean();

    echo json_encode([
        'success' => true,
        'html' => $html
    ]);

} catch (PDOException $e) {
    error_log("Get call details error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Database error occurred']);
} catch (Exception $e) {
    error_log("Get call details error: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'An error occurred while loading call details']);
}
?>

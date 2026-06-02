-- ============================================================
-- CHED Exchange — Comprehensive Migration v1
-- Run this against: cocobod_telephone_exchange
-- Date: 2026-06-02
-- Safe to run multiple times (idempotent)
-- BACK UP DATABASE BEFORE RUNNING
-- ============================================================

USE cocobod_telephone_exchange;

-- ============================================================
-- FIX 1: Add 'manager' to users.role ENUM (if not present)
-- ============================================================
SET @col_type = (
    SELECT COLUMN_TYPE FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'cocobod_telephone_exchange'
      AND TABLE_NAME   = 'users'
      AND COLUMN_NAME  = 'role'
);

SET @fix_role = IF(
    @col_type NOT LIKE '%manager%',
    'ALTER TABLE users MODIFY COLUMN role ENUM(''admin'', ''receptionist'', ''technician'', ''manager'') NOT NULL',
    'SELECT ''manager role already present'' AS info'
);
PREPARE s1 FROM @fix_role; EXECUTE s1; DEALLOCATE PREPARE s1;

-- ============================================================
-- FIX 2: Insert manager demo user (if missing)
-- ============================================================
INSERT IGNORE INTO users (username, email, password_hash, role, first_name, last_name, phone, is_active)
VALUES ('manager', 'manager@cocobod.gov.gh',
        '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        'manager', 'Kofi', 'Antwi', '+233 24 000 0006', TRUE);

-- ============================================================
-- FIX 3: Create notifications table (if it doesn't exist)
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id                 INT PRIMARY KEY AUTO_INCREMENT,
    user_id            INT,
    title              VARCHAR(255) NOT NULL,
    message            TEXT,
    notification_type  ENUM('fault','bill','call','maintenance','message','conference','system') DEFAULT 'system',
    reference_table    VARCHAR(100),
    reference_id       INT,
    is_read            BOOLEAN DEFAULT FALSE,
    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id   (user_id),
    INDEX idx_is_read   (is_read),
    INDEX idx_created_at(created_at)
) ENGINE=InnoDB;

-- ============================================================
-- FIX 4: Add missing columns to notifications if table existed
--         but was missing the new columns (partial schema)
-- ============================================================
SET @has_notif_type = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'cocobod_telephone_exchange'
      AND TABLE_NAME   = 'notifications'
      AND COLUMN_NAME  = 'notification_type'
);
SET @add_notif_type = IF(
    @has_notif_type = 0,
    'ALTER TABLE notifications ADD COLUMN notification_type ENUM(''fault'',''bill'',''call'',''maintenance'',''message'',''conference'',''system'') DEFAULT ''system'' AFTER message',
    'SELECT ''notification_type already exists'' AS info'
);
PREPARE s2 FROM @add_notif_type; EXECUTE s2; DEALLOCATE PREPARE s2;

SET @has_ref_table = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'cocobod_telephone_exchange'
      AND TABLE_NAME   = 'notifications'
      AND COLUMN_NAME  = 'reference_table'
);
SET @add_ref_table = IF(
    @has_ref_table = 0,
    'ALTER TABLE notifications ADD COLUMN reference_table VARCHAR(100) AFTER notification_type',
    'SELECT ''reference_table already exists'' AS info'
);
PREPARE s3 FROM @add_ref_table; EXECUTE s3; DEALLOCATE PREPARE s3;

SET @has_ref_id = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'cocobod_telephone_exchange'
      AND TABLE_NAME   = 'notifications'
      AND COLUMN_NAME  = 'reference_id'
);
SET @add_ref_id = IF(
    @has_ref_id = 0,
    'ALTER TABLE notifications ADD COLUMN reference_id INT AFTER reference_table',
    'SELECT ''reference_id already exists'' AS info'
);
PREPARE s4 FROM @add_ref_id; EXECUTE s4; DEALLOCATE PREPARE s4;

-- ============================================================
-- FIX 5: Ensure notification_type ENUM includes 'message' and
--         'conference' (needed for new features)
-- ============================================================
ALTER TABLE notifications
    MODIFY COLUMN notification_type
    ENUM('fault','bill','call','maintenance','message','conference','system')
    DEFAULT 'system';

-- ============================================================
-- FIX 6: Adjust bills table columns to match application code
-- ============================================================

-- Add total_duration_seconds if not exists
SET @has_dur_sec = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'cocobod_telephone_exchange'
      AND TABLE_NAME   = 'bills'
      AND COLUMN_NAME  = 'total_duration_seconds'
);
SET @add_dur_sec = IF(
    @has_dur_sec = 0,
    'ALTER TABLE bills ADD COLUMN total_duration_seconds INT DEFAULT 0 AFTER total_calls',
    'SELECT ''total_duration_seconds already exists'' AS info'
);
PREPARE s_dur FROM @add_dur_sec; EXECUTE s_dur; DEALLOCATE PREPARE s_dur;

-- Add subtotal if not exists
SET @has_subtotal = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'cocobod_telephone_exchange'
      AND TABLE_NAME   = 'bills'
      AND COLUMN_NAME  = 'subtotal'
);
SET @add_subtotal = IF(
    @has_subtotal = 0,
    'ALTER TABLE bills ADD COLUMN subtotal DECIMAL(12,2) DEFAULT 0.00 AFTER total_duration_seconds',
    'SELECT ''subtotal already exists'' AS info'
);
PREPARE s_sub FROM @add_subtotal; EXECUTE s_sub; DEALLOCATE PREPARE s_sub;

-- Sync data from legacy columns to new columns if needed
SET @has_dur_min = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'cocobod_telephone_exchange'
      AND TABLE_NAME   = 'bills'
      AND COLUMN_NAME  = 'total_duration_minutes'
);
SET @sync_dur = IF(
    @has_dur_min > 0,
    'UPDATE bills SET total_duration_seconds = total_duration_minutes * 60 WHERE total_duration_seconds = 0',
    'SELECT ''no total_duration_minutes to sync'' AS info'
);
PREPARE s_sync_dur FROM @sync_dur; EXECUTE s_sync_dur; DEALLOCATE PREPARE s_sync_dur;

-- If final_amount is present, subtotal was total_amount, and total_amount should be final_amount
SET @has_final_amt = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'cocobod_telephone_exchange'
      AND TABLE_NAME   = 'bills'
      AND COLUMN_NAME  = 'final_amount'
);
SET @sync_amt = IF(
    @has_final_amt > 0,
    'UPDATE bills SET subtotal = total_amount, total_amount = final_amount WHERE subtotal = 0',
    'SELECT ''no final_amount to sync'' AS info'
);
PREPARE s_sync_amt FROM @sync_amt; EXECUTE s_sync_amt; DEALLOCATE PREPARE s_sync_amt;

-- Make sure ENUM matches lowercase values
-- First, temporarily update existing status values to lowercase
UPDATE bills SET bill_status = 'paid'      WHERE LOWER(bill_status) = 'paid';
UPDATE bills SET bill_status = 'pending'   WHERE LOWER(bill_status) = 'pending';
UPDATE bills SET bill_status = 'overdue'   WHERE LOWER(bill_status) = 'overdue';
UPDATE bills SET bill_status = 'cancelled' WHERE LOWER(bill_status) = 'cancelled';
UPDATE bills SET bill_status = 'sent'      WHERE LOWER(bill_status) = 'sent';
UPDATE bills SET bill_status = 'draft'     WHERE LOWER(bill_status) = 'draft';

-- Alter the enum definition
ALTER TABLE bills MODIFY COLUMN bill_status ENUM('draft', 'pending', 'sent', 'paid', 'overdue', 'cancelled') DEFAULT 'draft';

-- ============================================================
-- FIX 7: Convert critical tables to InnoDB
-- ============================================================
ALTER TABLE `calls`              ENGINE=InnoDB;
ALTER TABLE `contacts`           ENGINE=InnoDB;
ALTER TABLE `employees`          ENGINE=InnoDB;
ALTER TABLE `call_types`         ENGINE=InnoDB;
ALTER TABLE `call_transfers`     ENGINE=InnoDB;
ALTER TABLE `bill_types`         ENGINE=InnoDB;
ALTER TABLE `bill_items`         ENGINE=InnoDB;
ALTER TABLE `ranks`              ENGINE=InnoDB;
ALTER TABLE `notifications`      ENGINE=InnoDB;

-- ============================================================
-- FIX 8: Create internal_messages table
-- ============================================================
CREATE TABLE IF NOT EXISTS internal_messages (
    id           INT PRIMARY KEY AUTO_INCREMENT,
    sender_id    INT NOT NULL,
    recipient_id INT NOT NULL,
    subject      VARCHAR(255) NOT NULL,
    body         TEXT NOT NULL,
    priority     ENUM('normal','urgent') DEFAULT 'normal',
    is_read      BOOLEAN DEFAULT FALSE,
    parent_id    INT DEFAULT NULL,
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    read_at      TIMESTAMP NULL,
    FOREIGN KEY (sender_id)    REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id)    REFERENCES internal_messages(id) ON DELETE SET NULL,
    INDEX idx_recipient (recipient_id),
    INDEX idx_sender    (sender_id),
    INDEX idx_is_read   (is_read),
    INDEX idx_created   (created_at)
) ENGINE=InnoDB;

-- ============================================================
-- FIX 9: Create conferences table
-- ============================================================
CREATE TABLE IF NOT EXISTS conferences (
    id             INT PRIMARY KEY AUTO_INCREMENT,
    title          VARCHAR(255) NOT NULL,
    organizer_id   INT NOT NULL,
    scheduled_at   DATETIME NOT NULL,
    duration_mins  INT DEFAULT 60,
    agenda         TEXT,
    status         ENUM('scheduled','in_progress','completed','cancelled') DEFAULT 'scheduled',
    created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_organizer    (organizer_id),
    INDEX idx_scheduled    (scheduled_at),
    INDEX idx_status       (status)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS conference_participants (
    id              INT PRIMARY KEY AUTO_INCREMENT,
    conference_id   INT NOT NULL,
    user_id         INT NOT NULL,
    response_status ENUM('pending','accepted','declined') DEFAULT 'pending',
    FOREIGN KEY (conference_id) REFERENCES conferences(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id)       REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uniq_conf_user (conference_id, user_id),
    INDEX idx_user   (user_id),
    INDEX idx_conf   (conference_id)
) ENGINE=InnoDB;

-- ============================================================
-- FIX 10: Adjust system settings
-- ============================================================
UPDATE system_settings SET setting_value = '60' WHERE setting_key = 'session_timeout';

-- ============================================================
-- VERIFICATION
-- ============================================================
SELECT 'MIGRATION COMPLETE' AS result;
SHOW COLUMNS FROM bills;
SHOW COLUMNS FROM notifications;

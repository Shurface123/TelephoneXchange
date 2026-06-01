-- ============================================================
-- COCOBOD CHED Telephone Exchange — Data Integrity Fixes
-- Run against: cocobod_telephone_exchange
-- Date: 2026-05-31
-- BACK UP DATABASE BEFORE RUNNING
-- ============================================================

USE cocobod_telephone_exchange;

-- ============================================================
-- FIX 1: Update calls.call_date and call_time from start_time
-- (Only if call_date column exists — legacy schema may have it)
-- ============================================================
SET @has_call_date = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'cocobod_telephone_exchange'
      AND TABLE_NAME = 'calls'
      AND COLUMN_NAME = 'call_date'
);

SET @sql = IF(@has_call_date > 0,
    'UPDATE calls SET call_date = DATE(start_time), call_time = TIME(start_time) WHERE start_time IS NOT NULL AND (call_date IS NULL OR call_date = "0000-00-00")',
    'SELECT "call_date column not present - skipping" AS info'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================================
-- FIX 2: Update bills.generated_date from created_at
-- ============================================================
SET @has_gen_date = (
    SELECT COUNT(*) FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'cocobod_telephone_exchange'
      AND TABLE_NAME = 'bills'
      AND COLUMN_NAME = 'generated_date'
);

SET @sql2 = IF(@has_gen_date > 0,
    'UPDATE bills SET generated_date = DATE(created_at) WHERE (generated_date IS NULL OR generated_date = "0000-00-00")',
    'SELECT "generated_date column not present - skipping" AS info'
);
PREPARE stmt2 FROM @sql2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- ============================================================
-- FIX 3: Deduplicate call_types
-- Keep only the records with type_code (unique constraint).
-- If duplicates exist (seeded twice), remove lower IDs.
-- Safe: only deletes if no calls reference those IDs.
-- ============================================================
DELETE ct FROM call_types ct
WHERE ct.id NOT IN (
    SELECT id FROM (
        SELECT MIN(id) as id FROM call_types GROUP BY type_code
    ) AS keep
)
AND ct.id NOT IN (SELECT DISTINCT call_type_id FROM calls);

-- ============================================================
-- FIX 4: Deduplicate ranks
-- Keep records with rank_level populated (higher IDs from second seed).
-- Safe: only deletes if no employees reference those IDs.
-- ============================================================
DELETE r FROM ranks r
WHERE r.id NOT IN (
    SELECT id FROM (
        SELECT MIN(id) as id FROM ranks GROUP BY rank_name
    ) AS keep
)
AND r.id NOT IN (
    SELECT rank_id FROM employees WHERE rank_id IS NOT NULL
);

-- ============================================================
-- FIX 5: Deduplicate bill_types
-- Safe: only deletes if no bills reference those IDs.
-- ============================================================
DELETE bt FROM bill_types bt
WHERE bt.id NOT IN (
    SELECT id FROM (
        SELECT MIN(id) as id FROM bill_types GROUP BY type_code
    ) AS keep
)
AND bt.id NOT IN (SELECT DISTINCT bill_type_id FROM bills);

-- ============================================================
-- FIX 6: Populate staff.department_id from job title mapping
-- Only runs if staff table exists and has department_id column
-- ============================================================
SET @has_staff = (
    SELECT COUNT(*) FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = 'cocobod_telephone_exchange'
      AND TABLE_NAME = 'staff'
);

SET @sql3 = IF(@has_staff > 0,
    'UPDATE staff SET department_id = (SELECT id FROM departments WHERE department_name LIKE CONCAT("%", SUBSTRING_INDEX(job_title, " ", 1), "%") LIMIT 1) WHERE department_id IS NULL AND job_title IS NOT NULL',
    'SELECT "staff table not present - skipping" AS info'
);
PREPARE stmt3 FROM @sql3;
EXECUTE stmt3;
DEALLOCATE PREPARE stmt3;

-- ============================================================
-- FIX 7: Convert all MyISAM tables to InnoDB for transactional integrity
-- ============================================================
-- Check and convert each table safely
ALTER TABLE `calls` ENGINE=InnoDB;
ALTER TABLE `contacts` ENGINE=InnoDB;
ALTER TABLE `employees` ENGINE=InnoDB;
ALTER TABLE `call_types` ENGINE=InnoDB;
ALTER TABLE `call_transfers` ENGINE=InnoDB;
ALTER TABLE `bill_types` ENGINE=InnoDB;
ALTER TABLE `bill_items` ENGINE=InnoDB;
ALTER TABLE `ranks` ENGINE=InnoDB;

-- Convert legacy/optional tables if they exist
SET @sql4 = IF((SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='cocobod_telephone_exchange' AND TABLE_NAME='staff') > 0,
    'ALTER TABLE staff ENGINE=InnoDB', 'SELECT "staff table not present" AS info');
PREPARE stmt4 FROM @sql4; EXECUTE stmt4; DEALLOCATE PREPARE stmt4;

SET @sql5 = IF((SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='cocobod_telephone_exchange' AND TABLE_NAME='fault_reporting') > 0,
    'ALTER TABLE fault_reporting ENGINE=InnoDB', 'SELECT "fault_reporting table not present" AS info');
PREPARE stmt5 FROM @sql5; EXECUTE stmt5; DEALLOCATE PREPARE stmt5;

SET @sql6 = IF((SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='cocobod_telephone_exchange' AND TABLE_NAME='fault_types') > 0,
    'ALTER TABLE fault_types ENGINE=InnoDB', 'SELECT "fault_types table not present" AS info');
PREPARE stmt6 FROM @sql6; EXECUTE stmt6; DEALLOCATE PREPARE stmt6;

SET @sql7 = IF((SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='cocobod_telephone_exchange' AND TABLE_NAME='telecel_tariffs') > 0,
    'ALTER TABLE telecel_tariffs ENGINE=InnoDB', 'SELECT "telecel_tariffs table not present" AS info');
PREPARE stmt7 FROM @sql7; EXECUTE stmt7; DEALLOCATE PREPARE stmt7;

SET @sql8 = IF((SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='cocobod_telephone_exchange' AND TABLE_NAME='assets') > 0,
    'ALTER TABLE assets ENGINE=InnoDB', 'SELECT "assets table not present" AS info');
PREPARE stmt8 FROM @sql8; EXECUTE stmt8; DEALLOCATE PREPARE stmt8;

SET @sql9 = IF((SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='cocobod_telephone_exchange' AND TABLE_NAME='notifications') > 0,
    'ALTER TABLE notifications ENGINE=InnoDB', 'SELECT "notifications table not present" AS info');
PREPARE stmt9 FROM @sql9; EXECUTE stmt9; DEALLOCATE PREPARE stmt9;

SET @sql10 = IF((SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='cocobod_telephone_exchange' AND TABLE_NAME='system_logs') > 0,
    'ALTER TABLE system_logs ENGINE=InnoDB', 'SELECT "system_logs table not present" AS info');
PREPARE stmt10 FROM @sql10; EXECUTE stmt10; DEALLOCATE PREPARE stmt10;

SET @sql11 = IF((SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA='cocobod_telephone_exchange' AND TABLE_NAME='user_roles') > 0,
    'ALTER TABLE user_roles ENGINE=InnoDB', 'SELECT "user_roles table not present" AS info');
PREPARE stmt11 FROM @sql11; EXECUTE stmt11; DEALLOCATE PREPARE stmt11;

-- ============================================================
-- FIX 8: Create notifications table if it doesn't exist
-- This is needed for the notification bell feature
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    notification_type ENUM('fault', 'bill', 'call', 'maintenance', 'system') DEFAULT 'system',
    reference_table VARCHAR(100),
    reference_id INT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_is_read (is_read),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB;

-- ============================================================
-- FIX 9: Add 'manager' to users.role ENUM if not present
-- ============================================================
SET @role_enum = (
    SELECT COLUMN_TYPE FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = 'cocobod_telephone_exchange'
      AND TABLE_NAME = 'users'
      AND COLUMN_NAME = 'role'
);

-- Only alter if manager not already in enum
SET @sql12 = IF(@role_enum NOT LIKE '%manager%',
    'ALTER TABLE users MODIFY COLUMN role ENUM(''admin'', ''receptionist'', ''technician'', ''manager'') NOT NULL',
    'SELECT "manager role already exists" AS info'
);
PREPARE stmt12 FROM @sql12; EXECUTE stmt12; DEALLOCATE PREPARE stmt12;

-- ============================================================
-- FIX 10: Insert a demo Manager user if not exists
-- Password = "password" (same bcrypt hash as other seed users)
-- ============================================================
INSERT IGNORE INTO users (username, email, password_hash, role, first_name, last_name, phone, is_active)
VALUES ('manager', 'manager@cocobod.gov.gh', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'manager', 'Kofi', 'Antwi', '+233 24 000 0006', TRUE);

-- ============================================================
-- FIX 11: Update system_settings session_timeout to 60 minutes
-- ============================================================
UPDATE system_settings SET setting_value = '60' WHERE setting_key = 'session_timeout';

-- ============================================================
-- VERIFICATION QUERIES (run these after to confirm success)
-- ============================================================
SELECT 'VERIFICATION' AS section;
SELECT TABLE_NAME, ENGINE FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'cocobod_telephone_exchange'
ORDER BY TABLE_NAME;

SELECT 'call_types count' AS info, COUNT(*) as cnt FROM call_types;
SELECT 'ranks count' AS info, COUNT(*) as cnt FROM ranks;
SELECT 'bill_types count' AS info, COUNT(*) as cnt FROM bill_types;
SELECT 'notifications table' AS info, COUNT(*) as cnt FROM notifications;
SELECT 'users with roles' AS info, role, COUNT(*) as cnt FROM users GROUP BY role;

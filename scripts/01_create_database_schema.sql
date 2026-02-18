-- CHED Telephone Exchange System Database Schema
-- COCOBOD (Cocoa Health and Extension Division)

-- Create database
CREATE DATABASE IF NOT EXISTS cocobod_telephone_exchange;
USE cocobod_telephone_exchange;

-- Users table for authentication and role management
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'receptionist', 'technician', 'staff') NOT NULL,
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Departments table
CREATE TABLE departments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10) UNIQUE NOT NULL,
    description TEXT,
    head_of_department INT,
    extension VARCHAR(10),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (head_of_department) REFERENCES users(id)
);

-- Staff/Employees table
CREATE TABLE employees (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    employee_id VARCHAR(20) UNIQUE NOT NULL,
    department_id INT NOT NULL,
    position VARCHAR(100),
    extension VARCHAR(10),
    direct_line VARCHAR(20),
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (department_id) REFERENCES departments(id)
);

-- Call types table
CREATE TABLE call_types (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    rate_per_minute DECIMAL(10,2) DEFAULT 0.00,
    is_active BOOLEAN DEFAULT TRUE
);

-- Contacts/Callers table
CREATE TABLE contacts (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(100),
    organization VARCHAR(100),
    address TEXT,
    notes TEXT,
    is_frequent_caller BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Calls table - main call logging
CREATE TABLE calls (
    id INT PRIMARY KEY AUTO_INCREMENT,
    call_reference VARCHAR(20) UNIQUE NOT NULL,
    contact_id INT,
    caller_name VARCHAR(100) NOT NULL,
    caller_phone VARCHAR(20) NOT NULL,
    department_id INT,
    employee_id INT,
    call_type_id INT NOT NULL,
    reason_for_call TEXT,
    call_status ENUM('pending', 'connected', 'completed', 'missed', 'cancelled') DEFAULT 'pending',
    call_start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    call_end_time TIMESTAMP NULL,
    duration_minutes INT DEFAULT 0,
    notes TEXT,
    receptionist_id INT NOT NULL,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_date DATE NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contact_id) REFERENCES contacts(id),
    FOREIGN KEY (department_id) REFERENCES departments(id),
    FOREIGN KEY (employee_id) REFERENCES employees(id),
    FOREIGN KEY (call_type_id) REFERENCES call_types(id),
    FOREIGN KEY (receptionist_id) REFERENCES users(id)
);

-- Bill types table
CREATE TABLE bill_types (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL,
    description TEXT,
    billing_cycle ENUM('daily', 'weekly', 'monthly', 'yearly') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE
);

-- Bills/Invoices table
CREATE TABLE bills (
    id INT PRIMARY KEY AUTO_INCREMENT,
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    account_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(50),
    bill_type_id INT NOT NULL,
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    total_calls INT DEFAULT 0,
    total_duration_minutes INT DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0.00,
    service_charges DECIMAL(10,2) DEFAULT 0.00,
    tax_amount DECIMAL(10,2) DEFAULT 0.00,
    status ENUM('pending', 'paid', 'overdue', 'cancelled') DEFAULT 'pending',
    due_date DATE,
    paid_date DATE NULL,
    payment_method VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (bill_type_id) REFERENCES bill_types(id)
);

-- Bill items table (detailed breakdown)
CREATE TABLE bill_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    bill_id INT NOT NULL,
    call_id INT,
    service_type VARCHAR(50),
    description TEXT,
    quantity INT DEFAULT 1,
    unit_rate DECIMAL(10,2),
    amount DECIMAL(10,2),
    FOREIGN KEY (bill_id) REFERENCES bills(id),
    FOREIGN KEY (call_id) REFERENCES calls(id)
);

-- Fault reporting table
CREATE TABLE fault_reports (
    id INT PRIMARY KEY AUTO_INCREMENT,
    ticket_number VARCHAR(20) UNIQUE NOT NULL,
    fault_type ENUM('hardware', 'software', 'network', 'line_issue', 'equipment', 'other') NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    location VARCHAR(100),
    equipment_affected VARCHAR(100),
    priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    status ENUM('open', 'in_progress', 'resolved', 'closed', 'cancelled') DEFAULT 'open',
    reported_by INT NOT NULL,
    assigned_to INT NULL,
    reported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_at TIMESTAMP NULL,
    resolved_at TIMESTAMP NULL,
    resolution_notes TEXT,
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    FOREIGN KEY (reported_by) REFERENCES users(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id)
);

-- Maintenance logs table
CREATE TABLE maintenance_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    fault_report_id INT,
    maintenance_type ENUM('preventive', 'corrective', 'emergency') NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    technician_id INT NOT NULL,
    scheduled_date DATE,
    completed_date DATE,
    duration_hours DECIMAL(4,2),
    cost DECIMAL(10,2),
    parts_used TEXT,
    status ENUM('scheduled', 'in_progress', 'completed', 'cancelled') DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (fault_report_id) REFERENCES fault_reports(id),
    FOREIGN KEY (technician_id) REFERENCES users(id)
);

-- System settings table
CREATE TABLE system_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT,
    description TEXT,
    updated_by INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- Audit trail table
CREATE TABLE audit_trail (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    table_name VARCHAR(50),
    record_id INT,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Create indexes for better performance
CREATE INDEX idx_calls_date ON calls(call_start_time);
CREATE INDEX idx_calls_status ON calls(call_status);
CREATE INDEX idx_calls_department ON calls(department_id);
CREATE INDEX idx_bills_status ON bills(status);
CREATE INDEX idx_bills_period ON bills(billing_period_start, billing_period_end);
CREATE INDEX idx_fault_reports_status ON fault_reports(status);
CREATE INDEX idx_contacts_phone ON contacts(phone);

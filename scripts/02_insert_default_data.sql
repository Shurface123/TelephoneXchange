-- Insert default data for CHED Telephone Exchange System

-- Insert default call types
INSERT INTO call_types (name, description, rate_per_minute) VALUES
('Internal', 'Calls within COCOBOD departments', 0.00),
('Local', 'Local calls within the city', 0.50),
('National', 'National long distance calls', 1.50),
('International', 'International calls', 5.00),
('Emergency', 'Emergency calls', 0.00);

-- Insert default bill types
INSERT INTO bill_types (name, description, billing_cycle) VALUES
('Daily Billing', 'End of day billing cycle', 'daily'),
('Weekly Billing', 'Weekly billing cycle', 'weekly'),
('Monthly Billing', 'Monthly billing cycle', 'monthly'),
('Annual Billing', 'Yearly billing cycle', 'yearly');

-- Insert departments 
INSERT INTO departments (department_name, department_code, description, phone_extension) VALUES
('Directorate', 'DIR', 'Directorate Department', NULL),
('Executive Director', 'EXDIR', 'Executive Director Office', '490'),
('Dep. Executive Director (Ops)', 'DEDOPS', 'Deputy Executive Director Operations', '491'),
('Dep. Executive Director (Extension)', 'DEDEXT', 'Deputy Executive Director Extension', '463'),
('Directorate Secretariat', 'DIRSEC', 'Secretariat under Directorate', '493'),

('Human Resources', 'HR', 'Human Resource Department', '442'),
('Human Resource Manager (P&I)', 'HRPI', 'Personnel & Industrial Relations Manager', '445'),
('Dep. Human Resource Manager', 'DHRM', 'Deputy Human Resource Manager', '446'),
('Human Resource Secretariat', 'HRSEC', 'Human Resource Secretariat', '443'),
('Record Room', 'HRREC', 'HR Record Room', '448'),
('Dispatch', 'HRDISP', 'HR Dispatch Unit', '444'),
('Registry', 'HRREG', 'HR Registry', '450'),

('Telephone Exchange', 'TELEX', 'Telephone Exchange Office', '400'),

('Accounts', 'ACC', 'Accounts Department', '405'),
('Accounts Manager', 'ACCMGR', 'Accounts Manager', '405'),
('Dep. Accounts Manager', 'DACCM', 'Deputy Accounts Manager', '412'),
('Accounts Secretariat', 'ACCSEC', 'Accounts Secretariat', '415'),
('Reconciliation Office', 'RECOFF', 'Reconciliation Office', '498'),
('Cash Office', 'CASH', 'Cashier Office', '413'),

('Procurement', 'PROC', 'Procurement Department', '494'),
('Deputy Procurement Manager', 'DPM', 'Deputy Procurement Manager', '494'),
('Prin. Procurement Officer', 'PPO', 'Principal Procurement Officer', '489'),

('Audit', 'AUD', 'Audit Department', '428'),
('Audit Manager', 'AUDMGR', 'Audit Manager Office', '428'),
('Dep. Audit Manager', 'DAUDM', 'Deputy Audit Manager', '430'),
('Audit Secretariat', 'AUDSEC', 'Audit Secretariat', '429'),

('Technical', 'TECH', 'Technical Department', '472'),
('Technical Manager PCU/M&E', 'TMPCU', 'Technical Manager PCU/M&E', '472'),
('Dep. Technical Managers', 'DTECHM', 'Deputy Technical Managers', '474'),

('CODAPEC', 'CODA', 'Cocoa Diseases and Pest Control Unit', '468'),
('CODAPEC Secretariat', 'CODASEC', 'CODAPEC Secretariat', '469'),

('Cartography', 'CARTO', 'Cartography Department', '455'),
('Cartography Secretariat', 'CARTSEC', 'Cartography Secretariat', '460'),

('Estate', 'EST', 'Estate Department', '438'),
('Estate Secretariat', 'ESTSEC', 'Estate Secretariat', '440'),

('Information Systems', 'INFOSYS', 'Information Systems Department', '407'),
('Info. Systems Secretariat', 'INFSEC', 'Information Systems Secretariat', '408'),

('Transport', 'TRANSP', 'Transport Department', '482'),
('Transport Secretariat', 'TRANSEC', 'Transport Secretariat', '483'),

('Security', 'SEC', 'Security Department', '495'),
('Principal Security Guard', 'PSECG', 'Principal Security Guard', '497');


-- Insert default admin user (password: admin123 - should be changed)
INSERT INTO users (username, email, password_hash, role, first_name, last_name, phone) VALUES
('admin', 'admin@cocobod.gov.gh', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'System', 'Administrator', '+233200000000'),
('receptionist', 'reception@cocobod.gov.gh', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'receptionist', 'Main', 'Receptionist', '+233200000001'),
('technician', 'tech@cocobod.gov.gh', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'technician', 'IT', 'Technician', '+233200000002');

-- Insert system settings
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('company_name', 'COCOBOD - Cocoa Health and Extension Division', 'Company name for billing'),
('company_address', 'P.O. Box M37, Accra, Ghana', 'Company address'),
('company_phone', '+233-30-2664466', 'Main company phone'),
('tax_rate', '12.5', 'VAT/Tax rate percentage'),
('currency', 'GHS', 'Currency code'),
('billing_prefix', 'CHED', 'Prefix for invoice numbers'),
('max_call_duration', '120', 'Maximum call duration in minutes'),
('auto_billing_enabled', '1', 'Enable automatic billing');

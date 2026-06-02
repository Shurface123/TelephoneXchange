-- ============================================================
-- Migration 002: Normalise bill_types table
-- Run against: cocobod_telephone_exchange
-- Date: 2026-06-02
-- Safe to run multiple times (uses INSERT IGNORE)
-- ============================================================

USE cocobod_telephone_exchange;

-- Fix any existing bill_types rows that have NULL billing_period
UPDATE bill_types SET billing_period = 'daily'   WHERE LOWER(type_name) LIKE '%daily%'   AND (billing_period IS NULL OR billing_period = '');
UPDATE bill_types SET billing_period = 'weekly'  WHERE LOWER(type_name) LIKE '%weekly%'  AND (billing_period IS NULL OR billing_period = '');
UPDATE bill_types SET billing_period = 'monthly' WHERE LOWER(type_name) LIKE '%monthly%' AND (billing_period IS NULL OR billing_period = '');
UPDATE bill_types SET billing_period = 'yearly'  WHERE LOWER(type_name) LIKE '%year%'    AND (billing_period IS NULL OR billing_period = '');

-- Ensure the four canonical bill types exist
INSERT IGNORE INTO bill_types (id, type_name, type_code, billing_period, description, is_active)
VALUES
  (5, 'Daily Billing',   'DAY',  'daily',   'Bills generated for a single day',    TRUE),
  (6, 'Weekly Billing',  'WKL',  'weekly',  'Bills generated per calendar week',   TRUE),
  (7, 'Monthly Billing', 'MTH',  'monthly', 'Bills generated per calendar month',  TRUE),
  (8, 'Annual Billing',  'ANN',  'yearly',  'Bills generated per financial year',  TRUE);

SELECT 'bill_types fix complete' AS result;
SELECT id, type_name, type_code, billing_period FROM bill_types ORDER BY id;

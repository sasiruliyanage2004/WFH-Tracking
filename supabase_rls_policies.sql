-- ==========================================
-- SUPABASE ROW LEVEL SECURITY (RLS) MIGRATION
-- ==========================================
-- This script enables Row Level Security (RLS) on all core application tables.
-- By default, enabling RLS without creating public SELECT/INSERT policies blocks
-- any leaked public anon keys from accessing or modifying database records.
-- Server-side calls using the `service_role` key will continue to bypass RLS and function normally.

-- 1. Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE screenshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;

-- 2. Confirm RLS status
-- All SELECT, INSERT, UPDATE, and DELETE operations using the public 'anon' key
-- will now be rejected by default, securing the database against API key leaks.

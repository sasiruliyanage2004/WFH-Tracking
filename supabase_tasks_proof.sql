-- =======================================================
-- MIGRATION: ADD PROOF OF WORK & COMMENTS TO TASKS
-- =======================================================
-- This script adds the columns necessary for employees to submit
-- proof of work (links and files) and for adding task comments.

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS proof_links text[] DEFAULT '{}';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS proof_files text[] DEFAULT '{}';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS comments jsonb DEFAULT '[]';
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS submitted_at timestamp with time zone;

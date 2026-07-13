-- Add color column to system_announcements table
ALTER TABLE public.system_announcements 
ADD COLUMN IF NOT EXISTS color TEXT DEFAULT '#f57c00';

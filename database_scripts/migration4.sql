-- Migration 4: Auto-Checkout Heartbeat Tracking
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS is_auto_checkout BOOLEAN DEFAULT FALSE;

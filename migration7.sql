-- Create devices table to track hardware installations
CREATE TABLE IF NOT EXISTS public.devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    machine_id TEXT NOT NULL,
    employee_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    hostname TEXT,
    os_platform TEXT,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(machine_id)
);

-- Enable RLS
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for devices
-- 1. Users can view their own devices
CREATE POLICY "Users can view their own devices" 
ON public.devices 
FOR SELECT 
USING (auth.uid()::text = employee_id);

-- 2. Managers/Admins can view devices in their company
CREATE POLICY "Admins can view company devices" 
ON public.devices 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid()::text 
        AND users.company_id = devices.company_id 
        AND users.role IN ('Manager', 'SuperAdmin')
    )
);

-- 3. Users can insert/update (backend uses anon key so we need a broader policy or service role, let's allow all authenticated)
CREATE POLICY "Authenticated users can insert/update devices" 
ON public.devices 
FOR ALL 
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

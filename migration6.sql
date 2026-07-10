-- Create devices table to track hardware installations
CREATE TABLE IF NOT EXISTS public.devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    machine_id TEXT NOT NULL,
    employee_id TEXT REFERENCES public.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    hostname TEXT,
    last_active TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(machine_id)
);

-- Add RLS policies for devices
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own devices"
ON public.devices FOR INSERT
WITH CHECK (auth.uid() = employee_id);

CREATE POLICY "Users can update their own devices"
ON public.devices FOR UPDATE
USING (auth.uid() = employee_id);

CREATE POLICY "Managers and SuperAdmins can view company devices"
ON public.devices FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.company_id = devices.company_id
    AND users.role IN ('Manager', 'SuperAdmin')
  )
  OR auth.uid() = employee_id
);

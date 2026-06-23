-- 1. Create the companies table
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'active'
);

-- 2. Insert the initial company "Sas Group"
INSERT INTO public.companies (name) VALUES ('Sas Group');

-- 3. Add company_id column to existing tables
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.app_usage ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.screenshots ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.attendance ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.work_reports ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);
ALTER TABLE public.password_resets ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id);

-- 4. Update existing data to belong to "Sas Group"
DO $$
DECLARE
    default_company_id UUID;
BEGIN
    SELECT id INTO default_company_id FROM public.companies WHERE name = 'Sas Group' LIMIT 1;
    
    UPDATE public.users SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE public.activity_logs SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE public.app_usage SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE public.screenshots SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE public.attendance SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE public.tasks SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE public.work_reports SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE public.notifications SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE public.settings SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE public.password_resets SET company_id = default_company_id WHERE company_id IS NULL;
END $$;

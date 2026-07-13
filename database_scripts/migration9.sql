-- Update existing announcements to use the new cosmic violet gradient
UPDATE public.system_announcements 
SET color = 'linear-gradient(90deg, #7c3aed, #2563eb)'
WHERE color = '#f57c00' OR color IS NULL;

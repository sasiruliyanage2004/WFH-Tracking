-- 1. Remove the old role constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- 2. Add the new role constraint that includes 'SystemAdmin'
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('SuperAdmin', 'Manager', 'Employee', 'SystemAdmin'));

-- 3. Insert the System Admin account
INSERT INTO public.users (
  id, 
  name, 
  email, 
  password, 
  role, 
  department, 
  company_id, 
  force_password_reset
) VALUES (
  gen_random_uuid(),
  'Platform Owner',
  'owner@workforceos.com',
  -- This is the hash for 'password1234'
  '$2b$10$ARLtho4AC/j74IhZqvJl7euaSE5/eFuiSr9W44DapHpBVgt/0QaRy',
  'SystemAdmin',
  'Platform',
  NULL,
  false
) ON CONFLICT (email) DO NOTHING;

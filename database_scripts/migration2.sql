-- 1. Remove the old role constraint
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;

-- 2. Add the new role constraint that includes 'SystemAdmin'
ALTER TABLE public.users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('SuperAdmin', 'Manager', 'Employee', 'SystemAdmin'));

-- ============================================================
-- SSN ELITE — VERIFICATION SCRIPT FOR RBAC & SITE SETTINGS
-- Run in Supabase SQL Editor to verify live database state
-- ============================================================

-- A. Verify public.admin_users exists
SELECT 
  table_schema, 
  table_name,
  CASE WHEN count(*) > 0 THEN 'PASS: Table exists' ELSE 'FAIL: Table missing' END AS status
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'admin_users'
GROUP BY table_schema, table_name;

-- B. Verify public.is_admin() exists
SELECT 
  routine_schema, 
  routine_name, 
  data_type AS return_type,
  security_type,
  CASE WHEN count(*) > 0 THEN 'PASS: Function exists' ELSE 'FAIL: Function missing' END AS status
FROM information_schema.routines 
WHERE routine_schema = 'public' AND routine_name = 'is_admin'
GROUP BY routine_schema, routine_name, data_type, security_type;

-- C. Verify public.site_settings exists and check column structure
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'site_settings'
ORDER BY ordinal_position;

-- D. Verify site_settings has exactly one settings row
SELECT 
  id, 
  instagram_url, 
  instagram_enabled, 
  facebook_url, 
  facebook_enabled, 
  linkedin_url, 
  linkedin_enabled,
  created_at,
  updated_at
FROM public.site_settings;

-- E. Verify public.is_admin() executes successfully
SELECT public.is_admin() AS is_admin_result;

-- F. Verify Row Level Security (RLS) is enabled on both tables
SELECT 
  schemaname, 
  tablename, 
  rowsecurity AS rls_enabled,
  CASE WHEN rowsecurity THEN 'PASS: RLS is active' ELSE 'FAIL: RLS not active' END AS status
FROM pg_tables 
WHERE schemaname = 'public' AND tablename IN ('admin_users', 'site_settings');

-- G. Verify RLS Policies on admin_users and site_settings
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check 
FROM pg_policies 
WHERE schemaname = 'public' AND tablename IN ('admin_users', 'site_settings')
ORDER BY tablename, cmd;

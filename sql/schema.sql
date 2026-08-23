-- ============================================================
-- SSN ELITE — Complete Database Schema & Hardened Admin RBAC
-- PostgreSQL / Supabase Migration
-- ============================================================

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 0. ADMIN ROLE-BASED ACCESS CONTROL (RBAC)
-- ============================================================

-- Dedicated admin user mapping table
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Security Definer function to check if caller is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE user_id = auth.uid()
  )
  OR (
    -- Also support app_metadata role claim if configured
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
$$;

-- Automatically register any existing auth.users as admin upon initial setup
INSERT INTO public.admin_users (user_id, role)
SELECT id, 'admin' FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- RLS for admin_users table: only admins can view the admin registry
DROP POLICY IF EXISTS "Allow admin select on admin_users" ON public.admin_users;
CREATE POLICY "Allow admin select on admin_users"
  ON public.admin_users FOR SELECT
  TO authenticated
  USING (public.is_admin());


-- ============================================================
-- 1. PRODUCTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  title TEXT,
  slug TEXT,
  category TEXT DEFAULT 'Performance',
  series TEXT DEFAULT 'SSN Elite Series',
  tagline TEXT,
  price TEXT,
  selling_price TEXT,
  mrp TEXT,
  discount TEXT,
  serving_size TEXT DEFAULT '1 Scoop',
  servings TEXT,
  protein_per_serving TEXT,
  badges JSONB DEFAULT '[]'::jsonb,
  image_url TEXT,
  main_image TEXT,
  gallery_images JSONB DEFAULT '[]'::jsonb,
  short_description TEXT,
  full_description TEXT,
  description TEXT,
  ingredients TEXT,
  benefits TEXT,
  usage_instruction TEXT,
  hero_data JSONB DEFAULT '{}'::jsonb,
  product_intro JSONB DEFAULT '{}'::jsonb,
  key_metric JSONB DEFAULT '{}'::jsonb,
  protein_source JSONB DEFAULT '{}'::jsonb,
  ingredients_accordion JSONB DEFAULT '[]'::jsonb,
  nutrition_facts JSONB DEFAULT '[]'::jsonb,
  flavours JSONB DEFAULT '[]'::jsonb,
  how_to_use JSONB DEFAULT '[]'::jsonb,
  target_audience JSONB DEFAULT '[]'::jsonb,
  storage_info JSONB DEFAULT '{}'::jsonb,
  important_notice JSONB DEFAULT '{}'::jsonb,
  faq JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  seo_title TEXT,
  seo_description TEXT,
  status TEXT DEFAULT 'Active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure all columns exist on pre-existing tables
ALTER TABLE products ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS series TEXT DEFAULT 'SSN Elite Series';
ALTER TABLE products ADD COLUMN IF NOT EXISTS tagline TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS selling_price TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS mrp TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS discount TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS servings TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS protein_per_serving TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS main_image TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS gallery_images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS hero_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_intro JSONB DEFAULT '{}'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS key_metric JSONB DEFAULT '{}'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS protein_source JSONB DEFAULT '{}'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS ingredients_accordion JSONB DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS nutrition_facts JSONB DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS flavours JSONB DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS how_to_use JSONB DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS target_audience JSONB DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS storage_info JSONB DEFAULT '{}'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS important_notice JSONB DEFAULT '{}'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_title TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';

-- Auto-fill slugs for existing rows without slugs
UPDATE products
SET slug = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'), '^-+|-+$', '', 'g'))
WHERE slug IS NULL OR slug = '';

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- 1. Public SELECT: Published/Active products visible to public; Admin sees all
DROP POLICY IF EXISTS "Allow public select on products" ON products;
DROP POLICY IF EXISTS "Allow authenticated select on products" ON products;
CREATE POLICY "Allow public select on products"
  ON products FOR SELECT
  USING (
    status IS NULL 
    OR LOWER(status) = 'active' 
    OR LOWER(status) = 'published'
    OR public.is_admin()
  );

-- 2. Admin-only INSERT (Authenticated non-admin is REJECTED)
DROP POLICY IF EXISTS "Allow authenticated insert on products" ON products;
DROP POLICY IF EXISTS "Allow admin insert on products" ON products;
CREATE POLICY "Allow admin insert on products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- 3. Admin-only UPDATE (Authenticated non-admin is REJECTED)
DROP POLICY IF EXISTS "Allow authenticated update on products" ON products;
DROP POLICY IF EXISTS "Allow admin update on products" ON products;
CREATE POLICY "Allow admin update on products"
  ON products FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4. Admin-only DELETE (Authenticated non-admin is REJECTED)
DROP POLICY IF EXISTS "Allow authenticated delete on products" ON products;
DROP POLICY IF EXISTS "Allow admin delete on products" ON products;
CREATE POLICY "Allow admin delete on products"
  ON products FOR DELETE
  TO authenticated
  USING (public.is_admin());


-- ============================================================
-- 2. BLOGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS blogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT,
  featured_image TEXT DEFAULT '',
  author TEXT DEFAULT 'SSN Elite Research Team',
  content TEXT DEFAULT '',
  excerpt TEXT DEFAULT '',
  category TEXT DEFAULT 'Nutrition Science',
  read_time TEXT DEFAULT '5 min read',
  gradient TEXT DEFAULT 'linear-gradient(135deg, #0A2FFF 0%, #061B99 100%)',
  seo_title TEXT DEFAULT '',
  seo_description TEXT DEFAULT '',
  status TEXT DEFAULT 'Published',
  publish_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure all columns exist on pre-existing tables
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS featured_image TEXT DEFAULT '';
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS author TEXT DEFAULT 'SSN Elite Research Team';
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS content TEXT DEFAULT '';
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS excerpt TEXT DEFAULT '';
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Nutrition Science';
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS read_time TEXT DEFAULT '5 min read';
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS gradient TEXT DEFAULT 'linear-gradient(135deg, #0A2FFF 0%, #061B99 100%)';
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS seo_title TEXT DEFAULT '';
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS seo_description TEXT DEFAULT '';
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Published';
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS publish_date DATE DEFAULT CURRENT_DATE;

ALTER TABLE blogs ENABLE ROW LEVEL SECURITY;

-- 1. Public SELECT: Published blogs visible to public; Admin sees all (including drafts)
DROP POLICY IF EXISTS "Allow public select on blogs" ON blogs;
DROP POLICY IF EXISTS "Allow authenticated select on blogs" ON blogs;
CREATE POLICY "Allow public select on blogs"
  ON blogs FOR SELECT
  USING (
    LOWER(status) = 'published' 
    OR status IS NULL
    OR public.is_admin()
  );

-- 2. Admin-only INSERT
DROP POLICY IF EXISTS "Allow authenticated insert on blogs" ON blogs;
DROP POLICY IF EXISTS "Allow admin insert on blogs" ON blogs;
CREATE POLICY "Allow admin insert on blogs"
  ON blogs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- 3. Admin-only UPDATE
DROP POLICY IF EXISTS "Allow authenticated update on blogs" ON blogs;
DROP POLICY IF EXISTS "Allow admin update on blogs" ON blogs;
CREATE POLICY "Allow admin update on blogs"
  ON blogs FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4. Admin-only DELETE
DROP POLICY IF EXISTS "Allow authenticated delete on blogs" ON blogs;
DROP POLICY IF EXISTS "Allow admin delete on blogs" ON blogs;
CREATE POLICY "Allow admin delete on blogs"
  ON blogs FOR DELETE
  TO authenticated
  USING (public.is_admin());


-- ============================================================
-- 3. LAB REPORTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS lab_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number TEXT NOT NULL,
  product_name TEXT NOT NULL,
  lab_name TEXT DEFAULT 'ISO/IEC 17025 Accredited Laboratory',
  test_date TEXT DEFAULT '',
  certificate_url TEXT DEFAULT '',
  report_images JSONB DEFAULT '[]'::jsonb,
  parameters JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'VERIFIED',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure all columns exist on pre-existing tables
ALTER TABLE lab_reports ADD COLUMN IF NOT EXISTS lab_name TEXT DEFAULT 'ISO/IEC 17025 Accredited Laboratory';
ALTER TABLE lab_reports ADD COLUMN IF NOT EXISTS test_date TEXT DEFAULT '';
ALTER TABLE lab_reports ADD COLUMN IF NOT EXISTS certificate_url TEXT DEFAULT '';
ALTER TABLE lab_reports ADD COLUMN IF NOT EXISTS report_images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE lab_reports ADD COLUMN IF NOT EXISTS parameters JSONB DEFAULT '[]'::jsonb;
ALTER TABLE lab_reports ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'VERIFIED';

ALTER TABLE lab_reports ENABLE ROW LEVEL SECURITY;

-- 1. Public SELECT: Verified/Published reports visible to public; Admin sees all
DROP POLICY IF EXISTS "Allow public select on lab_reports" ON lab_reports;
DROP POLICY IF EXISTS "Allow authenticated select on lab_reports" ON lab_reports;
CREATE POLICY "Allow public select on lab_reports"
  ON lab_reports FOR SELECT
  USING (
    LOWER(status) = 'verified' 
    OR LOWER(status) = 'published' 
    OR status IS NULL
    OR public.is_admin()
  );

-- 2. Admin-only INSERT
DROP POLICY IF EXISTS "Allow authenticated insert on lab_reports" ON lab_reports;
DROP POLICY IF EXISTS "Allow admin insert on lab_reports" ON lab_reports;
CREATE POLICY "Allow admin insert on lab_reports"
  ON lab_reports FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

-- 3. Admin-only UPDATE
DROP POLICY IF EXISTS "Allow authenticated update on lab_reports" ON lab_reports;
DROP POLICY IF EXISTS "Allow admin update on lab_reports" ON lab_reports;
CREATE POLICY "Allow admin update on lab_reports"
  ON lab_reports FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4. Admin-only DELETE
DROP POLICY IF EXISTS "Allow authenticated delete on lab_reports" ON lab_reports;
DROP POLICY IF EXISTS "Allow admin delete on lab_reports" ON lab_reports;
CREATE POLICY "Allow admin delete on lab_reports"
  ON lab_reports FOR DELETE
  TO authenticated
  USING (public.is_admin());


-- ============================================================
-- 4. USER SUBMISSIONS / ENQUIRIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS user_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_submissions ENABLE ROW LEVEL SECURITY;

-- 1. Anonymous & Public users: Allowed to submit enquiries
DROP POLICY IF EXISTS "Allow public insert on user_submissions" ON user_submissions;
CREATE POLICY "Allow public insert on user_submissions"
  ON user_submissions FOR INSERT
  WITH CHECK (true);

-- 2. Admin-only SELECT (Customer privacy protected from public AND non-admin authenticated users)
DROP POLICY IF EXISTS "Allow authenticated select on user_submissions" ON user_submissions;
DROP POLICY IF EXISTS "Allow admin select on user_submissions" ON user_submissions;
CREATE POLICY "Allow admin select on user_submissions"
  ON user_submissions FOR SELECT
  TO authenticated
  USING (public.is_admin());

-- 3. Admin-only DELETE
DROP POLICY IF EXISTS "Allow authenticated delete on user_submissions" ON user_submissions;
DROP POLICY IF EXISTS "Allow admin delete on user_submissions" ON user_submissions;
CREATE POLICY "Allow admin delete on user_submissions"
  ON user_submissions FOR DELETE
  TO authenticated
  USING (public.is_admin());


-- ============================================================
-- 5. SITE SETTINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Public can read site settings
DROP POLICY IF EXISTS "Allow public select on site_settings" ON site_settings;
CREATE POLICY "Allow public select on site_settings"
  ON site_settings FOR SELECT
  USING (true);

-- Admin-only manage
DROP POLICY IF EXISTS "Allow authenticated manage on site_settings" ON site_settings;
DROP POLICY IF EXISTS "Allow admin manage on site_settings" ON site_settings;
CREATE POLICY "Allow admin manage on site_settings"
  ON site_settings FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- ============================================================
-- 6. STORAGE BUCKET (ssn-uploads)
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ssn-uploads',
  'ssn-uploads',
  true,
  26214400, -- 25 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 26214400,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

-- Public read for uploaded assets
DROP POLICY IF EXISTS "Public Access ssn-uploads" ON storage.objects;
CREATE POLICY "Public Access ssn-uploads" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'ssn-uploads');

-- Admin-only uploads
DROP POLICY IF EXISTS "Authenticated Upload ssn-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload ssn-uploads" ON storage.objects;
CREATE POLICY "Admin Upload ssn-uploads" 
  ON storage.objects FOR INSERT 
  TO authenticated 
  WITH CHECK (bucket_id = 'ssn-uploads' AND public.is_admin());

-- Admin-only updates
DROP POLICY IF EXISTS "Authenticated Update ssn-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update ssn-uploads" ON storage.objects;
CREATE POLICY "Admin Update ssn-uploads" 
  ON storage.objects FOR UPDATE 
  TO authenticated 
  USING (bucket_id = 'ssn-uploads' AND public.is_admin());

-- Admin-only deletes
DROP POLICY IF EXISTS "Authenticated Delete ssn-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete ssn-uploads" ON storage.objects;
CREATE POLICY "Admin Delete ssn-uploads" 
  ON storage.objects FOR DELETE 
  TO authenticated 
  USING (bucket_id = 'ssn-uploads' AND public.is_admin());

-- Reload Schema Cache
NOTIFY pgrst, 'reload schema';

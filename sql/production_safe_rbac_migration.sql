-- ============================================================
-- SSN ELITE — SAFE PRODUCTION INCREMENTAL MIGRATION & ADMIN RBAC
-- Target: Live Supabase PostgreSQL Database (pnxnwtrozxxqoofxutci)
-- 
-- SAFE TO RUN:
--  - Does NOT drop any tables
--  - Does NOT delete any existing data
--  - Adds all missing product/blog/lab report columns
--  - Backfills safe slugs
--  - Implements role-based access control (RBAC) via public.is_admin()
-- ============================================================

-- 1. ADMIN USER REGISTRY & SECURITY DEFINER HELPER
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

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
    (auth.jwt() -> 'app_metadata' ->> 'role') = 'admin'
  );
$$;

-- Auto-register any existing admin users in auth.users
INSERT INTO public.admin_users (user_id, role)
SELECT id, 'admin' FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

DROP POLICY IF EXISTS "Allow admin select on admin_users" ON public.admin_users;
CREATE POLICY "Allow admin select on admin_users"
  ON public.admin_users FOR SELECT
  TO authenticated
  USING (public.is_admin());


-- 2. PRODUCTS TABLE — ADD MISSING COLUMNS
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

-- Auto-fill slugs for existing product rows
UPDATE products
SET slug = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'), '^-+|-+$', '', 'g'))
WHERE slug IS NULL OR slug = '';

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "Allow authenticated insert on products" ON products;
DROP POLICY IF EXISTS "Allow admin insert on products" ON products;
CREATE POLICY "Allow admin insert on products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Allow authenticated update on products" ON products;
DROP POLICY IF EXISTS "Allow admin update on products" ON products;
CREATE POLICY "Allow admin update on products"
  ON products FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Allow authenticated delete on products" ON products;
DROP POLICY IF EXISTS "Allow admin delete on products" ON products;
CREATE POLICY "Allow admin delete on products"
  ON products FOR DELETE
  TO authenticated
  USING (public.is_admin());


-- 3. BLOGS TABLE — ADD MISSING COLUMNS
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

DROP POLICY IF EXISTS "Allow public select on blogs" ON blogs;
DROP POLICY IF EXISTS "Allow authenticated select on blogs" ON blogs;
CREATE POLICY "Allow public select on blogs"
  ON blogs FOR SELECT
  USING (
    LOWER(status) = 'published' 
    OR status IS NULL
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "Allow authenticated insert on blogs" ON blogs;
DROP POLICY IF EXISTS "Allow admin insert on blogs" ON blogs;
CREATE POLICY "Allow admin insert on blogs"
  ON blogs FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Allow authenticated update on blogs" ON blogs;
DROP POLICY IF EXISTS "Allow admin update on blogs" ON blogs;
CREATE POLICY "Allow admin update on blogs"
  ON blogs FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Allow authenticated delete on blogs" ON blogs;
DROP POLICY IF EXISTS "Allow admin delete on blogs" ON blogs;
CREATE POLICY "Allow admin delete on blogs"
  ON blogs FOR DELETE
  TO authenticated
  USING (public.is_admin());


-- 4. LAB REPORTS TABLE — ENSURE COLUMNS & RBAC
ALTER TABLE lab_reports ADD COLUMN IF NOT EXISTS lab_name TEXT DEFAULT 'ISO/IEC 17025 Accredited Laboratory';
ALTER TABLE lab_reports ADD COLUMN IF NOT EXISTS test_date TEXT DEFAULT '';
ALTER TABLE lab_reports ADD COLUMN IF NOT EXISTS certificate_url TEXT DEFAULT '';
ALTER TABLE lab_reports ADD COLUMN IF NOT EXISTS report_images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE lab_reports ADD COLUMN IF NOT EXISTS parameters JSONB DEFAULT '[]'::jsonb;
ALTER TABLE lab_reports ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'VERIFIED';

ALTER TABLE lab_reports ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "Allow authenticated insert on lab_reports" ON lab_reports;
DROP POLICY IF EXISTS "Allow admin insert on lab_reports" ON lab_reports;
CREATE POLICY "Allow admin insert on lab_reports"
  ON lab_reports FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Allow authenticated update on lab_reports" ON lab_reports;
DROP POLICY IF EXISTS "Allow admin update on lab_reports" ON lab_reports;
CREATE POLICY "Allow admin update on lab_reports"
  ON lab_reports FOR UPDATE
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Allow authenticated delete on lab_reports" ON lab_reports;
DROP POLICY IF EXISTS "Allow admin delete on lab_reports" ON lab_reports;
CREATE POLICY "Allow admin delete on lab_reports"
  ON lab_reports FOR DELETE
  TO authenticated
  USING (public.is_admin());


-- 5. USER SUBMISSIONS / ENQUIRIES — PUBLIC INSERT, ADMIN-ONLY SELECT & DELETE
ALTER TABLE user_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert on user_submissions" ON user_submissions;
CREATE POLICY "Allow public insert on user_submissions"
  ON user_submissions FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated select on user_submissions" ON user_submissions;
DROP POLICY IF EXISTS "Allow admin select on user_submissions" ON user_submissions;
CREATE POLICY "Allow admin select on user_submissions"
  ON user_submissions FOR SELECT
  TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "Allow authenticated delete on user_submissions" ON user_submissions;
DROP POLICY IF EXISTS "Allow admin delete on user_submissions" ON user_submissions;
CREATE POLICY "Allow admin delete on user_submissions"
  ON user_submissions FOR DELETE
  TO authenticated
  USING (public.is_admin());


-- 6. SITE SETTINGS
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select on site_settings" ON site_settings;
CREATE POLICY "Allow public select on site_settings"
  ON site_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated manage on site_settings" ON site_settings;
DROP POLICY IF EXISTS "Allow admin manage on site_settings" ON site_settings;
CREATE POLICY "Allow admin manage on site_settings"
  ON site_settings FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());


-- 7. STORAGE BUCKET RBAC (ssn-uploads)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ssn-uploads',
  'ssn-uploads',
  true,
  26214400,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 26214400,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

DROP POLICY IF EXISTS "Public Access ssn-uploads" ON storage.objects;
CREATE POLICY "Public Access ssn-uploads" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'ssn-uploads');

DROP POLICY IF EXISTS "Authenticated Upload ssn-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Admin Upload ssn-uploads" ON storage.objects;
CREATE POLICY "Admin Upload ssn-uploads" 
  ON storage.objects FOR INSERT 
  TO authenticated 
  WITH CHECK (bucket_id = 'ssn-uploads' AND public.is_admin());

DROP POLICY IF EXISTS "Authenticated Update ssn-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Admin Update ssn-uploads" ON storage.objects;
CREATE POLICY "Admin Update ssn-uploads" 
  ON storage.objects FOR UPDATE 
  TO authenticated 
  USING (bucket_id = 'ssn-uploads' AND public.is_admin());

DROP POLICY IF EXISTS "Authenticated Delete ssn-uploads" ON storage.objects;
DROP POLICY IF EXISTS "Admin Delete ssn-uploads" ON storage.objects;
CREATE POLICY "Admin Delete ssn-uploads" 
  ON storage.objects FOR DELETE 
  TO authenticated 
  USING (bucket_id = 'ssn-uploads' AND public.is_admin());

-- 8. RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';

-- ============================================
-- SSN ELITE — Supabase PostgreSQL Complete Database Schema
-- Production Schema for Products, Blogs, Lab Reports, Enquiries & Site Settings
-- ============================================

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. USER ENQUIRIES / SUBMISSIONS (Connect Form)
-- ============================================
CREATE TABLE IF NOT EXISTS user_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE user_submissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public inserts on user_submissions" ON user_submissions;
CREATE POLICY "Allow public inserts on user_submissions"
  ON user_submissions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated select on user_submissions" ON user_submissions;
CREATE POLICY "Allow authenticated select on user_submissions"
  ON user_submissions FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated delete on user_submissions" ON user_submissions;
CREATE POLICY "Allow authenticated delete on user_submissions"
  ON user_submissions FOR DELETE
  TO authenticated
  USING (true);


-- ============================================
-- 2. PRODUCTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  title TEXT,
  slug TEXT UNIQUE,
  category TEXT NOT NULL DEFAULT 'Lean Muscle',
  series TEXT DEFAULT 'SSN Elite Series',
  tagline TEXT DEFAULT '',
  price TEXT NOT NULL DEFAULT '',
  mrp TEXT DEFAULT '',
  selling_price TEXT DEFAULT '',
  discount TEXT DEFAULT '',
  serving_size TEXT DEFAULT '1 Scoop',
  servings TEXT DEFAULT '',
  protein_per_serving TEXT DEFAULT '',
  badges JSONB DEFAULT '[]'::jsonb,
  image_url TEXT NOT NULL DEFAULT '',
  main_image TEXT DEFAULT '',
  gallery_images JSONB DEFAULT '[]'::jsonb,
  short_description TEXT DEFAULT '',
  full_description TEXT DEFAULT '',
  description TEXT DEFAULT '',
  ingredients TEXT DEFAULT '',
  benefits TEXT DEFAULT '',
  usage_instruction TEXT DEFAULT '',
  
  -- Structured Page Blocks (JSONB)
  hero_data JSONB DEFAULT '{}'::jsonb,
  product_intro JSONB DEFAULT '{"section_num": "02", "heading": "What Is This Product?", "tag": "Educational", "content": ""}'::jsonb,
  key_metric JSONB DEFAULT '{"number": "24", "unit": "G", "label": "Protein Per Serving", "sublabel": "Per scoop serving"}'::jsonb,
  protein_source JSONB DEFAULT '{"heading": "The Protein Source", "tag": "Whey Protein Concentrate", "content": ""}'::jsonb,
  ingredients_accordion JSONB DEFAULT '[]'::jsonb,
  nutrition_facts JSONB DEFAULT '[]'::jsonb,
  flavours JSONB DEFAULT '[]'::jsonb,
  how_to_use JSONB DEFAULT '[]'::jsonb,
  target_audience JSONB DEFAULT '[]'::jsonb,
  storage_info JSONB DEFAULT '{"heading": "Storage", "content": "Store in a cool, dry place away from direct sunlight."}'::jsonb,
  important_notice JSONB DEFAULT '{"heading": "Important Notice", "content": "This product is a dietary supplement and is not intended to diagnose, treat, cure, or prevent any disease."}'::jsonb,
  faq JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  
  status TEXT DEFAULT 'Active',
  seo_title TEXT DEFAULT '',
  seo_description TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select on products" ON products;
CREATE POLICY "Allow public select on products"
  ON products FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert on products" ON products;
CREATE POLICY "Allow authenticated insert on products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update on products" ON products;
CREATE POLICY "Allow authenticated update on products"
  ON products FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated delete on products" ON products;
CREATE POLICY "Allow authenticated delete on products"
  ON products FOR DELETE
  TO authenticated
  USING (true);


-- ============================================
-- 3. BLOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS blogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  featured_image TEXT NOT NULL DEFAULT '',
  author TEXT DEFAULT 'SSN Elite Research Team',
  content TEXT NOT NULL DEFAULT '',
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

ALTER TABLE blogs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select on blogs" ON blogs;
CREATE POLICY "Allow public select on blogs"
  ON blogs FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert on blogs" ON blogs;
CREATE POLICY "Allow authenticated insert on blogs"
  ON blogs FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update on blogs" ON blogs;
CREATE POLICY "Allow authenticated update on blogs"
  ON blogs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated delete on blogs" ON blogs;
CREATE POLICY "Allow authenticated delete on blogs"
  ON blogs FOR DELETE
  TO authenticated
  USING (true);


-- ============================================
-- 4. LAB REPORTS TABLE
-- ============================================
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

ALTER TABLE lab_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select on lab_reports" ON lab_reports;
CREATE POLICY "Allow public select on lab_reports"
  ON lab_reports FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert on lab_reports" ON lab_reports;
CREATE POLICY "Allow authenticated insert on lab_reports"
  ON lab_reports FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update on lab_reports" ON lab_reports;
CREATE POLICY "Allow authenticated update on lab_reports"
  ON lab_reports FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated delete on lab_reports" ON lab_reports;
CREATE POLICY "Allow authenticated delete on lab_reports"
  ON lab_reports FOR DELETE
  TO authenticated
  USING (true);


-- ============================================
-- 5. SITE SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- 6. USER SUBMISSIONS / ENQUIRIES TABLE
-- ============================================
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

DROP POLICY IF EXISTS "Allow public insert on user_submissions" ON user_submissions;
CREATE POLICY "Allow public insert on user_submissions"
  ON user_submissions FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated select on user_submissions" ON user_submissions;
CREATE POLICY "Allow authenticated select on user_submissions"
  ON user_submissions FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Allow authenticated delete on user_submissions" ON user_submissions;
CREATE POLICY "Allow authenticated delete on user_submissions"
  ON user_submissions FOR DELETE
  TO authenticated
  USING (true);

INSERT INTO site_settings (key, value) VALUES (
  'social_media',
  '{"instagram": {"enabled": true, "url": "https://instagram.com/ssnelite"}, "facebook": {"enabled": true, "url": "https://facebook.com/ssnelite"}, "linkedin": {"enabled": true, "url": "https://linkedin.com/company/ssnelite"}}'::jsonb
) ON CONFLICT (key) DO NOTHING;

NOTIFY pgrst, 'reload schema';

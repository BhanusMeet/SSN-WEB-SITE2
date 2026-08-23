-- ============================================
-- SSN ELITE — Supabase Complete Safe Migration Script
-- Run this in your Supabase SQL Editor:
-- Supabase Dashboard -> SQL Editor -> New Query -> Paste & Run
-- ============================================

-- Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. PRODUCTS TABLE SCHEMA & SAFE COLUMN MIGRATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure all columns exist with exact data types
ALTER TABLE products ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Lean Muscle';
ALTER TABLE products ADD COLUMN IF NOT EXISTS series TEXT DEFAULT 'SSN Elite Series';
ALTER TABLE products ADD COLUMN IF NOT EXISTS tagline TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS price TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS mrp TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS selling_price TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS discount TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS serving_size TEXT DEFAULT '1 Scoop';
ALTER TABLE products ADD COLUMN IF NOT EXISTS servings TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS protein_per_serving TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS image_url TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS main_image TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS gallery_images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS short_description TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS full_description TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS ingredients TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS benefits TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS usage_instruction TEXT DEFAULT '';

-- Structured JSONB Page Blocks for Real-Time Customer Page Rendering
ALTER TABLE products ADD COLUMN IF NOT EXISTS hero_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS product_intro JSONB DEFAULT '{"section_num": "02", "heading": "What Is This Product?", "tag": "Educational", "content": ""}'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS key_metric JSONB DEFAULT '{"number": "24", "unit": "G", "label": "Protein Per Serving", "sublabel": "Per scoop serving"}'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS protein_source JSONB DEFAULT '{"heading": "The Protein Source", "tag": "Whey Protein Concentrate", "content": ""}'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS ingredients_accordion JSONB DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS nutrition_facts JSONB DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS flavours JSONB DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS how_to_use JSONB DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS target_audience JSONB DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS storage_info JSONB DEFAULT '{"heading": "Storage", "content": "Store in a cool, dry place away from direct sunlight."}'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS important_notice JSONB DEFAULT '{"heading": "Important Notice", "content": "This product is a dietary supplement and is not intended to diagnose, treat, cure, or prevent any disease."}'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS faq JSONB DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

ALTER TABLE products ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_title TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_description TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Data consistency sync for existing legacy rows
UPDATE products SET title = name WHERE (title IS NULL OR title = '') AND name IS NOT NULL;
UPDATE products SET selling_price = price WHERE (selling_price IS NULL OR selling_price = '') AND price IS NOT NULL;
UPDATE products SET price = selling_price WHERE (price IS NULL OR price = '') AND selling_price IS NOT NULL;
UPDATE products SET main_image = image_url WHERE (main_image IS NULL OR main_image = '') AND image_url IS NOT NULL;
UPDATE products SET image_url = main_image WHERE (image_url IS NULL OR image_url = '') AND main_image IS NOT NULL;

-- Enable Row Level Security (RLS) & Policies
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
-- 2. STORAGE BUCKET (ssn-uploads)
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ssn-uploads',
  'ssn-uploads',
  true,
  52428800, -- 50 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

DROP POLICY IF EXISTS "Public Access ssn-uploads" ON storage.objects;
CREATE POLICY "Public Access ssn-uploads" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'ssn-uploads');

DROP POLICY IF EXISTS "Authenticated Upload ssn-uploads" ON storage.objects;
CREATE POLICY "Authenticated Upload ssn-uploads" 
  ON storage.objects FOR INSERT 
  TO authenticated 
  WITH CHECK (bucket_id = 'ssn-uploads');

DROP POLICY IF EXISTS "Authenticated Update ssn-uploads" ON storage.objects;
CREATE POLICY "Authenticated Update ssn-uploads" 
  ON storage.objects FOR UPDATE 
  TO authenticated 
  USING (bucket_id = 'ssn-uploads');

DROP POLICY IF EXISTS "Authenticated Delete ssn-uploads" ON storage.objects;
CREATE POLICY "Authenticated Delete ssn-uploads" 
  ON storage.objects FOR DELETE 
  TO authenticated 
  USING (bucket_id = 'ssn-uploads');


-- ============================================
-- 3. BLOGS TABLE SAFE MIGRATION
-- ============================================
CREATE TABLE IF NOT EXISTS blogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

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
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE blogs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select on blogs" ON blogs;
CREATE POLICY "Allow public select on blogs" ON blogs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert on blogs" ON blogs;
CREATE POLICY "Allow authenticated insert on blogs" ON blogs FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update on blogs" ON blogs;
CREATE POLICY "Allow authenticated update on blogs" ON blogs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated delete on blogs" ON blogs;
CREATE POLICY "Allow authenticated delete on blogs" ON blogs FOR DELETE TO authenticated USING (true);


-- ============================================
-- 4. LAB REPORTS TABLE SAFE MIGRATION
-- ============================================
CREATE TABLE IF NOT EXISTS lab_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number TEXT NOT NULL,
  product_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE lab_reports ADD COLUMN IF NOT EXISTS lab_name TEXT DEFAULT 'ISO/IEC 17025 Accredited Laboratory';
ALTER TABLE lab_reports ADD COLUMN IF NOT EXISTS test_date TEXT DEFAULT '';
ALTER TABLE lab_reports ADD COLUMN IF NOT EXISTS certificate_url TEXT DEFAULT '';
ALTER TABLE lab_reports ADD COLUMN IF NOT EXISTS report_images JSONB DEFAULT '[]'::jsonb;
ALTER TABLE lab_reports ADD COLUMN IF NOT EXISTS parameters JSONB DEFAULT '[]'::jsonb;
ALTER TABLE lab_reports ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'VERIFIED';
ALTER TABLE lab_reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE lab_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select on lab_reports" ON lab_reports;
CREATE POLICY "Allow public select on lab_reports" ON lab_reports FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert on lab_reports" ON lab_reports;
CREATE POLICY "Allow authenticated insert on lab_reports" ON lab_reports FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update on lab_reports" ON lab_reports;
CREATE POLICY "Allow authenticated update on lab_reports" ON lab_reports FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated delete on lab_reports" ON lab_reports;
CREATE POLICY "Allow authenticated delete on lab_reports" ON lab_reports FOR DELETE TO authenticated USING (true);


-- ============================================
-- 5. SITE SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select on site_settings" ON site_settings;
CREATE POLICY "Allow public select on site_settings" ON site_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated manage on site_settings" ON site_settings;
CREATE POLICY "Allow authenticated manage on site_settings" ON site_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

INSERT INTO site_settings (key, value) VALUES (
  'social_media',
  '{"instagram": {"enabled": true, "url": "https://instagram.com/ssnelite"}, "facebook": {"enabled": true, "url": "https://facebook.com/ssnelite"}, "linkedin": {"enabled": true, "url": "https://linkedin.com/company/ssnelite"}}'::jsonb
) ON CONFLICT (key) DO NOTHING;


-- ============================================
-- 6. RELOAD SCHEMA CACHE
-- ============================================
NOTIFY pgrst, 'reload schema';

-- ============================================
-- SSN ELITE — Safe Incremental Production Migration
-- Adds missing columns to existing live tables
-- Does NOT drop, recreate, or wipe any data
-- ============================================

-- ============================================
-- PRODUCTS TABLE — Add missing columns
-- ============================================

-- Status & Routing
ALTER TABLE products ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE products ADD COLUMN IF NOT EXISTS slug TEXT;

-- Pricing
ALTER TABLE products ADD COLUMN IF NOT EXISTS selling_price TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS mrp TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS discount TEXT;

-- Additional text fields
ALTER TABLE products ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS series TEXT DEFAULT 'SSN Elite Series';
ALTER TABLE products ADD COLUMN IF NOT EXISTS tagline TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS servings TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS protein_per_serving TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS main_image TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_title TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_description TEXT;

-- JSONB structured fields
ALTER TABLE products ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]'::jsonb;
ALTER TABLE products ADD COLUMN IF NOT EXISTS gallery_images JSONB DEFAULT '[]'::jsonb;
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

-- ============================================
-- PRODUCTS — Backfill slugs for existing rows
-- ============================================
UPDATE products
SET slug = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'), '^-+|-+$', '', 'g'))
WHERE slug IS NULL;

-- ============================================
-- BLOGS TABLE — Add missing columns
-- ============================================
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Published';
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
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS publish_date DATE DEFAULT CURRENT_DATE;

-- ============================================
-- LAB REPORTS TABLE — Ensure status column exists
-- ============================================
ALTER TABLE lab_reports ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'VERIFIED';

-- ============================================
-- RLS POLICIES — Products (status-aware)
-- ============================================
DROP POLICY IF EXISTS "Allow public select on products" ON products;
CREATE POLICY "Allow public select on products"
  ON products FOR SELECT
  USING (
    status IS NULL
    OR LOWER(status) = 'active'
    OR LOWER(status) = 'published'
  );

-- ============================================
-- RLS POLICIES — Blogs (status-aware)
-- ============================================
DROP POLICY IF EXISTS "Allow public select on blogs" ON blogs;
CREATE POLICY "Allow public select on blogs"
  ON blogs FOR SELECT
  USING (
    status IS NULL
    OR LOWER(status) = 'published'
  );

-- ============================================
-- RLS POLICIES — Lab Reports (status-aware)
-- ============================================
DROP POLICY IF EXISTS "Allow public select on lab_reports" ON lab_reports;
CREATE POLICY "Allow public select on lab_reports"
  ON lab_reports FOR SELECT
  USING (
    status IS NULL
    OR LOWER(status) = 'verified'
    OR LOWER(status) = 'published'
  );

-- ============================================
-- Reload PostgREST schema cache
-- ============================================
NOTIFY pgrst, 'reload schema';

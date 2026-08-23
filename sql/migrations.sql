-- ============================================
-- SSN ELITE — Supabase Migration & Storage Setup Script
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New query -> Run)
-- ============================================

-- 1. Create Storage Bucket: ssn-uploads (Public)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ssn-uploads',
  'ssn-uploads',
  true,
  52428800, -- 50 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml', 'application/pdf'];

-- Storage Access Policies
DROP POLICY IF EXISTS "Public Access ssn-uploads" ON storage.objects;
CREATE POLICY "Public Access ssn-uploads" 
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'ssn-uploads');

DROP POLICY IF EXISTS "Authenticated Upload ssn-uploads" ON storage.objects;
CREATE POLICY "Authenticated Upload ssn-uploads" 
  ON storage.objects FOR INSERT 
  TO anon, authenticated 
  WITH CHECK (bucket_id = 'ssn-uploads');

DROP POLICY IF EXISTS "Authenticated Update ssn-uploads" ON storage.objects;
CREATE POLICY "Authenticated Update ssn-uploads" 
  ON storage.objects FOR UPDATE 
  TO anon, authenticated 
  USING (bucket_id = 'ssn-uploads');

DROP POLICY IF EXISTS "Authenticated Delete ssn-uploads" ON storage.objects;
CREATE POLICY "Authenticated Delete ssn-uploads" 
  ON storage.objects FOR DELETE 
  TO anon, authenticated 
  USING (bucket_id = 'ssn-uploads');


-- 2. Update Blogs Table with All Required Columns
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Published';
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS featured_image TEXT DEFAULT '';
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS content TEXT DEFAULT '';
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS excerpt TEXT DEFAULT '';
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS author TEXT DEFAULT 'SSN Elite Research Team';
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'Nutrition Science';
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS read_time TEXT DEFAULT '5 min read';
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS gradient TEXT DEFAULT 'linear-gradient(135deg, #0A2FFF 0%, #061B99 100%)';
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS meta_title TEXT DEFAULT '';
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS meta_description TEXT DEFAULT '';
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS seo_title TEXT DEFAULT '';
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS seo_description TEXT DEFAULT '';
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS publish_date DATE DEFAULT CURRENT_DATE;

-- Synchronize seo and meta columns
UPDATE blogs SET seo_title = meta_title WHERE seo_title = '' OR seo_title IS NULL;
UPDATE blogs SET seo_description = meta_description WHERE seo_description = '' OR seo_description IS NULL;


-- 3. Update Lab Reports Table (PDF Certificate Support)
ALTER TABLE lab_reports ADD COLUMN IF NOT EXISTS certificate_url TEXT DEFAULT '';
ALTER TABLE lab_reports ADD COLUMN IF NOT EXISTS report_images TEXT[] DEFAULT '{}';
ALTER TABLE lab_reports ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'VERIFIED';


-- 4. Update Products Table
ALTER TABLE products ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE products ADD COLUMN IF NOT EXISTS mrp TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS selling_price TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS discount TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS serving_size TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS ingredients TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS benefits TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS usage_instruction TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_title TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_description TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS slug TEXT;

-- 5. Product Variants Table
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_name TEXT NOT NULL,
  variant_image TEXT,
  price_override TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select on product_variants" ON product_variants;
CREATE POLICY "Allow public select on product_variants" ON product_variants FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert on product_variants" ON product_variants;
CREATE POLICY "Allow authenticated insert on product_variants" ON product_variants FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update on product_variants" ON product_variants;
CREATE POLICY "Allow authenticated update on product_variants" ON product_variants FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated delete on product_variants" ON product_variants;
CREATE POLICY "Allow authenticated delete on product_variants" ON product_variants FOR DELETE TO anon, authenticated USING (true);

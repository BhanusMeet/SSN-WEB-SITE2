-- ============================================
-- SSN ELITE — Supabase Migration Script
-- Shopify-style CMS Upgrade
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Update Products Table
ALTER TABLE products ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active' CHECK (status IN ('Draft', 'Active', 'Archived'));
ALTER TABLE products ADD COLUMN IF NOT EXISTS mrp TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS selling_price TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS discount TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_title TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS seo_description TEXT DEFAULT '';
ALTER TABLE products ADD COLUMN IF NOT EXISTS slug TEXT;

-- Copy existing price to selling_price for backwards compatibility temporarily
UPDATE products SET selling_price = price WHERE selling_price = '';

-- 2. Create Product Variants Table
CREATE TABLE IF NOT EXISTS product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_name TEXT NOT NULL,
  variant_image TEXT,
  price_override TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on product_variants
ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public select on product_variants" ON product_variants;
CREATE POLICY "Allow public select on product_variants" ON product_variants FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert on product_variants" ON product_variants;
CREATE POLICY "Allow authenticated insert on product_variants" ON product_variants FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated update on product_variants" ON product_variants;
CREATE POLICY "Allow authenticated update on product_variants" ON product_variants FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow authenticated delete on product_variants" ON product_variants;
CREATE POLICY "Allow authenticated delete on product_variants" ON product_variants FOR DELETE TO authenticated USING (true);

-- 3. Update Blogs Table
ALTER TABLE blogs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Published' CHECK (status IN ('Draft', 'Published'));

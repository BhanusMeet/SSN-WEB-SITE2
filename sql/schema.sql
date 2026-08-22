-- ============================================
-- SSN ELITE — Supabase PostgreSQL Schema
-- Run this in the Supabase SQL Editor
-- ============================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. USER SUBMISSIONS (Connect Now Form)
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

-- Enable RLS
ALTER TABLE user_submissions ENABLE ROW LEVEL SECURITY;

-- Public can INSERT (form submissions)
CREATE POLICY "Allow public inserts on user_submissions"
  ON user_submissions FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only authenticated users can SELECT (admin reads)
CREATE POLICY "Allow authenticated select on user_submissions"
  ON user_submissions FOR SELECT
  TO authenticated
  USING (true);

-- Only authenticated users can DELETE
CREATE POLICY "Allow authenticated delete on user_submissions"
  ON user_submissions FOR DELETE
  TO authenticated
  USING (true);


-- ============================================
-- 2. PRODUCTS
-- ============================================
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('Lean Muscle', 'Fat Loss', 'Hydration', 'Lifestyle & Performance', 'Size & Strength')),
  price TEXT NOT NULL,
  image_url TEXT NOT NULL DEFAULT '',
  short_description TEXT NOT NULL DEFAULT '',
  full_description TEXT NOT NULL DEFAULT '',
  ingredients TEXT,
  benefits TEXT,
  usage_instruction TEXT,
  faq JSONB DEFAULT '[]'::jsonb,
  serving_size TEXT DEFAULT '24g protein per scoop',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Public can read products
CREATE POLICY "Allow public select on products"
  ON products FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only authenticated can insert/update/delete
CREATE POLICY "Allow authenticated insert on products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update on products"
  ON products FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated delete on products"
  ON products FOR DELETE
  TO authenticated
  USING (true);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- ============================================
-- 3. BLOGS
-- ============================================
CREATE TABLE IF NOT EXISTS blogs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  featured_image TEXT NOT NULL DEFAULT '',
  author TEXT DEFAULT 'SSN Elite Research',
  content TEXT NOT NULL DEFAULT '',
  excerpt TEXT DEFAULT '',
  category TEXT DEFAULT 'Nutrition Science',
  read_time TEXT DEFAULT '5 min read',
  gradient TEXT DEFAULT 'linear-gradient(135deg, #0A2FFF 0%, #061B99 100%)',
  seo_title TEXT,
  seo_description TEXT,
  publish_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE blogs ENABLE ROW LEVEL SECURITY;

-- Public can read blogs
CREATE POLICY "Allow public select on blogs"
  ON blogs FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only authenticated can insert/update/delete
CREATE POLICY "Allow authenticated insert on blogs"
  ON blogs FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update on blogs"
  ON blogs FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated delete on blogs"
  ON blogs FOR DELETE
  TO authenticated
  USING (true);


-- ============================================
-- 4. LAB REPORTS
-- ============================================
CREATE TABLE IF NOT EXISTS lab_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_number TEXT UNIQUE NOT NULL,
  product_name TEXT NOT NULL,
  lab_name TEXT NOT NULL,
  test_date TEXT NOT NULL,
  parameters JSONB NOT NULL DEFAULT '[]'::jsonb,
  report_images TEXT[] NOT NULL DEFAULT '{}',
  status TEXT DEFAULT 'VERIFIED',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE lab_reports ENABLE ROW LEVEL SECURITY;

-- Public can read lab reports
CREATE POLICY "Allow public select on lab_reports"
  ON lab_reports FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only authenticated can insert/update/delete
CREATE POLICY "Allow authenticated insert on lab_reports"
  ON lab_reports FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Allow authenticated update on lab_reports"
  ON lab_reports FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated delete on lab_reports"
  ON lab_reports FOR DELETE
  TO authenticated
  USING (true);


-- ============================================
-- SEED DATA — Products
-- ============================================
INSERT INTO products (name, category, price, image_url, short_description, full_description, ingredients, benefits, usage_instruction, serving_size) VALUES
(
  'SSN Elite Performance Whey',
  'Lean Muscle',
  '₹10,499',
  'assets/images/products/performance-whey.webp',
  'A whey protein concentrate-based supplement designed to support daily protein intake. Each scoop delivers 24g of protein along with a BCAA + Silk Amino Acid Blend, additional EAAs, glutamine, and a digestive enzyme blend.',
  'Performance Whey is a whey protein-based nutritional supplement designed to help you meet your daily protein requirements. Protein is an essential macronutrient that supports muscle repair, recovery, and growth — especially important for people who train regularly or lead active lifestyles.',
  'Whey Protein Concentrate, BCAA + Silk Amino Acid Blend (L-Leucine, L-Isoleucine, L-Valine, L-Glycine, L-Alanine, L-Serine, L-Threonine), Glutamine, Additional EAAs, Digestive Enzyme Blend, Flavour, Cocoa Powder, Sucralose (INS955)',
  'Supports daily protein intake, Muscle repair & recovery, Complete amino acid profile, Enhanced bioavailability with digestive enzymes',
  'Take 1 scoop of Performance Whey powder. Add to 180–200 ml of cold water, milk, or another beverage of your choice. Shake or stir until fully dissolved, approximately 30 seconds.',
  '24g protein per scoop'
),
(
  'SSN Elite Anabolic Monster Mass',
  'Size & Strength',
  '₹6,999',
  'assets/images/products/anabolic-monster-mass.webp',
  'A mass gainer designed to support caloric surplus for individuals looking to increase muscle mass and body weight. Formulated with a blend of proteins and carbohydrates.',
  'A mass gainer designed to support caloric surplus for individuals looking to increase muscle mass and body weight. Formulated with a blend of proteins and carbohydrates to provide the energy and nutrients needed during intense training periods.',
  'Protein Blend, Complex Carbohydrate Matrix (Maltodextrin, Oat Source), Vitamins & Minerals Blend, Flavour, Sweetener',
  'Supports caloric surplus for mass building, High protein ratio per serving, Complex carbohydrate energy source, Zero amino spiking verified',
  'Mix the recommended serving with 300-400ml of water or milk. Shake well. Consume post-workout or between meals.',
  'Verified 54g protein per serving'
),
(
  'SSN Elite Tri Creatine',
  'Lifestyle & Performance',
  '₹2,499',
  'assets/images/products/tri-creatine.webp',
  'A creatine supplement combining multiple forms of creatine for strength and performance support. One of the most researched sports nutrition ingredients.',
  'A creatine supplement combining multiple forms of creatine for strength and performance support. Creatine is one of the most researched sports nutrition ingredients, known to support high-intensity exercise performance and aid in increasing muscle strength when combined with resistance training.',
  'Tri-Creatine Blend (Creatine Monohydrate, Creatine HCL, Creatine Pyruvate)',
  'Supports high-intensity exercise performance, Aids muscle strength with resistance training, 99.9% HPLC verified purity, Zero DCD/DHT residues',
  'Mix 1 scoop (5g) with 200ml of water. Consume daily, preferably post-workout on training days or with breakfast on rest days.',
  '5g creatine per serving'
),
(
  'SSN Elite EAA + BCAA + Glutamine',
  'Hydration',
  '₹2,799',
  'assets/images/products/eaa-bcaa-glutamine.webp',
  'A comprehensive amino acid supplement combining Essential Amino Acids (EAAs), Branched-Chain Amino Acids (BCAAs), and Glutamine for muscle recovery.',
  'A comprehensive amino acid supplement combining Essential Amino Acids (EAAs), Branched-Chain Amino Acids (BCAAs), and Glutamine. Designed to support muscle recovery, reduce exercise-induced muscle breakdown, and provide the building blocks your body needs during and after training.',
  'L-Leucine, L-Isoleucine, L-Valine, L-Glutamine, L-Lysine, L-Threonine, L-Phenylalanine, L-Methionine, L-Tryptophan',
  'Full spectrum essential amino acids, Verified 2:1:1 BCAA ratio, Supports muscle recovery, Reduces exercise-induced breakdown',
  'Mix 1 scoop (10g) with 300-400ml of cold water. Sip during your workout or throughout the day.',
  '7.8g amino acids per 10g serving'
);


-- ============================================
-- SEED DATA — Lab Reports
-- ============================================
INSERT INTO lab_reports (batch_number, product_name, lab_name, test_date, parameters, status) VALUES
(
  'SSN-WHEY-2025-08A',
  'SSN Elite Performance Whey',
  'SGS Analytical Labs (ISO/IEC 17025 Certified)',
  'August 14, 2025',
  '[
    {"label": "Assayed Protein Content", "value": "24.2g per scoop", "status": "PASS"},
    {"label": "Heavy Metals (Lead, Arsenic, Cadmium)", "value": "ND (Not Detected < 0.01 ppm)", "status": "PASS"},
    {"label": "Microbial Analysis (E.coli, Salmonella)", "value": "Negative / Clean", "status": "PASS"},
    {"label": "BCAA Ratio (Leucine:Isoleucine:Valine)", "value": "2:1:1 Verified", "status": "PASS"},
    {"label": "Banned Substance Screening (WADA)", "value": "Negative (100% Compliant)", "status": "PASS"}
  ]'::jsonb,
  'VERIFIED'
),
(
  'SSN-AMIN-2025-07C',
  'SSN Elite EAA + BCAA + Glutamine',
  'Eurofins Scientific (ISO 17025 Accredited)',
  'August 10, 2025',
  '[
    {"label": "Free-Form Amino Acid Content", "value": "7.8g per 10g serving", "status": "PASS"},
    {"label": "L-Glutamine Purity", "value": "99.8% Assay Purity", "status": "PASS"},
    {"label": "Heavy Metals Assay", "value": "ND (Below Detection Limit)", "status": "PASS"},
    {"label": "Solubility & pH Balance", "value": "Optimal (pH 6.8)", "status": "PASS"},
    {"label": "Banned Substance Screening", "value": "Negative", "status": "PASS"}
  ]'::jsonb,
  'VERIFIED'
),
(
  'SSN-CREA-2025-08B',
  'SSN Elite Tri Creatine',
  'Intertek Food & Bio Analytical Services',
  'August 08, 2025',
  '[
    {"label": "HPLC Creatine Assay", "value": "99.9% Active Purity", "status": "PASS"},
    {"label": "Dicyandiamide (DCD) Residue", "value": "ND (< 5 ppm threshold)", "status": "PASS"},
    {"label": "Dihydrotriazine (DHT) Residue", "value": "ND (< 2 ppm threshold)", "status": "PASS"},
    {"label": "Moisture & Ash Content", "value": "< 0.4%", "status": "PASS"},
    {"label": "Heavy Metals Screening", "value": "ND (Passes USP Standards)", "status": "PASS"}
  ]'::jsonb,
  'VERIFIED'
),
(
  'SSN-MASS-2025-06F',
  'SSN Elite Anabolic Monster Mass',
  'SGS Analytical Labs (ISO/IEC 17025 Certified)',
  'August 02, 2025',
  '[
    {"label": "Macronutrient Protein Density", "value": "Verified 54g / serving", "status": "PASS"},
    {"label": "Complex Carbohydrate Matrix", "value": "Clean Maltodextrin & Oat Source", "status": "PASS"},
    {"label": "Amino Spiking Assay", "value": "Negative (No Free Glycine/Taurine Spiking)", "status": "PASS"},
    {"label": "Heavy Metal Compliance", "value": "Fully Compliant", "status": "PASS"},
    {"label": "Microbial Safety", "value": "100% Negative", "status": "PASS"}
  ]'::jsonb,
  'VERIFIED'
);


-- ============================================
-- SEED DATA — Blogs
-- ============================================
INSERT INTO blogs (title, slug, author, content, excerpt, category, read_time, gradient, publish_date) VALUES
(
  'Maximizing Muscle Protein Synthesis: The Science of Timing & Dose',
  'maximizing-muscle-protein-synthesis',
  'Dr. Marcus Vance, Ph.D.',
  '<p>Muscle Protein Synthesis (MPS) is the fundamental physiological mechanism driving skeletal muscle adaptation, repair, and hypertrophy following resistance training...</p><h4>1. The Leucine Trigger Hypothesis</h4><p>Research demonstrates that approximately 3g of L-Leucine per bolus is required to reach peak mTORC1 activation in active individuals...</p>',
  'Discover how protein intake timing, leucine threshold, and essential amino acid availability optimize muscle hypertrophy and recovery post-workout.',
  'Nutrition Science',
  '5 min read',
  'linear-gradient(135deg, #0A2FFF 0%, #061B99 100%)',
  '2026-08-18'
),
(
  'Creatine Monohydrate vs. Tri-Creatine: Research Breakdown',
  'creatine-monohydrate-vs-tri-creatine',
  'Elena Rostova, CSCS',
  '<p>Creatine remains the most extensively validated ergogenic aid in sports science literature...</p>',
  'An evidence-based analysis of solubility, gastric comfort, cellular hydration, and ATP regeneration differences between creatine forms.',
  'Performance',
  '6 min read',
  'linear-gradient(135deg, #7C3AED 0%, #4C1D95 100%)',
  '2026-08-10'
),
(
  'Intra-Workout Hydration & Electrolytes for Peak Athletic Output',
  'intra-workout-hydration-electrolytes',
  'David Chen, M.S.',
  '<p>Electrolyte equilibrium governs neuromuscular signaling and cellular osmolality during intense exercise...</p>',
  'Why plain water alone is insufficient during high-intensity training sessions over 45 minutes.',
  'Recovery',
  '4 min read',
  'linear-gradient(135deg, #059669 0%, #064E3B 100%)',
  '2026-08-02'
);


-- ============================================
-- STORAGE BUCKETS (run via Supabase dashboard or API)
-- These are informational — create buckets in Supabase Storage UI:
--   1. product-images  (public)
--   2. blog-images     (public)
--   3. lab-report-images (public)
-- ============================================

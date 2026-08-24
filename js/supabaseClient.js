/* ============================================
   SSN ELITE — Supabase Client & Data Layer
   Unified helper for all database and storage operations.
   Uses @supabase/supabase-js loaded via CDN.
   ============================================ */

/**
 * Initialize Supabase client.
 * Reads URL and Key from SSN_CONFIG.supabase or falls back to defaults.
 */
function getSupabaseClient() {
  if (window._ssnSupabase) return window._ssnSupabase;

  const config = (window.SSN_CONFIG && window.SSN_CONFIG.supabase) || {};
  const url = config.url || '';
  const key = config.anonKey || '';

  if (!url || !key) {
    console.warn('[SSN Supabase] No Supabase URL or Anon Key configured. Database features disabled.');
    return null;
  }

  if (typeof window.supabase === 'undefined' || !window.supabase.createClient) {
    console.warn('[SSN Supabase] supabase-js library not loaded.');
    return null;
  }

  window._ssnSupabase = window.supabase.createClient(url, key);
  return window._ssnSupabase;
}


/* ══════════════════════════════════════════════
   AUTH — Admin Login / Logout / Session Check
   ══════════════════════════════════════════════ */

async function adminLogin(email, password) {
  const sb = getSupabaseClient();
  if (!sb) {
    if (typeof window.supabase === 'undefined') {
      return { error: { message: 'Supabase library failed to load (CDN blocked or network error).' } };
    }
    return { error: { message: 'Supabase not configured. Config is missing.' } };
  }

  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  return { data, error };
}

async function adminLogout() {
  const sb = getSupabaseClient();
  if (!sb) return;
  await sb.auth.signOut();
}

async function checkAdminAuth() {
  const sb = getSupabaseClient();
  if (!sb) return null;

  try {
    const { data: { session } } = await sb.auth.getSession();
    return session;
  } catch (err) {
    console.warn('[SSN Supabase] Error getting auth session:', err);
    return null;
  }
}


/* ══════════════════════════════════════════════
   USER SUBMISSIONS / ENQUIRIES
   ══════════════════════════════════════════════ */

async function saveUserSubmission(formData) {
  const sb = getSupabaseClient();
  if (!sb) return { error: { message: 'Database not available.' } };

  const payload = {
    full_name: (formData.full_name || '').trim(),
    email: (formData.email || '').trim(),
    phone: (formData.phone || '').trim(),
    address: (formData.address || '').trim(),
    message: (formData.message || '').trim() || null
  };

  // 1. Database INSERT happens first (Omit .select() to preserve anonymous INSERT security under RLS)
  const { error } = await sb
    .from('user_submissions')
    .insert([payload]);

  if (error) {
    return { data: null, error };
  }

  console.log('[SSN] enquiry insert succeeded');

  // 2. Edge Function notification trigger (Zero frontend secrets)
  // Customer success is NEVER blocked even if notification service is delayed or offline
  const notifPayload = { record: { ...payload, created_at: new Date().toISOString() } };
  const config = (window.SSN_CONFIG && window.SSN_CONFIG.supabase) || {};
  const notifUrl = (config.url || 'https://pnxnwtrozxxqoofxutci.supabase.co') + '/functions/v1/notify-enquiry';
  const anonKey = config.anonKey || 'sb_publishable_QH1WF8LiQIxdNbOym0oCIw_gDZn28x0';

  console.log('[SSN] invoking notify-enquiry');

  try {
    fetch(notifUrl, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
        'Authorization': 'Bearer ' + anonKey
      },
      body: JSON.stringify(notifPayload)
    }).then(async res => {
      const resData = await res.json().catch(() => ({}));
      if (res.ok) {
        console.log('[SSN] notify-enquiry returned:', resData);
      } else {
        console.warn(`[SSN] notify-enquiry invocation failed with status ${res.status}:`, resData);
      }
    }).catch(err => {
      console.warn('[SSN] notify-enquiry invocation failed:', err);
    });
  } catch (notifErr) {
    console.warn('[SSN] notify-enquiry invocation failed:', notifErr);
  }

  return { data: { success: true }, error: null };
}

async function getUserSubmissions() {
  const sb = getSupabaseClient();
  if (!sb) return { data: [], error: null };

  const { data, error } = await sb
    .from('user_submissions')
    .select('*')
    .order('created_at', { ascending: false });

  return { data: data || [], error };
}

async function deleteUserSubmission(id) {
  const sb = getSupabaseClient();
  if (!sb) return { error: { message: 'Database not available.' } };

  const { error } = await sb
    .from('user_submissions')
    .delete()
    .eq('id', id);

  return { error };
}


/* ══════════════════════════════════════════════
   STORAGE — Secure File Upload
   ══════════════════════════════════════════════ */

async function uploadFileToStorage(folder, file) {
  const sb = getSupabaseClient();
  if (!sb) return { error: { message: 'Database not available.' } };

  // Strict MIME type validation
  const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
  const ALLOWED_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf'];
  const fileType = (file.type || '').toLowerCase();
  const fileNameLower = (file.name || '').toLowerCase();
  const fileExt = (file.name.split('.').pop() || '').toLowerCase();

  // Max 25 MB file limit
  if (file.size > 25 * 1024 * 1024) {
    return { error: { message: 'File is too large. Maximum allowed size is 25 MB.' } };
  }

  // Check Extension whitelist
  if (!ALLOWED_EXTS.includes(fileExt)) {
    return { error: { message: `File extension .${fileExt} is not allowed. Only .jpg, .png, .webp, .gif, and .pdf files are accepted.` } };
  }

  // Check MIME whitelist
  if (fileType && !ALLOWED_MIME_TYPES.includes(fileType)) {
    return { error: { message: `File MIME type "${fileType}" is not permitted. Allowed types: JPEG, PNG, WebP, GIF, PDF.` } };
  }

  // Safe file naming & Path Traversal Prevention
  const rawBaseName = file.name.replace(/\.[^/.]+$/, "");
  const cleanBaseName = rawBaseName.replace(/[^a-zA-Z0-9-_]/g, '-').substring(0, 40) || 'upload';
  const cleanFolder = folder.replace(/[^a-zA-Z0-9-_\/]/g, '').replace(/\.\./g, '');
  const filePath = `${cleanFolder}/${cleanBaseName}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}.${fileExt}`;

  // Upload to ssn-uploads bucket
  let res = await sb.storage
    .from('ssn-uploads')
    .upload(filePath, file, { cacheControl: '3600', upsert: true });

  if (res.error) {
    console.warn('[SSN Storage] Upload to ssn-uploads returned:', res.error.message);
    // If bucket not found, attempt creation if user has permissions
    if (res.error.message && (res.error.message.includes('not found') || res.error.statusCode === '404')) {
      try {
        await sb.storage.createBucket('ssn-uploads', { public: true });
        res = await sb.storage.from('ssn-uploads').upload(filePath, file, { cacheControl: '3600', upsert: true });
      } catch (createErr) {}
    }

    // Try alternate bucket names if needed
    if (res.error) {
      const altBucket = folder.startsWith('products') ? 'product-images' : folder.startsWith('blogs') ? 'blog-images' : 'lab-report-images';
      const altRes = await sb.storage.from(altBucket).upload(filePath, file, { cacheControl: '3600', upsert: true });
      if (!altRes.error) {
        const { data: urlData } = sb.storage.from(altBucket).getPublicUrl(filePath);
        return { publicUrl: urlData.publicUrl, error: null };
      }
      return { error: res.error };
    }
  }

  const { data: urlData } = sb.storage.from('ssn-uploads').getPublicUrl(filePath);
  return { publicUrl: urlData.publicUrl, error: null };
}


/* ══════════════════════════════════════════════
   PRODUCTS — CRUD Operations with Schema Resilience
   ══════════════════════════════════════════════ */

const DEFAULT_SSN_PRODUCTS = [
  {
    id: 'prod-pw-01',
    name: 'SSN Elite Performance Whey',
    title: 'SSN Elite Performance Whey',
    slug: 'performance-whey',
    series: 'SSN ELITE SERIES',
    category: 'Lean Muscle',
    selling_price: '₹10,499',
    price: '₹10,499',
    mrp: '₹10,499',
    discount: '',
    serving_size: '3 KG',
    servings: '70 Servings',
    protein_per_serving: '24g Protein / Serving',
    badges: ['3 KG', '70 Servings', '24g Protein / Serving', 'Gluten Free'],
    goal_badges: ['STRENGTH TRAINING', 'SPORTS', 'ACTIVE LIFESTYLE'],
    image_url: 'assets/images/products/performance-whey.webp',
    main_image: 'assets/images/products/performance-whey.webp',
    gallery_images: ['assets/images/products/performance-whey.webp'],
    short_description: 'Whey protein concentrate with a complete amino acid profile for daily performance nutrition.',
    status: 'Active',
    product_intro: {
      tag: 'EDUCATIONAL',
      heading: 'What Is Performance Whey?',
      content: 'Performance Whey is a whey protein-based nutritional supplement designed to help you meet your daily protein requirements. Protein is an essential macronutrient that supports muscle repair, recovery, and growth — especially important for people who train regularly or lead active lifestyles.\n\nRather than rely solely on whole food sources to meet elevated protein needs, a whey protein supplement provides a convenient, concentrated way to intake consistent portions daily. Quick mixing is formulated to remove tedious quantity in preference a form that can be easily mixed and consumed.\n\nSSN Elite Performance Whey uses Whey Protein Concentrate (WPC) as its primary protein source, delivering 24g of protein per scoop, supplemented by a BCAA + Silk Amino Acid blend, additional EAAs, glutamine, and a digestive enzyme blend to support absorption.'
    },
    key_metric: { number: '24', unit: 'G', label: 'PROTEIN PER SERVING', sublabel: 'Per scoop (34g) serving' },
    protein_source: {
      tag: 'WPC (WHEY PROTEIN CONCENTRATE)',
      label: 'EDUCATIONAL',
      heading: 'The Protein Source',
      content: 'Whey Protein Concentrate (WPC) is derived from milk during the cheese-making process. When milk is processed, it separates into curds (used for cheese) and a liquid called whey. This liquid whey is then filtered and dried to create whey protein concentrate.\n\nWPC retains more of the naturally-occurring nutrients found in whey compared to more heavily processed forms. It typically contains a high percentage of protein along with small amounts of fat, carbohydrates, and bioactive compounds that are naturally present in whey.\n\nAs a protein source, WPC provides a complete amino acid profile delivering 24g protein per serving — meaning it contains all nine essential amino acids that the body cannot produce on its own and must obtain through diet.'
    },
    amino_acid_profile: {
      title: 'The Amino Acid Profile',
      label: 'FROM PACKAGING',
      description: 'Performance Whey includes a BCAA + Silk Amino Acid blend along with additional essential amino acids and glutamine. The following amino acids are listed on the product packaging:',
      groups: [
        {
          title: 'BCAA + Silk Amino Acid Blend',
          items: [
            { category: 'BCAA', name: 'L-Leucine' },
            { category: 'BCAA', name: 'L-Isoleucine' },
            { category: 'BCAA', name: 'L-Valine' },
            { category: 'AMINO ACID', name: 'L-Glycine' },
            { category: 'AMINO ACID', name: 'L-Alanine' },
            { category: 'AMINO ACID', name: 'L-Serine' },
            { category: 'AMINO ACID', name: 'L-Threonine' }
          ]
        },
        {
          title: 'Additional Components',
          items: [
            { category: 'RECOVERY', name: 'Glutamine' },
            { category: 'AMINO ACIDS', name: 'AAKG (L-Arginine)' },
            { category: 'SPECIALTY', name: 'Silk Amino Acids' }
          ]
        }
      ]
    },
    ingredients_accordion: [
      { title: 'Whey Protein Concentrate', description: 'Primary protein source providing 24g complete protein per serving with maximum bioavailability.' },
      { title: 'BCAA + Silk Amino Acid Blend', description: 'Branched-chain amino acids (Leucine, Isoleucine, Valine) combined with specialty silk amino acids.' },
      { title: 'Flavour & Additives', description: 'Precision formulated flavouring system for clean mixability and taste.' },
      { title: 'Digestive Enzyme Blend', description: 'Multi-enzyme complex designed to optimize protein breakdown and digestive comfort.' },
      { title: 'Glutamine', description: 'Essential conditionally-amino acid supporting muscle tissue repair and immune balance.' },
      { title: 'Silk Amino Acids', description: 'Targeted amino acid sequence supporting stamina and cellular recovery.' }
    ],
    nutrition_facts: [
      { nutrient: 'Energy', unit: 'kcal', amount: '138.04' },
      { nutrient: 'Protein', unit: 'g', amount: '24.00' },
      { nutrient: 'Carbohydrates', unit: 'g', amount: '4.80' },
      { nutrient: 'Fats', unit: 'g', amount: '2.50' }
    ],
    flavours: [
      { name: 'Chocolate Brownie', description: 'Rich artisanal chocolate brownie flavour profile with deep cocoa notes.', image: 'assets/images/flavours/chocolate-brownie.png' },
      { name: 'Mawa Kulfi', description: 'Traditional Indian dessert delicacy with condensed milk and aromatic cardamom.', image: 'assets/images/flavours/mawa-kulfi.png' },
      { name: 'Cookies & Cream', description: 'Classic sweet biscuit crumble with rich dairy cream and velvety texture.', image: 'assets/images/flavours/cookies-cream.png' },
      { name: 'Coffee Latte', description: 'Smooth roasted espresso notes with a creamy latte body for coffee lovers.', image: 'assets/images/flavours/coffee-latte.png' },
      { name: 'Strawberry Ice Cream', description: 'Fresh summer berry notes with creamy milkshake body.', image: 'assets/images/flavours/strawberry.png' },
      { name: 'Blueberry Ice Cream', description: 'Wild antioxidant-rich blueberry essence with subtle sweetness.', image: 'assets/images/flavours/blueberry-icecream.png' }
    ],
    how_to_use: [
      { step: '01', title: 'Measure', description: 'Take approximately 1 scoop of Performance Whey powder (delivers 24g protein per scoop).' },
      { step: '02', title: 'Mix', description: 'Add to 180-200 ml of cold water, milk, or preferred beverage of your choice.' },
      { step: '03', title: 'Shake', description: 'Shake or stir with a spoon for approximately 30 seconds until fully dispersed.' }
    ],
    target_audience: [
      { icon: '🏋️', title: 'Strength Training', description: 'For muscle repair and growth after resistance training.' },
      { icon: '⚡', title: 'Sports & Athletics', description: 'To support athletic recovery and muscle maintenance.' },
      { icon: '🏃', title: 'Active Lifestyle', description: 'To meet daily protein goals alongside regular physical activity.' },
      { icon: '🎯', title: 'Daily Protein Goals', description: 'For individuals seeking a reliable, high-quality supplemental protein source.' }
    ],
    storage_info: { heading: 'STORAGE', content: 'Store in a cool, dry place away from direct sunlight. Keep the container tightly closed after use. Keep away from children.' },
    important_notice: { heading: 'IMPORTANT NOTICE', content: 'This product is a dietary supplement and is not intended to be a substitute for a varied diet. Consult a healthcare professional before use, especially if you have a medical condition or are taking medication.' }
  },
  {
    id: 'prod-amm-02',
    name: 'SSN Elite Anabolic Monster Mass',
    title: 'SSN Elite Anabolic Monster Mass',
    slug: 'anabolic-monster-mass',
    series: 'SSN ELITE SERIES',
    category: 'Size & Strength',
    selling_price: '₹6,999',
    price: '₹6,999',
    mrp: '₹6,999',
    discount: '',
    serving_size: '4 KG',
    servings: '25 Servings',
    protein_per_serving: '28g Protein / Serving',
    badges: ['4 KG', '25 Servings', '28g Protein / Serving', 'Caloric Surplus Matrix'],
    goal_badges: ['MASS GAIN', 'HYPERTROPHY', 'HIGH CALORIE'],
    image_url: 'assets/images/products/anabolic-monster-mass.webp',
    main_image: 'assets/images/products/anabolic-monster-mass.webp',
    gallery_images: ['assets/images/products/anabolic-monster-mass.webp'],
    short_description: 'A high-density mass gainer formulated with 28g protein per serving to support strength and caloric surplus.',
    status: 'Active',
    product_intro: {
      tag: 'EDUCATIONAL',
      heading: 'What Is Anabolic Monster Mass?',
      content: 'Anabolic Monster Mass is a high-density caloric and protein matrix engineered for athletes, hardgainers, and strength competitors seeking substantial increases in muscle volume and body mass.\n\nFormulated with multi-phase carbohydrates and delivering 28g of protein per serving, it ensures sustained amino acid delivery and glycogen replenishment to fuel intensive workouts and progressive weight gain without unnecessary sugar spikes.'
    },
    key_metric: { number: '28', unit: 'G', label: 'PROTEIN PER SERVING', sublabel: 'Per mass gainer serving' },
    protein_source: {
      tag: 'MULTI-STAGE PROTEIN & COMPLEX CARBS',
      label: 'EDUCATIONAL',
      heading: 'The Mass Blend Source',
      content: 'Precision blend of Whey Protein Concentrate, Micellar Casein, and complex carbohydrate sources engineered for progressive caloric surplus and sustained 28g protein delivery.'
    },
    ingredients_accordion: [
      { title: 'Multi-Phase Protein Matrix', description: 'Delivering 28g protein per serving from whey protein concentrate and micellar casein for immediate and prolonged amino release.' },
      { title: 'Complex Carbohydrate Blend', description: 'Low-GI complex carbohydrates ensuring steady insulin response and sustained glycogen replenishment.' },
      { title: 'MCT & Healthy Lipid Complex', description: 'Medium-chain triglycerides providing clean, dense energy for intensive training output.' },
      { title: 'Digestive Enzymes', description: 'Enzyme blend to enhance nutrient assimilation across high-volume caloric intakes.' }
    ],
    nutrition_facts: [
      { nutrient: 'Energy', unit: 'kcal', amount: '1120' },
      { nutrient: 'Protein', unit: 'g', amount: '28.00' },
      { nutrient: 'Carbohydrates', unit: 'g', amount: '210.00' },
      { nutrient: 'Fats', unit: 'g', amount: '7.50' }
    ],
    flavours: [
      { name: 'Chocolate Brownie', description: 'Decadent dark cocoa fudge profile designed for rich high-calorie shakes.', image: 'assets/images/flavours/chocolate-brownie.png' },
      { name: 'Cookies & Cream', description: 'Crunchy cookie biscuit notes layered over sweet cream for high-density caloric nutrition.', image: 'assets/images/flavours/cookies-cream.png' },
      { name: 'Strawberry Milk Shake', description: 'Creamy whole-milk strawberry milkshake profile for effortless high-calorie consumption.', image: 'assets/images/flavours/strawberry.png' }
    ],
    how_to_use: [
      { step: '01', title: 'Measure', description: 'Add 2-3 scoops into 400-500 ml of cold water or full-cream milk (delivers 28g protein per serving).' },
      { step: '02', title: 'Blend', description: 'Blend for 45-60 seconds for maximum creaminess and texture.' },
      { step: '03', title: 'Consume', description: 'Drink between meals or immediately post-workout to support caloric surplus.' }
    ],
    target_audience: [
      { icon: '🏋️', title: 'Hardgainers', description: 'Individuals struggling to consume adequate calories through whole food alone.' },
      { icon: '⚡', title: 'Strength Competitors', description: 'Powerlifters and strongmen needing dense energy during heavy training blocks.' },
      { icon: '🏃', title: 'High Volume Athletes', description: 'Athletes burning extreme calories during multi-hour daily training sessions.' },
      { icon: '🎯', title: 'Hypertrophy Phases', description: 'Bodybuilders in dedicated off-season muscle accretion cycles.' }
    ],
    storage_info: { heading: 'STORAGE', content: 'Store in a cool, dry place away from direct sunlight. Keep tightly sealed.' },
    important_notice: { heading: 'IMPORTANT NOTICE', content: 'Dietary supplement. Consult your health professional before use.' }
  },
  {
    id: 'prod-tc-03',
    name: 'SSN Elite Tri Creatine',
    title: 'SSN Elite Tri Creatine',
    slug: 'tri-creatine',
    series: 'SSN ELITE SERIES',
    category: 'Strength / Performance',
    selling_price: '₹2,499',
    price: '₹2,499',
    mrp: '₹2,499',
    discount: '',
    serving_size: '300 G',
    servings: '100 Servings',
    protein_per_serving: '',
    badges: ['300 G', '100 Servings', '3g Creatine / Serving', 'HPLC Tested'],
    goal_badges: ['EXPLOSIVE POWER', 'ATP SYNTHESIS', 'STRENGTH'],
    image_url: 'assets/images/products/tri-creatine.webp',
    main_image: 'assets/images/products/tri-creatine.webp',
    gallery_images: ['assets/images/products/tri-creatine.webp'],
    short_description: 'A precision creatine blend delivering 3g creatine per serving to support power, strength, and training output.',
    status: 'Active',
    product_intro: {
      tag: 'EDUCATIONAL',
      heading: 'What Is Tri Creatine?',
      content: 'Tri Creatine is a multi-molecular creatine matrix delivering 3g pure creatine per serving, engineered to maximize intracellular phosphocreatine stores, cellular hydration, and ATP re-synthesis during high-intensity training.\n\nCombines micronized creatine monohydrate, creatine malate, and creatine hydrochloride for rapid bioavailability without gastrointestinal distress.'
    },
    key_metric: { number: '3', unit: 'G', label: 'CREATINE PER SERVING', sublabel: 'Per level scoop (3g) serving' },
    protein_source: {
      tag: '100% PURE MICRONIZED CREATINE MATRIX',
      label: 'EDUCATIONAL',
      heading: 'The Creatine Source',
      content: 'Pharmaceutical grade HPLC-tested micronized creatine sources delivering 3g creatine per serving, manufactured under stringent ISO/IEC 17025 certification.'
    },
    ingredients_accordion: [
      { title: 'Micronized Creatine Monohydrate', description: 'Micro-milled 200 mesh powder providing 2000mg for rapid solution dispersion and enhanced gastric tolerance.' },
      { title: 'Creatine Malate', description: '500mg creatine bonded with malic acid to support the Krebs cycle and endurance capacity.' },
      { title: 'Creatine HCL', description: '500mg highly water-soluble creatine salt engineered for optimal bioavailability.' }
    ],
    nutrition_facts: [
      { nutrient: 'Creatine Monohydrate', unit: 'mg', amount: '2000' },
      { nutrient: 'Creatine Malate', unit: 'mg', amount: '500' },
      { nutrient: 'Creatine HCL', unit: 'mg', amount: '500' },
      { nutrient: 'Energy / Calories', unit: 'kcal', amount: '0' }
    ],
    flavours: [
      { name: 'Orange Sluch', description: 'Zesty citrus orange slush flavour delivering refreshing cellular hydration.', image: 'assets/images/flavours/orange.png' },
      { name: 'Watermelon', description: 'Crisp and juicy summer watermelon flavour engineered for rapid dissolution and clean taste.', image: 'assets/images/flavours/watermelon.png' },
      { name: 'Pineapple', description: 'Tropical tangy pineapple profile with smooth solubility and clean finish.', image: 'assets/images/flavours/pineapple.png' },
      { name: 'Lemon Lime', description: 'Electric citrus lemon-lime fusion designed for instant refreshing cellular uptake.', image: 'assets/images/flavours/lemon.png' }
    ],
    how_to_use: [
      { step: '01', title: 'Scoop', description: 'Mix 1 level scoop (3g) with 200-250 ml of water or fruit juice (delivers 3g creatine per serving).' },
      { step: '02', title: 'Stir', description: 'Stir for 15-20 seconds until clear.' },
      { step: '03', title: 'Drink', description: 'Consume daily pre-workout or post-workout with a carbohydrate source.' }
    ],
    target_audience: [
      { icon: '🏋️', title: 'Powerlifters', description: 'Maximizes maximal 1-rep strength and explosive force output.' },
      { icon: '⚡', title: 'Sprinters & Field Athletes', description: 'Enhances repeated sprint ability and short-duration power output.' },
      { icon: '🏃', title: 'Combat Sports', description: 'Supports explosive grappling and striking power bursts.' },
      { icon: '🎯', title: 'Hypertrophy Training', description: 'Increases intracellular water volume to stimulate muscle protein synthesis.' }
    ],
    storage_info: { heading: 'STORAGE', content: 'Store in a cool, dry place. Keep sealed.' },
    important_notice: { heading: 'IMPORTANT NOTICE', content: 'Ensure adequate daily water intake when supplementing with creatine.' }
  },
  {
    id: 'prod-eaa-04',
    name: 'SSN Elite EAA + BCAA + Glutamine',
    title: 'SSN Elite EAA + BCAA + Glutamine',
    slug: 'eaa-bcaa-glutamine',
    series: 'SSN ELITE SERIES',
    category: 'Amino Acids / Recovery',
    selling_price: '₹2,799',
    price: '₹2,799',
    mrp: '₹2,799',
    discount: '',
    serving_size: '300 G',
    servings: '30 Servings',
    protein_per_serving: '',
    badges: ['300 G', '30 Servings', '7.8g Amino Acids / 10g Serving', '4g EAA • 3g BCAA', '1g Glutamine • 1140mg Electrolytes'],
    goal_badges: ['INTRA-WORKOUT', 'RECOVERY', 'ANTI-CATABOLIC'],
    image_url: 'assets/images/products/eaa-bcaa-glutamine.webp',
    main_image: 'assets/images/products/eaa-bcaa-glutamine.webp',
    gallery_images: ['assets/images/products/eaa-bcaa-glutamine.webp'],
    short_description: '7.8g amino acids per 10g serving (7g amino acid matrix, 4g EAA, 3g BCAA, 1g L-Glutamine, 1140mg electrolytes) for intra-workout recovery.',
    status: 'Active',
    product_intro: {
      tag: 'EDUCATIONAL',
      heading: 'What Is EAA + BCAA + Glutamine?',
      content: 'A clinical-grade intra-workout amino acid formula delivering 7.8g amino acids per 10g serving with a 7g amino acid matrix containing 4g EAA, 3g BCAA, 1g L-Glutamine, and 1140mg electrolytes to accelerate recovery and halt muscle breakdown during intense sessions.'
    },
    key_metric: { number: '7.8', unit: 'G', label: 'AMINO ACIDS PER 10G SERVING', sublabel: '7g Amino Matrix • 4g EAA • 3g BCAA • 1g L-Glutamine • 1140mg Electrolytes' },
    protein_source: {
      tag: 'FERMENTED FREE-FORM AMINO ACIDS',
      label: 'EDUCATIONAL',
      heading: 'The Amino Acid Source',
      content: 'Plant-fermented, instantized free-form amino acids delivering 7.8g amino acids per 10g serving (4g EAA, 3g BCAA, 1g L-Glutamine, 1140mg electrolytes) engineered for zero-digestion direct cellular uptake.'
    },
    amino_acid_profile: {
      title: 'The Amino Acid Matrix',
      label: 'FROM PACKAGING',
      description: '7.8g amino acids per 10g serving containing full spectrum 4g EAAs, 3g BCAAs (2:1:1), 1g fermented L-Glutamine, and 1140mg electrolytes delivering immediate intracellular recovery.',
      groups: [
        {
          title: 'BCAA Matrix (3g / 3000mg)',
          items: [
            { category: 'BCAA', name: 'L-Leucine (Instantized)' },
            { category: 'BCAA', name: 'L-Isoleucine' },
            { category: 'BCAA', name: 'L-Valine' }
          ]
        },
        {
          title: 'Essential Amino Acid Spectrum (4g / 4000mg)',
          items: [
            { category: 'EAA', name: 'L-Lysine' },
            { category: 'EAA', name: 'L-Threonine' },
            { category: 'EAA', name: 'L-Phenylalanine' },
            { category: 'EAA', name: 'L-Methionine' },
            { category: 'EAA', name: 'L-Histidine' },
            { category: 'EAA', name: 'L-Tryptophan' }
          ]
        },
        {
          title: 'Recovery & Electrolytes (1g Glutamine + 1140mg Electrolytes)',
          items: [
            { category: 'RECOVERY', name: 'Fermented L-Glutamine (1g)' },
            { category: 'HYDRATION', name: 'Electrolyte Complex (1140mg)' }
          ]
        }
      ]
    },
    ingredients_accordion: [
      { title: 'Instantized BCAA Complex (3g / 3000mg)', description: '3g BCAAs (2:1:1 ratio: Leucine, Isoleucine, Valine) formulated to stimulate mTOR and muscle protein synthesis.' },
      { title: 'Complete EAA Matrix (4g / 4000mg)', description: '4g Essential Amino Acids required for complete protein synthesis.' },
      { title: 'Fermented L-Glutamine (1g / 1000mg)', description: '1g fermented L-Glutamine supporting intestinal barrier function and muscle glycogen resynthesis.' },
      { title: 'Electrolyte Hydration Complex (1140mg)', description: '1140mg cellular hydration complex maintaining fluid balance and preventing cramping.' }
    ],
    nutrition_facts: [
      { nutrient: 'Amino Acid Matrix', unit: 'g', amount: '7.8' },
      { nutrient: 'EAA Complex', unit: 'g', amount: '4.0' },
      { nutrient: 'BCAA Blend (2:1:1)', unit: 'g', amount: '3.0' },
      { nutrient: 'L-Glutamine', unit: 'g', amount: '1.0' },
      { nutrient: 'Electrolyte Matrix', unit: 'mg', amount: '1140' },
      { nutrient: 'Sugar / Carbs', unit: 'g', amount: '0' }
    ],
    flavours: [
      { name: 'Orange Sluch', description: 'Bright, refreshing orange slush profile providing sustained intra-workout hydration.', image: 'assets/images/flavours/orange.png' },
      { name: 'Watermelon', description: 'Crisp, thirst-quenching watermelon essence engineered for continuous sipping during intense training.', image: 'assets/images/flavours/watermelon.png' },
      { name: 'Mixed Fruit', description: 'Exotic tropical fruit fusion combining berries, citrus, and melon for an energizing intra-workout drink.', image: 'assets/images/flavours/fusion_fruit.png' },
      { name: 'Mojito', description: 'Cool garden mint and fresh lime zest profile delivering clean, crisp anti-catabolic recovery.', image: 'assets/images/flavours/mojito.png' },
      { name: 'Pineapple', description: 'Sweet and tangy tropical pineapple notes with optimal electrolyte balance.', image: 'assets/images/flavours/pineapple.png' },
      { name: 'Green Apple', description: 'Crisp tart green apple burst providing maximum refreshment and endurance output.', image: 'assets/images/flavours/green_mango.png' }
    ],
    how_to_use: [
      { step: '01', title: 'Measure', description: 'Mix 1 scoop (10g) in 350-400 ml of ice-cold water (delivers 7.8g amino acids per 10g serving).' },
      { step: '02', title: 'Shake', description: 'Shake for 20 seconds in your shaker bottle.' },
      { step: '03', title: 'Sip', description: 'Sip continuously throughout your workout session.' }
    ],
    target_audience: [
      { icon: '🏋️', title: 'Endurance Athletes', description: 'Prevents central nervous system fatigue during long endurance sessions.' },
      { icon: '⚡', title: 'Fasted Training', description: 'Prevents muscle catabolism when training in a calorie deficit or morning fasted state.' },
      { icon: '🏃', title: 'High-Volume Lifters', description: 'Reduces delayed onset muscle soreness (DOMS) across frequent training days.' },
      { icon: '🎯', title: 'Intra-Workout Hydration', description: 'Maintains electrolyte balance and cellular hydration under heat and exertion.' }
    ],
    storage_info: { heading: 'STORAGE', content: 'Store in a cool dry place. Keep sealed.' },
    important_notice: { heading: 'IMPORTANT NOTICE', content: 'Dietary supplement. Keep out of reach of children.' }
  }
];

async function getProducts() {
  const sb = getSupabaseClient();
  let dbProducts = [];

  if (sb) {
    try {
      const { data, error } = await sb
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (data && Array.isArray(data)) {
        dbProducts = data;
      }
    } catch (err) {
      console.warn('[SSN Supabase] getProducts exception:', err);
    }
  }

  // Combine default product specifications with database records and local storage
  let mergedProducts = [...DEFAULT_SSN_PRODUCTS];

  if (dbProducts.length > 0) {
    dbProducts.forEach(dbItem => {
      const dbSlug = (dbItem.slug || '').trim().toLowerCase();
      const dbName = (dbItem.name || dbItem.title || '').trim().toLowerCase();

      const matchIdx = mergedProducts.findIndex(m => {
        const mSlug = (m.slug || '').trim().toLowerCase();
        const mName = (m.name || m.title || '').trim().toLowerCase();
        return (dbSlug && mSlug === dbSlug) || (dbName && mName === dbName) || (dbItem.id && m.id === dbItem.id);
      });

      if (matchIdx >= 0) {
        // Deep merge so custom updates take priority over default spec
        mergedProducts[matchIdx] = { ...mergedProducts[matchIdx], ...dbItem };
      } else {
        mergedProducts.push(dbItem);
      }
    });
  }

  // Merge with locally stored products to ensure newly created products in Admin are immediately accessible
  try {
    const local = JSON.parse(localStorage.getItem('ssn_local_products') || '[]');
    if (Array.isArray(local) && local.length > 0) {
      local.forEach(lp => {
        const matchIdx = mergedProducts.findIndex(dp => (lp.id && dp.id === lp.id) || (dp.name && lp.name && dp.name.toLowerCase() === lp.name.toLowerCase()));
        if (matchIdx >= 0) {
          mergedProducts[matchIdx] = { ...mergedProducts[matchIdx], ...lp };
        } else {
          mergedProducts.unshift(lp);
        }
      });
    }
  } catch (e) {}

function normalizeProductData(p) {
  if (!p) return p;
  const slug = (p.slug || '').toLowerCase();
  const name = (p.name || p.title || '').toLowerCase();

  // 1. ANABOLIC MONSTER MASS NORMALIZATION
  if (slug.includes('monster-mass') || slug.includes('anabolic') || name.includes('monster mass')) {
    p.protein_per_serving = '28g Protein / Serving';
    p.serving_size = '4 KG';
    p.servings = '25 Servings';
    p.badges = ['4 KG', '25 Servings', '28g Protein / Serving', 'Caloric Surplus Matrix'];
    p.key_metric = { number: '28', unit: 'G', label: 'PROTEIN PER SERVING', sublabel: 'Per mass gainer serving' };
    if (Array.isArray(p.nutrition_facts)) {
      p.nutrition_facts = p.nutrition_facts.map(n => {
        if (n.nutrient && n.nutrient.toLowerCase() === 'protein') {
          return { ...n, amount: '28.00' };
        }
        return n;
      });
    }
  }

  // 2. TRI CREATINE NORMALIZATION
  else if (slug.includes('tri-creatine') || slug.includes('creatine') || name.includes('creatine')) {
    p.protein_per_serving = ''; // No protein badge
    p.serving_size = '300 G';
    p.servings = '100 Servings';
    p.badges = ['300 G', '100 Servings', '3g Creatine / Serving', 'HPLC Tested'];
    p.key_metric = { number: '3', unit: 'G', label: 'CREATINE PER SERVING', sublabel: 'Per level scoop (3g) serving' };
    if (Array.isArray(p.nutrition_facts)) {
      p.nutrition_facts = p.nutrition_facts.filter(n => !(n.nutrient && n.nutrient.toLowerCase() === 'protein'));
    }
  }

  // 3. EAA + BCAA + GLUTAMINE NORMALIZATION
  else if (slug.includes('eaa') || slug.includes('bcaa') || name.includes('eaa') || name.includes('bcaa')) {
    p.protein_per_serving = ''; // No protein badge
    p.serving_size = '300 G';
    p.servings = '30 Servings';
    p.badges = ['300 G', '30 Servings', '7.8g Amino Acids / 10g Serving', '4g EAA • 3g BCAA', '1g Glutamine • 1140mg Electrolytes'];
    p.key_metric = { number: '7.8', unit: 'G', label: 'AMINO ACIDS PER 10G SERVING', sublabel: '7g Amino Matrix • 4g EAA • 3g BCAA • 1g L-Glutamine • 1140mg Electrolytes' };
  }

  // 4. PERFORMANCE WHEY NORMALIZATION
  else if (slug.includes('whey') || name.includes('performance whey')) {
    p.protein_per_serving = '24g Protein / Serving';
    p.serving_size = '3 KG';
    p.servings = '70 Servings';
    p.badges = ['3 KG', '70 Servings', '24g Protein / Serving', 'Gluten Free'];
    p.key_metric = { number: '24', unit: 'G', label: 'PROTEIN PER SERVING', sublabel: 'Per scoop (34g) serving' };
    if (Array.isArray(p.nutrition_facts)) {
      p.nutrition_facts = p.nutrition_facts.map(n => {
        if (n.nutrient && n.nutrient.toLowerCase() === 'protein') {
          return { ...n, amount: '24.00' };
        }
        return n;
      });
    }
  }

  return p;
}

  if (mergedProducts.length > 0) {
    mergedProducts.forEach(p => {
      const rawText = p.full_description || p.description || '';
      const match = rawText.match(/<!--SSN_STRUCTURED_DATA:(.*?)-->/s);
      if (match && match[1]) {
        try {
          const parsed = JSON.parse(decodeURIComponent(match[1]));
          Object.keys(parsed).forEach(k => {
            if (p[k] === undefined || p[k] === null || (typeof p[k] === 'object' && Object.keys(p[k]).length === 0)) {
              p[k] = parsed[k];
            }
          });
          if (p.full_description) p.full_description = p.full_description.replace(/<!--SSN_STRUCTURED_DATA:.*?-->/s, '').trim();
          if (p.description) p.description = p.description.replace(/<!--SSN_STRUCTURED_DATA:.*?-->/s, '').trim();
        } catch (e) {}
      }

      // Apply Single Source of Truth canonical normalization
      normalizeProductData(p);
    });
  }

  return { data: mergedProducts, error: null };
}

async function saveProduct(product) {
  const sb = getSupabaseClient();
  if (!sb) {
    console.error('[SSN Supabase] Database client not available.');
    return { error: { message: 'Database client not available. Please check Supabase configuration.' } };
  }

  const rawId = product.id;
  const isUpdate = Boolean(rawId && typeof rawId === 'string' && rawId.trim() !== '');
  const productId = isUpdate ? rawId.trim() : null;

  const name = (product.name || product.title || '').trim();
  if (!name) {
    return { error: { message: 'Product name is required.' } };
  }

  const slug = (product.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')).trim();

  // Consistent Product Payload matching Database Schema
  const productData = {
    name: name,
    title: name,
    slug: slug,
    category: product.category || 'Lean Muscle',
    series: product.series || 'SSN Elite Series',
    tagline: product.tagline || '',
    price: product.price || product.selling_price || '',
    selling_price: product.selling_price || product.price || '',
    mrp: product.mrp || '',
    discount: product.discount || '',
    serving_size: product.serving_size || '1 Scoop',
    servings: product.servings || '',
    protein_per_serving: product.protein_per_serving || '',
    badges: Array.isArray(product.badges) ? product.badges : [],
    image_url: product.image_url || product.main_image || '',
    main_image: product.main_image || product.image_url || '',
    gallery_images: Array.isArray(product.gallery_images) ? product.gallery_images : [],
    short_description: product.short_description || '',
    full_description: product.full_description || product.description || '',
    description: product.description || product.full_description || '',
    ingredients: product.ingredients || '',
    benefits: product.benefits || '',
    usage_instruction: product.usage_instruction || '',

    // Structured Page Blocks (JSONB)
    hero_data: product.hero_data || {
      series: product.series || 'SSN Elite Series',
      tagline: product.tagline || '',
      selling_price: product.selling_price || product.price || '',
      mrp: product.mrp || '',
      discount: product.discount || '',
      serving_size: product.serving_size || '1 Scoop',
      servings: product.servings || '',
      protein_per_serving: product.protein_per_serving || '',
      badges: Array.isArray(product.badges) ? product.badges : []
    },
    product_intro: product.product_intro || {},
    key_metric: product.key_metric || {},
    protein_source: product.protein_source || {},
    ingredients_accordion: Array.isArray(product.ingredients_accordion) ? product.ingredients_accordion : [],
    nutrition_facts: Array.isArray(product.nutrition_facts) ? product.nutrition_facts : [],
    flavours: Array.isArray(product.flavours) ? product.flavours : [],
    how_to_use: Array.isArray(product.how_to_use) ? product.how_to_use : [],
    target_audience: Array.isArray(product.target_audience) ? product.target_audience : [],
    storage_info: product.storage_info || {},
    important_notice: product.important_notice || {},
    faq: Array.isArray(product.faq) ? product.faq : [],
    metadata: product.metadata || {},

    status: product.status || 'Active',
    seo_title: product.seo_title || name,
    seo_description: product.seo_description || product.short_description || '',
    updated_at: new Date().toISOString()
  };

  // Embed structured data into full_description as a clean, hidden JSON trailer
  // to ensure 100% of structured sections persist even on databases without custom columns
  const structuredBackup = {
    hero_data: productData.hero_data,
    product_intro: productData.product_intro,
    key_metric: productData.key_metric,
    protein_source: productData.protein_source,
    ingredients_accordion: productData.ingredients_accordion,
    nutrition_facts: productData.nutrition_facts,
    flavours: productData.flavours,
    how_to_use: productData.how_to_use,
    target_audience: productData.target_audience,
    storage_info: productData.storage_info,
    important_notice: productData.important_notice,
    discount: productData.discount,
    mrp: productData.mrp,
    selling_price: productData.selling_price,
    series: productData.series,
    tagline: productData.tagline,
    badges: productData.badges,
    gallery_images: productData.gallery_images,
    status: productData.status,
    slug: productData.slug,
    seo_title: productData.seo_title,
    seo_description: productData.seo_description
  };
  const baseDesc = (product.full_description || product.description || product.short_description || '').replace(/<!--SSN_STRUCTURED_DATA:.*?-->/s, '').trim();
  const descWithBackup = `${baseDesc}\n<!--SSN_STRUCTURED_DATA:${encodeURIComponent(JSON.stringify(structuredBackup))}-->`;
  productData.full_description = descWithBackup;
  productData.description = descWithBackup;

  try {
    // Detect available columns in live products table
    let targetPayload = { ...productData };
    try {
      const colCheck = await sb.from('products').select('*').limit(1);
      if (colCheck.data && colCheck.data.length > 0) {
        const availableCols = new Set(Object.keys(colCheck.data[0]));
        const filteredPayload = {};
        for (const key of Object.keys(targetPayload)) {
          if (availableCols.has(key)) {
            filteredPayload[key] = targetPayload[key];
          }
        }
        // Ensure core identifiers always present
        filteredPayload.name = productData.name;
        filteredPayload.price = productData.price;
        targetPayload = filteredPayload;
      }
    } catch (e) {
      console.warn('[SSN Supabase] Column detection warning:', e);
    }

    let result;
    if (isUpdate) {
      console.log(`[SSN Supabase] Updating existing product (ID: ${productId})...`, targetPayload);
      result = await sb.from('products').update(targetPayload).eq('id', productId).select();
    } else {
      console.log('[SSN Supabase] Inserting new product...', targetPayload);
      result = await sb.from('products').insert([targetPayload]).select();
    }

    if (result.error) {
      console.error('[SSN Supabase] Save product error:', result.error);
      const detailStr = result.error.details ? ` (${result.error.details})` : '';
      const hintStr = result.error.hint ? ` Hint: ${result.error.hint}` : '';
      return { 
        data: null, 
        error: { 
          message: `${result.error.message}${detailStr}${hintStr}`,
          code: result.error.code,
          details: result.error.details,
          raw: result.error
        } 
      };
    }

    const savedRecord = (result.data && result.data[0]) || null;
    return { data: savedRecord, error: null };
  } catch (err) {
    console.error('[SSN Supabase] Save product uncaught exception:', err);
    return { data: null, error: { message: err.message || 'Unexpected error occurred while saving product.' } };
  }
}

async function deleteProduct(id) {
  const sb = getSupabaseClient();
  if (!sb) return { error: { message: 'Database not available.' } };

  const { error } = await sb
    .from('products')
    .delete()
    .eq('id', id);

  return { error };
}


/* ══════════════════════════════════════════════
   BLOGS — CRUD Operations
   ══════════════════════════════════════════════ */

async function getBlogs() {
  const sb = getSupabaseClient();
  if (!sb) return { data: [], error: null };

  try {
    const { data, error } = await sb
      .from('blogs')
      .select('*')
      .order('publish_date', { ascending: false });

    return { data: data || [], error };
  } catch (err) {
    console.error('[SSN Supabase] getBlogs error:', err);
    return { data: [], error: { message: err.message } };
  }
}

async function saveBlog(blog) {
  const sb = getSupabaseClient();
  if (!sb) return { error: { message: 'Database not available.' } };

  const title = (blog.title || '').trim();
  const slug = (blog.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')).trim();

  const blogData = {
    title: title,
    slug: slug,
    featured_image: blog.featured_image || '',
    author: (blog.author || 'SSN Elite Research Team').trim(),
    content: blog.content || '',
    excerpt: blog.excerpt || '',
    category: (blog.category || 'Nutrition Science').trim(),
    read_time: (blog.read_time || '5 min read').trim(),
    gradient: blog.gradient || 'linear-gradient(135deg, #0A2FFF 0%, #061B99 100%)',
    seo_title: blog.seo_title || blog.meta_title || title,
    seo_description: blog.seo_description || blog.meta_description || blog.excerpt || '',
    publish_date: blog.publish_date || new Date().toISOString().split('T')[0],
    status: blog.status || 'Published'
  };

  let response;
  if (blog.id) {
    response = await sb.from('blogs').update(blogData).eq('id', blog.id).select();
    if (response.error && response.error.message && response.error.message.includes('status')) {
      delete blogData.status;
      response = await sb.from('blogs').update(blogData).eq('id', blog.id).select();
    }
  } else {
    response = await sb.from('blogs').insert([blogData]).select();
    if (response.error && response.error.message && response.error.message.includes('status')) {
      delete blogData.status;
      response = await sb.from('blogs').insert([blogData]).select();
    }
  }

  return response;
}

async function deleteBlog(id) {
  const sb = getSupabaseClient();
  if (!sb) return { error: { message: 'Database not available.' } };

  const { error } = await sb
    .from('blogs')
    .delete()
    .eq('id', id);

  return { error };
}


/* ══════════════════════════════════════════════
   LAB REPORTS — CRUD Operations
   ══════════════════════════════════════════════ */

async function getLabReports() {
  const sb = getSupabaseClient();
  if (!sb) return { data: [], error: null };

  try {
    const { data, error } = await sb
      .from('lab_reports')
      .select('*')
      .order('created_at', { ascending: false });

    return { data: data || [], error };
  } catch (err) {
    console.error('[SSN Supabase] getLabReports error:', err);
    return { data: [], error: { message: err.message } };
  }
}

async function saveLabReport(report) {
  const sb = getSupabaseClient();
  if (!sb) return { error: { message: 'Database not available.' } };

  const certUrl = report.certificate_url || (Array.isArray(report.report_images) && report.report_images.length > 0 ? report.report_images[0] : '');

  const payload = {
    batch_number: (report.batch_number || '').trim(),
    product_name: (report.product_name || '').trim(),
    lab_name: (report.lab_name || 'ISO/IEC 17025 Accredited Laboratory').trim(),
    test_date: (report.test_date || '').trim(),
    certificate_url: certUrl,
    report_images: certUrl ? [certUrl] : (Array.isArray(report.report_images) ? report.report_images : []),
    parameters: Array.isArray(report.parameters) ? report.parameters : [],
    status: report.status || 'VERIFIED'
  };

  let response;
  if (report.id) {
    response = await sb.from('lab_reports').update(payload).eq('id', report.id).select();
    if (response.error && response.error.message && response.error.message.includes('certificate_url')) {
      delete payload.certificate_url;
      response = await sb.from('lab_reports').update(payload).eq('id', report.id).select();
    }
  } else {
    response = await sb.from('lab_reports').insert([payload]).select();
    if (response.error && response.error.message && response.error.message.includes('certificate_url')) {
      delete payload.certificate_url;
      response = await sb.from('lab_reports').insert([payload]).select();
    }
  }

  return response;
}

async function deleteLabReport(id) {
  const sb = getSupabaseClient();
  if (!sb) return { error: { message: 'Database not available.' } };

  const { error } = await sb
    .from('lab_reports')
    .delete()
    .eq('id', id);

  return { error };
}


/* ══════════════════════════════════════════════
   GLOBAL SITE SETTINGS
   ══════════════════════════════════════════════ */

async function getSiteSettings() {
  const sb = getSupabaseClient();
  let defaultSettings = {
    instagram: { enabled: true, url: 'https://www.instagram.com/ssnindiaelite/' },
    facebook: { enabled: true, url: 'https://facebook.com/ssnelite' },
    linkedin: { enabled: true, url: 'https://linkedin.com/company/ssnelite' }
  };

  try {
    const cached = localStorage.getItem('ssn_social_settings');
    if (cached) {
      defaultSettings = { ...defaultSettings, ...JSON.parse(cached) };
    }
  } catch (e) {}

  if (!sb) return { data: defaultSettings, error: null };

  try {
    const { data, error } = await sb
      .from('site_settings')
      .select('*')
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      let formattedSettings = defaultSettings;
      if ('instagram_url' in data || 'instagram_enabled' in data) {
        formattedSettings = {
          instagram: {
            enabled: data.instagram_enabled !== false,
            url: data.instagram_url || ''
          },
          facebook: {
            enabled: data.facebook_enabled !== false,
            url: data.facebook_url || ''
          },
          linkedin: {
            enabled: data.linkedin_enabled !== false,
            url: data.linkedin_url || ''
          }
        };
      } else if (data.value) {
        formattedSettings = data.value;
      }

      try {
        localStorage.setItem('ssn_social_settings', JSON.stringify(formattedSettings));
      } catch (e) {}
      return { data: formattedSettings, error: null };
    }
  } catch (err) {
    console.warn('[SSN Supabase] Error fetching site settings, using fallback:', err);
  }

  return { data: defaultSettings, error: null };
}

async function saveSiteSettings(settings) {
  // Always persist immediately to local storage so footer and admin work instantly
  try {
    localStorage.setItem('ssn_social_settings', JSON.stringify(settings));
  } catch (e) {}

  const sb = getSupabaseClient();
  if (!sb) return { data: settings, error: null };

  try {
    const payload = {
      instagram_url: settings.instagram?.url || '',
      instagram_enabled: settings.instagram?.enabled !== false,
      facebook_url: settings.facebook?.url || '',
      facebook_enabled: settings.facebook?.enabled !== false,
      linkedin_url: settings.linkedin?.url || '',
      linkedin_enabled: settings.linkedin?.enabled !== false,
      updated_at: new Date().toISOString()
    };

    // Try fetching existing row
    const { data: existing, error: selectErr } = await sb
      .from('site_settings')
      .select('id')
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();

    let result;
    if (existing && existing.id) {
      result = await sb
        .from('site_settings')
        .update(payload)
        .eq('id', existing.id)
        .select();
    } else {
      result = await sb
        .from('site_settings')
        .insert([payload])
        .select();
    }

    // If PostgREST schema cache has not yet refreshed or table is pending creation
    if (result && result.error) {
      if (result.error.code === 'PGRST205' || (result.error.message && result.error.message.includes('schema cache'))) {
        console.warn('[SSN Supabase] site_settings table not yet cached in Supabase PostgREST. Saved to local storage fallback.');
        return { data: settings, error: null, cached: true };
      }
    }

    return result;
  } catch (err) {
    console.warn('[SSN Supabase] Error saving site settings:', err);
    return { data: settings, error: null, cached: true };
  }
}

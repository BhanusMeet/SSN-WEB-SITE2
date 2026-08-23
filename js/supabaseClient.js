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

  const { data, error } = await sb
    .from('user_submissions')
    .insert([{
      full_name: (formData.full_name || '').trim(),
      email: (formData.email || '').trim(),
      phone: (formData.phone || '').trim(),
      address: (formData.address || '').trim(),
      message: (formData.message || '').trim() || null
    }])
    .select();

  return { data, error };
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
  const fileType = (file.type || '').toLowerCase();
  const fileNameLower = (file.name || '').toLowerCase();

  // Max 25 MB file limit
  if (file.size > 25 * 1024 * 1024) {
    return { error: { message: 'File is too large. Maximum allowed size is 25 MB.' } };
  }

  // Check MIME whitelist
  if (fileType && !ALLOWED_MIME_TYPES.includes(fileType)) {
    return { error: { message: `File type "${fileType}" is not permitted. Allowed types: JPEG, PNG, WebP, GIF, PDF.` } };
  }

  // Block dangerous extensions explicitly
  const DANGEROUS_EXTS = ['.svg', '.html', '.htm', '.js', '.jsx', '.ts', '.tsx', '.exe', '.bat', '.cmd', '.php', '.sh', '.py', '.rb', '.vbs'];
  for (const ext of DANGEROUS_EXTS) {
    if (fileNameLower.endsWith(ext)) {
      return { error: { message: `Files with extension "${ext}" are blocked for security reasons.` } };
    }
  }

  // Safe file naming
  const rawBaseName = file.name.replace(/\.[^/.]+$/, "");
  const cleanBaseName = rawBaseName.replace(/[^a-zA-Z0-9-_]/g, '-').substring(0, 40) || 'upload';
  const fileExt = (file.name.split('.').pop() || 'dat').toLowerCase();
  const filePath = `${folder}/${cleanBaseName}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}.${fileExt}`;

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

async function getProducts() {
  const sb = getSupabaseClient();
  if (!sb) return { data: [], error: { message: 'Supabase client not initialized.' } };

  try {
    const { data, error } = await sb
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (data && Array.isArray(data)) {
      data.forEach(p => {
        // Check for embedded structured data trailer in description or full_description
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
            // Clean up visual text
            if (p.full_description) p.full_description = p.full_description.replace(/<!--SSN_STRUCTURED_DATA:.*?-->/s, '').trim();
            if (p.description) p.description = p.description.replace(/<!--SSN_STRUCTURED_DATA:.*?-->/s, '').trim();
          } catch (e) {}
        }
      });
    }

    return { data: data || [], error };
  } catch (err) {
    console.error('[SSN Supabase] getProducts exception:', err);
    return { data: [], error: { message: err.message } };
  }
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
    instagram: { enabled: true, url: 'https://instagram.com/ssnelite' },
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
      .eq('key', 'social_media')
      .maybeSingle();

    if (!error && data && data.value) {
      try {
        localStorage.setItem('ssn_social_settings', JSON.stringify(data.value));
      } catch (e) {}
      return { data: data.value, error: null };
    }
  } catch (err) {
    console.warn('[SSN Supabase] Error fetching site settings, using fallback:', err);
  }

  return { data: defaultSettings, error: null };
}

async function saveSiteSettings(settings) {
  const sb = getSupabaseClient();
  try {
    localStorage.setItem('ssn_social_settings', JSON.stringify(settings));
  } catch (e) {}

  if (!sb) return { data: settings, error: null };

  try {
    const payload = {
      key: 'social_media',
      value: settings,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await sb
      .from('site_settings')
      .upsert(payload, { onConflict: 'key' })
      .select();

    return { data, error };
  } catch (err) {
    console.warn('[SSN Supabase] Error saving site settings:', err);
    return { data: settings, error: null };
  }
}

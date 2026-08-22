/* ============================================
   SSN ELITE — Supabase Client & Data Layer
   Unified helper for all database operations.
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
      return { error: { message: 'Supabase library failed to load (CDN blocked?).' } };
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

  const { data: { session } } = await sb.auth.getSession();
  return session;
}


/* ══════════════════════════════════════════════
   USER SUBMISSIONS
   ══════════════════════════════════════════════ */

async function saveUserSubmission(formData) {
  const sb = getSupabaseClient();
  if (!sb) return { error: { message: 'Database not available.' } };

  const { data, error } = await sb
    .from('user_submissions')
    .insert([{
      full_name: formData.full_name,
      email: formData.email,
      phone: formData.phone,
      address: formData.address,
      message: formData.message || null
    }])
    .select();

  return { data, error };
}

async function getUserSubmissions() {
  const sb = getSupabaseClient();
  if (!sb) return [];

  const { data, error } = await sb
    .from('user_submissions')
    .select('*')
    .order('created_at', { ascending: false });

  return { data, error };
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
   STORAGE
   ══════════════════════════════════════════════ */
async function uploadFileToStorage(folder, file) {
  const sb = getSupabaseClient();
  if (!sb) return { error: { message: 'Database not available.' } };

  const baseName = file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9-_]/g, '-');
  const fileExt = file.name.split('.').pop();
  const fileName = `${folder}/${baseName}-${Date.now()}.${fileExt}`;
  
  const { data, error } = await sb.storage
    .from('ssn-uploads')
    .upload(fileName, file, { cacheControl: '3600', upsert: false });

  if (error) return { error };
  
  const { data: urlData } = sb.storage.from('ssn-uploads').getPublicUrl(fileName);
  return { publicUrl: urlData.publicUrl, error: null };
}

/* ══════════════════════════════════════════════
   PRODUCTS
   ══════════════════════════════════════════════ */

async function getProducts() {
  const sb = getSupabaseClient();
  if (!sb) return [];

  const { data, error } = await sb
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  return { data, error };
}

async function saveProduct(product) {
  const sb = getSupabaseClient();
  if (!sb) return { error: { message: 'Database not available.' } };

  let productId = product.id;
  
  const productData = {
    name: product.name,
    category: product.category,
    price: product.price || product.selling_price || '',
    mrp: product.mrp || '',
    selling_price: product.selling_price || product.price || '',
    discount: product.discount || '',
    image_url: product.image_url,
    short_description: product.short_description,
    full_description: product.full_description,
    ingredients: product.ingredients,
    benefits: product.benefits,
    usage_instruction: product.usage_instruction,
    faq: product.faq || [],
    serving_size: product.serving_size,
    status: product.status || 'Active',
    seo_title: product.seo_title || '',
    seo_description: product.seo_description || '',
    slug: product.slug || null
  };

  if (productId) {
    const { error } = await sb.from('products').update(productData).eq('id', productId);
    if (error) return { error };
  } else {
    const { data, error } = await sb.from('products').insert([productData]).select();
    if (error) return { error };
    productId = data[0].id;
  }

  // Handle variants only if the table exists (commented out to prevent errors)
  /*
  if (product.variants && Array.isArray(product.variants)) {
    await sb.from('product_variants').delete().eq('product_id', productId);
    if (product.variants.length > 0) {
      const variantsToInsert = product.variants.map(v => ({
        product_id: productId,
        variant_name: v.variant_name,
        variant_image: v.variant_image || '',
        price_override: v.price_override || ''
      }));
      await sb.from('product_variants').insert(variantsToInsert);
    }
  }
  */

  // Refetch the updated product
  return await sb.from('products').select('*').eq('id', productId).single();
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
   BLOGS
   ══════════════════════════════════════════════ */

async function getBlogs() {
  const sb = getSupabaseClient();
  if (!sb) return [];

  const { data, error } = await sb
    .from('blogs')
    .select('*')
    .order('publish_date', { ascending: false });

  return { data, error };
}

async function saveBlog(blog) {
  const sb = getSupabaseClient();
  if (!sb) return { error: { message: 'Database not available.' } };

  const blogData = {
    title: blog.title,
    slug: blog.slug,
    featured_image: blog.featured_image,
    author: blog.author,
    content: blog.content,
    excerpt: blog.excerpt,
    category: blog.category,
    read_time: blog.read_time,
    gradient: blog.gradient,
    seo_title: blog.seo_title,
    seo_description: blog.seo_description,
    publish_date: blog.publish_date,
    status: blog.status || 'Published'
  };

  if (blog.id) {
    const { data, error } = await sb
      .from('blogs')
      .update(blogData)
      .eq('id', blog.id)
      .select();
    return { data, error };
  } else {
    const { data, error } = await sb
      .from('blogs')
      .insert([blogData])
      .select();
    return { data, error };
  }
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
   LAB REPORTS
   ══════════════════════════════════════════════ */

async function getLabReports() {
  const sb = getSupabaseClient();
  if (!sb) return [];

  const { data, error } = await sb
    .from('lab_reports')
    .select('*')
    .order('created_at', { ascending: false });

  return { data, error };
}

async function saveLabReport(report) {
  const sb = getSupabaseClient();
  if (!sb) return { error: { message: 'Database not available.' } };

  if (report.id) {
    const { data, error } = await sb
      .from('lab_reports')
      .update({
        batch_number: report.batch_number,
        product_name: report.product_name,
        lab_name: report.lab_name,
        test_date: report.test_date,
        parameters: report.parameters,
        report_images: report.report_images || [],
        status: report.status || 'VERIFIED'
      })
      .eq('id', report.id)
      .select();
    return { data, error };
  } else {
    const { data, error } = await sb
      .from('lab_reports')
      .insert([{
        batch_number: report.batch_number,
        product_name: report.product_name,
        lab_name: report.lab_name,
        test_date: report.test_date,
        parameters: report.parameters,
        report_images: report.report_images || [],
        status: report.status || 'VERIFIED'
      }])
      .select();
    return { data, error };
  }
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
   SUPABASE STORAGE — Image Upload
   ══════════════════════════════════════════════ */

/**
 * Upload a file to Supabase Storage and return the public URL.
 * @param {string} bucket - Storage bucket name ('product-images', 'blog-images', 'lab-report-images')
 * @param {File} file - The File object to upload
 * @returns {Promise<{url: string|null, error: object|null}>}
 */
async function uploadImage(bucket, file) {
  const sb = getSupabaseClient();
  if (!sb) return { url: null, error: { message: 'Database not available.' } };

  const fileExt = file.name.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
  const filePath = `${fileName}`;

  const { data, error } = await sb.storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error('[SSN] Image upload error:', error);
    return { url: null, error };
  }

  const { data: urlData } = sb.storage.from(bucket).getPublicUrl(filePath);
  return { url: urlData.publicUrl, error: null };
}

/* ============================================
   SSN ELITE — Admin Dashboard Logic
   Shopify-style CMS management for Products, Blogs, Lab Reports & Submissions
   ============================================ */

let currentSession = null;
let quillProduct = null;
let quillBlog = null;

let allProducts = [];
let allBlogs = [];
let allLabReports = [];
let allSubmissions = [];

// Escaper for HTML
function esc(str) {
  if (str === null || str === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

// ── Auth Guard ──
async function checkAuth() {
  try {
    currentSession = typeof checkAdminAuth === 'function' ? await checkAdminAuth() : null;
  } catch (e) {
    console.warn('[SSN Admin] Session check warning:', e);
    currentSession = null;
  }

  const loginScreen = document.getElementById('admin-login-screen');
  const sidebar = document.getElementById('admin-sidebar');
  const main = document.getElementById('admin-main');

  if (currentSession) {
    if (loginScreen) loginScreen.style.display = 'none';
    if (sidebar) sidebar.style.display = 'flex';
    if (main) main.style.display = 'block';
    
    initQuillEditors();
    loadDashboardData();
  } else {
    if (loginScreen) loginScreen.style.display = 'flex';
    if (sidebar) sidebar.style.display = 'none';
    if (main) main.style.display = 'none';
  }
}

async function handleAdminLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-password').value;
  const btn = document.getElementById('login-btn');
  const err = document.getElementById('login-error');
  
  btn.textContent = 'Logging in...';
  btn.disabled = true;
  err.style.display = 'none';

  try {
    const { data, error } = typeof adminLogin === 'function' 
      ? await adminLogin(email, pass)
      : { error: { message: 'Authentication service not loaded.' } };

    if (error) {
      err.textContent = error.message || 'Invalid credentials.';
      err.style.display = 'block';
      btn.textContent = 'Log in';
      btn.disabled = false;
    } else {
      window.location.reload();
    }
  } catch (ex) {
    err.textContent = ex.message || 'Login error occurred.';
    err.style.display = 'block';
    btn.textContent = 'Log in';
    btn.disabled = false;
  }
}

async function handleAdminLogout() {
  if (typeof adminLogout === 'function') {
    await adminLogout();
  }
  window.location.reload();
}

document.addEventListener('DOMContentLoaded', checkAuth);

// ── Tabs ──
function switchTab(tabId, btnElement) {
  document.querySelectorAll('.admin-tab-panel').forEach(el => el.classList.remove('active'));
  const target = document.getElementById(`tab-${tabId}`);
  if (target) target.classList.add('active');
  
  if (btnElement) {
    document.querySelectorAll('.admin-nav-item').forEach(el => el.classList.remove('active'));
    btnElement.classList.add('active');
  }
}

let blogEditorMode = 'visual';

// ── Editors Initialization (Quill with Full Rich Text Controls & Dual Sync) ──
function initQuillEditors() {
  if (typeof Quill === 'undefined') {
    console.warn('[SSN Admin] Quill library not found. Falling back to HTML Code Editor.');
    setBlogEditorMode('html');
    return;
  }

  const quillToolbarOptions = [
    [{ 'header': [1, 2, 3, 4, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['blockquote', 'code-block'],
    ['link', 'image'],
    [{ 'color': [] }, { 'background': [] }],
    ['clean']
  ];

  const prodElem = document.getElementById('prod-desc-editor');
  if (prodElem && !quillProduct) {
    try {
      quillProduct = new Quill('#prod-desc-editor', {
        theme: 'snow',
        placeholder: 'Write comprehensive product description, clinical highlights, dosage, etc.',
        modules: { toolbar: quillToolbarOptions }
      });
    } catch (e) {
      console.warn('[SSN Admin] Failed to initialize Quill for product:', e);
    }
  }
  
  const blogElem = document.getElementById('blog-content-editor');
  if (blogElem && !quillBlog) {
    try {
      quillBlog = new Quill('#blog-content-editor', {
        theme: 'snow',
        placeholder: 'Write your full scientific article, subheadings, key takeaways, and references here...',
        modules: { toolbar: quillToolbarOptions }
      });

      // Synchronize visual changes to HTML textarea in real-time
      quillBlog.on('text-change', () => {
        const htmlTextarea = document.getElementById('blog-content-html');
        if (htmlTextarea && blogEditorMode === 'visual') {
          htmlTextarea.value = quillBlog.root.innerHTML;
        }
      });
    } catch (e) {
      console.warn('[SSN Admin] Failed to initialize Quill for blog:', e);
    }
  }

  if (quillBlog) quillBlog.enable(true);
  if (quillProduct) quillProduct.enable(true);
}

// ── Data Loading & Synchronization ──
async function loadDashboardData() {
  try {
    const [pRes, bRes, lRes, sRes] = await Promise.all([
      typeof getProducts === 'function' ? getProducts() : { data: [] },
      typeof getBlogs === 'function' ? getBlogs() : { data: [] },
      typeof getLabReports === 'function' ? getLabReports() : { data: [] },
      typeof getUserSubmissions === 'function' ? getUserSubmissions() : { data: [] }
    ]);
    
    allProducts = (pRes && pRes.data) || (Array.isArray(pRes) ? pRes : []);
    allBlogs = (bRes && bRes.data) || (Array.isArray(bRes) ? bRes : []);
    allLabReports = (lRes && lRes.data) || (Array.isArray(lRes) ? lRes : []);
    allSubmissions = (sRes && sRes.data) || (Array.isArray(sRes) ? sRes : []);
    
    renderProductsTable();
    renderBlogsTable();
    renderLabReportsTable();
    renderSubmissionsTable(allSubmissions);
  } catch (err) {
    console.error('[SSN Admin] Dashboard sync error:', err);
  }
}

// ══════════════════════════════════════════════
// 1. PRODUCTS MANAGEMENT
// ══════════════════════════════════════════════
function renderProductsTable() {
  const container = document.getElementById('products-table-container');
  if (!container) return;

  if (allProducts.length === 0) {
    container.innerHTML = '<p style="color:#637381; padding: 24px 0;">No products found in database. Click "Add product" to create one.</p>';
    return;
  }
  
  let html = `<div class="admin-table-wrap"><table class="admin-table">
    <thead><tr><th>Product</th><th>Status</th><th>Category</th><th>Price / MRP</th><th>Variants</th><th>Actions</th></tr></thead><tbody>`;
  
  allProducts.forEach(p => {
    const status = p.status || 'Active';
    const statusClass = status.toLowerCase() === 'active' ? 'active' : status.toLowerCase() === 'draft' ? 'draft' : 'archived';
    const priceDisplay = (p.selling_price || p.price || '') + (p.mrp ? ` <span style="color:#8c9196; font-size:12px; text-decoration:line-through;">${p.mrp}</span>` : '');
    const variantsCount = (p.product_variants && Array.isArray(p.product_variants)) ? p.product_variants.length : 0;
    
    html += `<tr>
      <td>
        <div style="display:flex; align-items:center; gap:12px;">
          ${p.image_url ? `<img src="${p.image_url}" class="tbl-img">` : `<div class="tbl-img" style="background:#f4f6f8; display:flex; align-items:center; justify-content:center; color:#8c9196; font-size:10px;">No img</div>`}
          <div>
            <span style="font-weight:600; display:block;">${esc(p.name || 'Unnamed Product')}</span>
            <span style="font-size:12px; color:#637381;">${esc(p.slug || '')}</span>
          </div>
        </div>
      </td>
      <td><span class="status-badge ${statusClass}">${esc(status)}</span></td>
      <td>${esc(p.category || '-')}</td>
      <td>${priceDisplay || '-'}</td>
      <td>${variantsCount}</td>
      <td>
        <div style="display:flex; gap:8px;">
          <button class="admin-btn admin-btn-outline admin-btn-sm" onclick="openProductEditor('${p.id}')">Edit</button>
          <button class="admin-btn admin-btn-danger admin-btn-sm" onclick="handleDeleteProduct('${p.id}', '${esc(p.name)}')">Delete</button>
        </div>
      </td>
    </tr>`;
  });
  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

function openProductEditor(id = null) {
  switchTab('product-editor');
  initQuillEditors();
  document.getElementById('variant-list').innerHTML = '';
  
  if (id) {
    const p = allProducts.find(x => x.id === id);
    if (!p) return;
    document.getElementById('prod-id').value = p.id || '';
    document.getElementById('prod-name').value = p.name || '';
    document.getElementById('prod-status').value = p.status || 'Active';
    document.getElementById('prod-category').value = p.category || 'Lean Muscle';
    document.getElementById('prod-selling').value = p.selling_price || p.price || '';
    document.getElementById('prod-mrp').value = p.mrp || '';
    
    const discElem = document.getElementById('prod-discount');
    if (discElem) discElem.value = p.discount || '';
    
    const servElem = document.getElementById('prod-serving');
    if (servElem) servElem.value = p.serving_size || '';
    
    const ingElem = document.getElementById('prod-ingredients');
    if (ingElem) ingElem.value = p.ingredients || '';
    
    const benElem = document.getElementById('prod-benefits');
    if (benElem) benElem.value = p.benefits || '';
    
    const useElem = document.getElementById('prod-usage');
    if (useElem) useElem.value = p.usage_instruction || '';

    document.getElementById('prod-seo-title').value = p.seo_title || '';
    document.getElementById('prod-seo-desc').value = p.seo_description || '';
    document.getElementById('prod-slug').value = p.slug || '';
    document.getElementById('prod-image-url').value = p.image_url || '';
    if (quillProduct) quillProduct.root.innerHTML = p.full_description || p.short_description || '';
    
    document.getElementById('prod-img-preview').innerHTML = p.image_url ? `<img src="${p.image_url}">` : '';
    
    if (p.product_variants && Array.isArray(p.product_variants)) {
      p.product_variants.forEach(v => addVariantField(v));
    }
    
    document.getElementById('product-editor-title').textContent = `Edit — ${p.name}`;
  } else {
    document.getElementById('prod-id').value = '';
    document.getElementById('prod-name').value = '';
    document.getElementById('prod-status').value = 'Active';
    document.getElementById('prod-category').value = 'Lean Muscle';
    document.getElementById('prod-selling').value = '';
    document.getElementById('prod-mrp').value = '';
    
    const discElem = document.getElementById('prod-discount');
    if (discElem) discElem.value = '';
    
    const servElem = document.getElementById('prod-serving');
    if (servElem) servElem.value = '';
    
    const ingElem = document.getElementById('prod-ingredients');
    if (ingElem) ingElem.value = '';
    
    const benElem = document.getElementById('prod-benefits');
    if (benElem) benElem.value = '';
    
    const useElem = document.getElementById('prod-usage');
    if (useElem) useElem.value = '';

    document.getElementById('prod-seo-title').value = '';
    document.getElementById('prod-seo-desc').value = '';
    document.getElementById('prod-slug').value = '';
    document.getElementById('prod-image-url').value = '';
    if (quillProduct) quillProduct.root.innerHTML = '';
    document.getElementById('prod-img-preview').innerHTML = '';
    document.getElementById('product-editor-title').textContent = 'Add product';
  }
  switchTab('product-editor');
}

async function handleProductImageUpload(input) {
  if (!input.files || !input.files[0]) return;
  const preview = document.getElementById('prod-img-preview');
  preview.innerHTML = '<p style="color:#637381; font-size:12px;">Uploading...</p>';
  
  const { publicUrl, error } = await uploadFileToStorage('products', input.files[0]);
  if (error) { 
    preview.innerHTML = `<p style="color:#d82c0d; font-size:12px;">Upload failed: ${error.message}</p>`; 
    return; 
  }
  
  document.getElementById('prod-image-url').value = publicUrl;
  preview.innerHTML = `<img src="${publicUrl}">`;
}

function addVariantField(v = null) {
  const id = 'v_' + Math.random().toString(36).substr(2, 9);
  const vName = v ? esc(v.variant_name) : '';
  const vPrice = v ? esc(v.price_override) : '';
  const vImg = v ? v.variant_image : '';
  
  const html = `
    <div class="variant-item" id="${id}">
      <div class="admin-upload-zone" style="padding:8px; width:50px; height:50px; display:flex; align-items:center; justify-content:center;" onclick="document.getElementById('file_${id}').click()">
        ${vImg ? `<img src="${vImg}" style="width:36px;height:36px;object-fit:cover;border-radius:4px;" id="img_${id}">` : `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`}
      </div>
      <input type="file" id="file_${id}" accept="image/*" style="display:none;" onchange="handleVariantImgUpload(this, '${id}')">
      <input type="hidden" class="v-img-val" id="val_${id}" value="${vImg}">
      
      <div style="flex:1; display:flex; gap:12px;">
        <input type="text" class="admin-form-input v-name" placeholder="Flavour (e.g. Chocolate Brownie)" value="${vName}">
        <input type="text" class="admin-form-input v-price" placeholder="Price Override (Optional)" value="${vPrice}">
      </div>
      <button class="admin-btn admin-btn-outline admin-btn-sm" type="button" onclick="document.getElementById('${id}').remove()">Trash</button>
    </div>
  `;
  document.getElementById('variant-list').insertAdjacentHTML('beforeend', html);
}

async function handleVariantImgUpload(input, id) {
  if (!input.files || !input.files[0]) return;
  const { publicUrl, error } = await uploadFileToStorage('products/variants', input.files[0]);
  if (!error && publicUrl) {
    document.getElementById(`val_${id}`).value = publicUrl;
    const zone = input.previousElementSibling;
    zone.innerHTML = `<img src="${publicUrl}" style="width:36px;height:36px;object-fit:cover;border-radius:4px;">`;
  }
}

async function saveProductData() {
  const btn = document.getElementById('save-product-btn');
  const prodName = document.getElementById('prod-name').value.trim();
  if (!prodName) {
    alert('Please enter a product title.');
    return;
  }

  btn.textContent = 'Saving...';
  btn.disabled = true;
  
  const variants = [];
  document.querySelectorAll('.variant-item').forEach(el => {
    const name = el.querySelector('.v-name').value.trim();
    if (name) {
      variants.push({
        variant_name: name,
        price_override: el.querySelector('.v-price').value.trim(),
        variant_image: el.querySelector('.v-img-val').value.trim()
      });
    }
  });

  const fullDesc = quillProduct ? quillProduct.root.innerHTML : '';
  const discElem = document.getElementById('prod-discount');
  const servElem = document.getElementById('prod-serving');
  const ingElem = document.getElementById('prod-ingredients');
  const benElem = document.getElementById('prod-benefits');
  const useElem = document.getElementById('prod-usage');

  const product = {
    id: document.getElementById('prod-id').value || undefined,
    name: prodName,
    status: document.getElementById('prod-status').value,
    category: document.getElementById('prod-category').value,
    selling_price: document.getElementById('prod-selling').value.trim(),
    mrp: document.getElementById('prod-mrp').value.trim(),
    discount: discElem ? discElem.value.trim() : '',
    serving_size: servElem ? servElem.value.trim() : '',
    ingredients: ingElem ? ingElem.value.trim() : '',
    benefits: benElem ? benElem.value.trim() : '',
    usage_instruction: useElem ? useElem.value.trim() : '',
    seo_title: document.getElementById('prod-seo-title').value.trim(),
    seo_description: document.getElementById('prod-seo-desc').value.trim(),
    slug: document.getElementById('prod-slug').value.trim() || prodName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    image_url: document.getElementById('prod-image-url').value.trim(),
    full_description: fullDesc,
    short_description: fullDesc.replace(/<[^>]*>?/gm, '').substring(0, 160),
    variants: variants
  };

  try {
    const res = await saveProduct(product);
    if (res && res.error) { 
      alert(`Error saving product: ${res.error.message}`); 
    } else {
      await loadDashboardData();
      switchTab('products');
    }
  } catch (err) {
    alert(`Save error: ${err.message}`);
  } finally {
    btn.textContent = 'Save';
    btn.disabled = false;
  }
}

async function handleDeleteProduct(id, name) {
  if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
    return;
  }

  try {
    const { error } = await deleteProduct(id);
    if (error) {
      alert(`Error deleting product: ${error.message}`);
    } else {
      await loadDashboardData();
    }
  } catch (err) {
    alert(`Delete error: ${err.message}`);
  }
}

// ══════════════════════════════════════════════
// 2. BLOGS MANAGEMENT
// ══════════════════════════════════════════════
function renderBlogsTable() {
  const container = document.getElementById('blogs-table-container');
  if (!container) return;

  if (allBlogs.length === 0) {
    container.innerHTML = '<p style="color:#637381; padding: 24px 0;">No blog posts found in database. Click "Add blog post" to publish your first article.</p>';
    return;
  }
  
  let html = `<div class="admin-table-wrap"><table class="admin-table">
    <thead><tr><th>Blog Title</th><th>Status</th><th>Category</th><th>Date</th><th>Actions</th></tr></thead><tbody>`;
  
  allBlogs.forEach(b => {
    const isPublished = (b.status || 'Published').toLowerCase() === 'published';
    const statusBadgeClass = isPublished ? 'published' : 'draft';
    
    html += `<tr>
      <td>
        <span style="font-weight:600; display:block;">${esc(b.title)}</span>
        <span style="font-size:12px; color:#637381;">${esc(b.slug || '')}</span>
      </td>
      <td><span class="status-badge ${statusBadgeClass}">${esc(b.status || 'Published')}</span></td>
      <td>${esc(b.category || 'Nutrition')}</td>
      <td>${esc(b.publish_date || '-')}</td>
      <td>
        <div style="display:flex; gap:8px;">
          <button class="admin-btn admin-btn-outline admin-btn-sm" onclick="openBlogEditor('${b.id}')">Edit</button>
          <button class="admin-btn admin-btn-outline admin-btn-sm" onclick="handleToggleBlogStatus('${b.id}')">${isPublished ? 'Draft' : 'Publish'}</button>
          <button class="admin-btn admin-btn-danger admin-btn-sm" onclick="handleDeleteBlog('${b.id}', '${esc(b.title)}')">Delete</button>
        </div>
      </td>
    </tr>`;
  });
  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

function openBlogEditor(id = null) {
  switchTab('blog-editor');
  initQuillEditors();

  if (id) {
    const b = allBlogs.find(x => x.id === id);
    if (!b) return;
    document.getElementById('blog-id').value = b.id || '';
    document.getElementById('blog-title').value = b.title || '';
    document.getElementById('blog-status').value = b.status || 'Published';
    document.getElementById('blog-author').value = b.author || 'SSN Elite Science Team';
    document.getElementById('blog-category').value = b.category || 'Nutrition Science';
    document.getElementById('blog-seo-title').value = b.seo_title || '';
    document.getElementById('blog-seo-desc').value = b.seo_description || '';
    document.getElementById('blog-slug').value = b.slug || '';
    document.getElementById('blog-featured-image').value = b.featured_image || '';
    setBlogContentHtml(b.content || '');
    document.getElementById('blog-img-preview').innerHTML = b.featured_image ? `<img src="${b.featured_image}">` : '';
    document.getElementById('blog-editor-title').textContent = `Edit — ${b.title}`;
  } else {
    document.getElementById('blog-id').value = '';
    document.getElementById('blog-title').value = '';
    document.getElementById('blog-status').value = 'Published';
    document.getElementById('blog-author').value = 'SSN Elite Science Team';
    document.getElementById('blog-category').value = 'Nutrition Science';
    document.getElementById('blog-seo-title').value = '';
    document.getElementById('blog-seo-desc').value = '';
    document.getElementById('blog-slug').value = '';
    document.getElementById('blog-featured-image').value = '';
    setBlogContentHtml('');
    document.getElementById('blog-img-preview').innerHTML = '';
    document.getElementById('blog-editor-title').textContent = 'Add blog post';
  }

  // Restore active mode and ensure editor has focus
  setBlogEditorMode(blogEditorMode || 'visual');
}

function setBlogEditorMode(mode) {
  blogEditorMode = mode;
  const visualWrap = document.getElementById('blog-visual-wrap');
  const htmlWrap = document.getElementById('blog-html-wrap');
  const btnVisual = document.getElementById('btn-mode-visual');
  const btnHtml = document.getElementById('btn-mode-html');
  const htmlTextarea = document.getElementById('blog-content-html');

  if (mode === 'visual') {
    // If Quill is available, sync content from textarea into Quill
    if (quillBlog && htmlTextarea) {
      quillBlog.root.innerHTML = htmlTextarea.value || '';
      quillBlog.enable(true);
    }
    if (visualWrap) visualWrap.style.display = 'block';
    if (htmlWrap) htmlWrap.style.display = 'none';
    if (btnVisual) btnVisual.classList.add('active');
    if (btnHtml) btnHtml.classList.remove('active');
    if (quillBlog) {
      quillBlog.focus();
    }
  } else {
    // Mode is 'html': sync content from Quill into textarea
    if (quillBlog && htmlTextarea) {
      const qHtml = quillBlog.root.innerHTML;
      if (qHtml === '<p><br></p>') {
        htmlTextarea.value = '';
      } else if (qHtml) {
        htmlTextarea.value = qHtml;
      }
    }
    if (visualWrap) visualWrap.style.display = 'none';
    if (htmlWrap) htmlWrap.style.display = 'block';
    if (btnVisual) btnVisual.classList.remove('active');
    if (btnHtml) btnHtml.classList.add('active');
    if (htmlTextarea) {
      htmlTextarea.focus();
    }
  }
}

function handleHtmlTextareaInput(textarea) {
  if (quillBlog && blogEditorMode === 'html') {
    quillBlog.root.innerHTML = textarea.value;
  }
}

function getBlogContentHtml() {
  const htmlTextarea = document.getElementById('blog-content-html');
  if (blogEditorMode === 'html' && htmlTextarea) {
    return htmlTextarea.value.trim();
  }
  if (quillBlog) {
    const raw = quillBlog.root.innerHTML;
    if (raw === '<p><br></p>') return '';
    return raw;
  }
  if (htmlTextarea) {
    return htmlTextarea.value.trim();
  }
  return '';
}

function setBlogContentHtml(html) {
  const htmlTextarea = document.getElementById('blog-content-html');
  if (htmlTextarea) {
    htmlTextarea.value = html || '';
  }
  if (quillBlog) {
    quillBlog.root.innerHTML = html || '';
  }
}

function insertHtmlTag(tag) {
  const textarea = document.getElementById('blog-content-html');
  if (!textarea) return;

  const start = textarea.selectionStart || 0;
  const end = textarea.selectionEnd || 0;
  const selectedText = textarea.value.substring(start, end);
  let replacement = '';

  switch (tag) {
    case 'h2':
      replacement = `<h2>${selectedText || 'Heading 2'}</h2>`;
      break;
    case 'h3':
      replacement = `<h3>${selectedText || 'Heading 3'}</h3>`;
      break;
    case 'p':
      replacement = `<p>${selectedText || 'Paragraph text here...'}</p>`;
      break;
    case 'strong':
      replacement = `<strong>${selectedText || 'bold text'}</strong>`;
      break;
    case 'em':
      replacement = `<em>${selectedText || 'italic text'}</em>`;
      break;
    case 'ul':
      replacement = `<ul>\n  <li>${selectedText || 'List item 1'}</li>\n  <li>List item 2</li>\n</ul>`;
      break;
    case 'blockquote':
      replacement = `<blockquote>${selectedText || 'Quote text here...'}</blockquote>`;
      break;
    case 'a':
      replacement = `<a href="https://example.com" target="_blank">${selectedText || 'Link text'}</a>`;
      break;
    case 'img':
      replacement = `<img src="https://example.com/image.webp" alt="${selectedText || 'Image description'}" style="max-width:100%; border-radius:8px; margin:16px 0;">`;
      break;
    default:
      replacement = `<${tag}>${selectedText}</${tag}>`;
  }

  textarea.setRangeText(replacement, start, end, 'select');
  handleHtmlTextareaInput(textarea);
  textarea.focus();
}

function formatHtmlSource() {
  const textarea = document.getElementById('blog-content-html');
  if (!textarea || !textarea.value) return;

  let html = textarea.value;
  html = html
    .replace(/>\s*</g, '>\n<')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');

  textarea.value = html;
  handleHtmlTextareaInput(textarea);
}

async function handleBlogImageUpload(input) {
  if (!input.files || !input.files[0]) return;
  const preview = document.getElementById('blog-img-preview');
  preview.innerHTML = '<p style="color:#637381; font-size:12px;">Uploading...</p>';
  
  const { publicUrl, error } = await uploadFileToStorage('blogs', input.files[0]);
  if (error) { 
    preview.innerHTML = `<p style="color:#d82c0d; font-size:12px;">Upload failed: ${error.message}</p>`; 
    return; 
  }
  
  document.getElementById('blog-featured-image').value = publicUrl;
  preview.innerHTML = `<img src="${publicUrl}">`;
}

async function saveBlogData() {
  const btn = document.getElementById('save-blog-btn');
  const title = document.getElementById('blog-title').value.trim();
  if (!title) {
    alert('Please enter a blog title.');
    return;
  }

  btn.textContent = 'Saving...';
  btn.disabled = true;
  
  const contentHtml = getBlogContentHtml();
  const plainText = contentHtml.replace(/<[^>]*>?/gm, '').replace(/&[a-z]+;/g, ' ').trim();
  const excerpt = plainText.length > 160 ? plainText.substring(0, 160) + '...' : plainText;

  const blog = {
    id: document.getElementById('blog-id').value || undefined,
    title: title,
    slug: document.getElementById('blog-slug').value.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
    status: document.getElementById('blog-status').value,
    author: document.getElementById('blog-author').value.trim() || 'SSN Elite Science Team',
    category: document.getElementById('blog-category').value.trim() || 'Nutrition Science',
    seo_title: document.getElementById('blog-seo-title').value.trim() || title,
    seo_description: document.getElementById('blog-seo-desc').value.trim() || excerpt,
    featured_image: document.getElementById('blog-featured-image').value.trim(),
    content: contentHtml,
    excerpt: excerpt,
    publish_date: new Date().toISOString().split('T')[0]
  };

  try {
    const { error } = await saveBlog(blog);
    if (error) { 
      alert(`Error saving blog: ${error.message}`); 
    } else {
      await loadDashboardData();
      switchTab('blogs');
    }
  } catch (err) {
    alert(`Save error: ${err.message}`);
  } finally {
    btn.textContent = 'Save';
    btn.disabled = false;
  }
}

async function handleToggleBlogStatus(id) {
  const b = allBlogs.find(x => x.id === id);
  if (!b) return;
  const newStatus = (b.status || 'Published').toLowerCase() === 'published' ? 'Draft' : 'Published';
  
  try {
    const { error } = await saveBlog({ id: b.id, status: newStatus });
    if (error) alert(`Error updating status: ${error.message}`);
    else await loadDashboardData();
  } catch (e) {
    alert(`Update error: ${e.message}`);
  }
}

async function handleDeleteBlog(id, title) {
  if (!confirm(`Are you sure you want to delete "${title}"?`)) {
    return;
  }

  try {
    const { error } = await deleteBlog(id);
    if (error) {
      alert(`Error deleting blog: ${error.message}`);
    } else {
      await loadDashboardData();
    }
  } catch (err) {
    alert(`Delete error: ${err.message}`);
  }
}

// ══════════════════════════════════════════════
// 3. LAB REPORTS MANAGEMENT
// ══════════════════════════════════════════════
function renderLabReportsTable() {
  const container = document.getElementById('labreports-table-container');
  if (!container) return;

  populateLabProductDropdown();

  if (allLabReports.length === 0) {
    container.innerHTML = '<p style="color:#637381; padding: 24px 0;">No lab reports found in database. Click "Add lab report" to upload certificates.</p>';
    return;
  }
  
  let html = `<div class="admin-table-wrap"><table class="admin-table">
    <thead><tr><th>Batch No</th><th>Product</th><th>Lab Name</th><th>Test Date</th><th>Status</th><th>Actions</th></tr></thead><tbody>`;
  
  allLabReports.forEach(r => {
    html += `<tr>
      <td style="font-family:monospace; font-weight:600;">${esc(r.batch_number)}</td>
      <td>${esc(r.product_name)}</td>
      <td>${esc(r.lab_name)}</td>
      <td>${esc(r.test_date)}</td>
      <td><span class="status-badge active">${esc(r.status || 'VERIFIED')}</span></td>
      <td>
        <div style="display:flex; gap:8px;">
          <button class="admin-btn admin-btn-outline admin-btn-sm" onclick="openLabReportEditor('${r.id}')">Edit</button>
          <button class="admin-btn admin-btn-danger admin-btn-sm" onclick="handleDeleteLabReport('${r.id}', '${esc(r.batch_number)}')">Delete</button>
        </div>
      </td>
    </tr>`;
  });
  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

function populateLabProductDropdown() {
  const select = document.getElementById('lr-product');
  if (!select) return;
  
  const currentVal = select.value;
  select.innerHTML = '<option value="">Select a product...</option>';
  
  const defaultProducts = [
    'SSN Elite Performance Whey',
    'SSN Elite Anabolic Monster Mass',
    'SSN Elite Tri Creatine',
    'SSN Elite EAA + BCAA + Glutamine'
  ];
  
  const names = new Set(defaultProducts);
  allProducts.forEach(p => { if (p.name) names.add(p.name); });
  
  names.forEach(name => {
    const isSelected = name === currentVal ? 'selected' : '';
    select.innerHTML += `<option value="${esc(name)}" ${isSelected}>${esc(name)}</option>`;
  });
}

function openLabReportEditor(id = null) {
  populateLabProductDropdown();

  const preview = document.getElementById('lr-pdf-preview');
  const certInput = document.getElementById('lr-certificate-url');

  if (id) {
    const r = allLabReports.find(x => x.id === id);
    if (!r) return;
    document.getElementById('lr-id').value = r.id || '';
    document.getElementById('lr-product').value = r.product_name || '';
    document.getElementById('lr-batch').value = r.batch_number || '';
    document.getElementById('lr-lab').value = r.lab_name || '';
    document.getElementById('lr-date').value = r.test_date || '';
    
    const certUrl = r.certificate_url || (Array.isArray(r.report_images) && r.report_images.length > 0 ? r.report_images[0] : (typeof r.report_images === 'string' ? r.report_images : ''));
    if (certInput) certInput.value = certUrl || '';
    
    if (preview) {
      preview.innerHTML = certUrl 
        ? `<div style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 16px; background:#f4f6f8; border:1px solid #dfe3e8; border-radius:6px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:20px;">📄</span>
              <div>
                <a href="${certUrl}" target="_blank" style="color:#008060; font-weight:600; font-size:13px; text-decoration:none;">View Uploaded PDF Certificate</a>
                <div style="font-size:11px; color:#637381;">Saved in ssn-uploads/lab-reports/</div>
              </div>
            </div>
            <button type="button" class="admin-btn admin-btn-outline admin-btn-sm" onclick="document.getElementById('lr-pdf-upload').click()">Change PDF</button>
          </div>`
        : '';
    }
    
    document.getElementById('lab-editor-title').textContent = `Edit Lab Report — ${r.batch_number}`;
  } else {
    document.getElementById('lr-id').value = '';
    document.getElementById('lr-product').value = '';
    document.getElementById('lr-batch').value = '';
    document.getElementById('lr-lab').value = '';
    document.getElementById('lr-date').value = '';
    if (certInput) certInput.value = '';
    if (preview) preview.innerHTML = '';
    document.getElementById('lab-editor-title').textContent = 'Upload lab report';
  }
  switchTab('lab-editor');
}

async function handleLabReportPdfUpload(input) {
  if (!input.files || input.files.length === 0) return;
  const file = input.files[0];
  
  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
    alert('Please select a valid PDF file (.pdf only).');
    return;
  }

  const preview = document.getElementById('lr-pdf-preview');
  if (preview) {
    preview.innerHTML = '<p style="color:#637381; font-size:13px; padding:8px 0;">Uploading PDF certificate to ssn-uploads/lab-reports/ ...</p>';
  }
  
  const { publicUrl, error } = await uploadFileToStorage('lab-reports', file);
  if (error) {
    if (preview) preview.innerHTML = `<p style="color:#d82c0d; font-size:13px;">Upload failed: ${error.message}</p>`;
    alert(`Upload error: ${error.message}`);
    return;
  }
  
  const certInput = document.getElementById('lr-certificate-url');
  if (certInput) certInput.value = publicUrl;
  
  if (preview) {
    preview.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 16px; background:#e3f1df; border:1px solid #008060; border-radius:6px;">
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:20px;">✅</span>
          <div>
            <a href="${publicUrl}" target="_blank" style="color:#008060; font-weight:600; font-size:13px; text-decoration:none;">PDF Certificate Uploaded (${file.name})</a>
            <div style="font-size:11px; color:#008060;">Ready to save to database</div>
          </div>
        </div>
        <button type="button" class="admin-btn admin-btn-outline admin-btn-sm" onclick="document.getElementById('lr-pdf-upload').click()">Replace</button>
      </div>
    `;
  }
}

async function saveLabReportData() {
  const btn = document.getElementById('save-lr-btn');
  const batchNumber = document.getElementById('lr-batch').value.trim();
  const productName = document.getElementById('lr-product').value.trim();

  if (!batchNumber || !productName) {
    alert('Please enter both Product Name and Batch Number.');
    return;
  }

  btn.textContent = 'Saving...';
  btn.disabled = true;
  
  const certInput = document.getElementById('lr-certificate-url');
  const certUrl = certInput ? certInput.value.trim() : '';

  const report = {
    id: document.getElementById('lr-id').value || undefined,
    batch_number: batchNumber,
    product_name: productName,
    lab_name: document.getElementById('lr-lab').value.trim() || 'ISO/IEC 17025 Accredited Laboratory',
    test_date: document.getElementById('lr-date').value.trim() || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    certificate_url: certUrl,
    report_images: certUrl ? [certUrl] : [],
    parameters: [],
    status: 'VERIFIED'
  };

  try {
    const res = await saveLabReport(report);
    if (res && res.error) {
      alert(`Error saving lab report: ${res.error.message}`);
    } else {
      await loadDashboardData();
      switchTab('labreports');
    }
  } catch (err) {
    alert(`Save error: ${err.message}`);
  } finally {
    btn.textContent = 'Save';
    btn.disabled = false;
  }
}

async function handleDeleteLabReport(id, batch) {
  if (!confirm(`Are you sure you want to delete lab report for batch "${batch}"?`)) {
    return;
  }

  try {
    const { error } = await deleteLabReport(id);
    if (error) {
      alert(`Error deleting lab report: ${error.message}`);
    } else {
      await loadDashboardData();
    }
  } catch (err) {
    alert(`Delete error: ${err.message}`);
  }
}

// ══════════════════════════════════════════════
// 4. CUSTOMER ENQUIRIES
// ══════════════════════════════════════════════
function filterSubmissions(val) {
  const v = (val || '').toLowerCase();
  const filtered = allSubmissions.filter(s => 
    (s.full_name && s.full_name.toLowerCase().includes(v)) || 
    (s.email && s.email.toLowerCase().includes(v)) ||
    (s.phone && s.phone.toLowerCase().includes(v)) ||
    (s.address && s.address.toLowerCase().includes(v)) ||
    (s.message && s.message.toLowerCase().includes(v))
  );
  renderSubmissionsTable(filtered);
}

function renderSubmissionsTable(data) {
  const container = document.getElementById('submissions-table-container');
  if (!container) return;

  if (data.length === 0) {
    container.innerHTML = '<p style="color:#637381; padding: 24px 0;">No customer enquiries found.</p>';
    return;
  }
  
  let html = `<div class="admin-table-wrap"><table class="admin-table">
    <thead><tr><th>Customer</th><th>Contact Info</th><th>Address</th><th>Message</th><th>Date</th><th>Action</th></tr></thead><tbody>`;
  
  data.forEach(s => {
    const d = s.created_at ? new Date(s.created_at).toLocaleDateString() : '-';
    html += `<tr>
      <td><span style="font-weight:600;">${esc(s.full_name)}</span></td>
      <td>
        <div><a href="mailto:${esc(s.email)}" style="color:#008060; text-decoration:none;">${esc(s.email)}</a></div>
        <div style="font-size:12px; color:#637381; margin-top:2px;">${esc(s.phone)}</div>
      </td>
      <td style="font-size:13px; max-width:200px; word-break:break-word;">${esc(s.address || '-')}</td>
      <td style="font-size:13px; max-width:240px; color:#454f5b;">${esc(s.message || '—')}</td>
      <td style="font-size:13px; color:#637381;">${d}</td>
      <td>
        <button class="admin-btn admin-btn-danger admin-btn-sm" onclick="handleDeleteSubmission('${s.id}', '${esc(s.full_name)}')">Delete</button>
      </td>
    </tr>`;
  });
  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

async function handleDeleteSubmission(id, name) {
  if (!confirm(`Are you sure you want to delete the enquiry from "${name}"?`)) {
    return;
  }

  try {
    const { error } = await deleteUserSubmission(id);
    if (error) {
      alert(`Error deleting submission: ${error.message}`);
    } else {
      await loadDashboardData();
    }
  } catch (err) {
    alert(`Delete error: ${err.message}`);
  }
}

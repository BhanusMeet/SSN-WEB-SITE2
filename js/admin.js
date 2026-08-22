/* ============================================
   SSN ELITE — Admin Dashboard Logic
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
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ── Auth Guard ──
async function checkAuth() {
  currentSession = await checkAdminAuth();
  if (currentSession) {
    document.getElementById('admin-login-screen').style.display = 'none';
    document.getElementById('admin-sidebar').style.display = 'flex';
    document.getElementById('admin-main').style.display = 'block';
    
    initQuillEditors();
    loadDashboardData();
  } else {
    document.getElementById('admin-login-screen').style.display = 'flex';
    document.getElementById('admin-sidebar').style.display = 'none';
    document.getElementById('admin-main').style.display = 'none';
  }
}

async function handleAdminLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const pass = document.getElementById('login-password').value;
  const btn = document.getElementById('login-btn');
  const err = document.getElementById('login-error');
  
  btn.textContent = 'Logging in...';
  btn.disabled = true;
  err.style.display = 'none';

  const { error } = await adminLogin(email, pass);
  if (error) {
    err.textContent = error.message;
    err.style.display = 'block';
    btn.textContent = 'Log in';
    btn.disabled = false;
  } else {
    window.location.reload();
  }
}

async function handleAdminLogout() {
  await adminLogout();
  window.location.reload();
}

document.addEventListener('DOMContentLoaded', checkAuth);

// ── Tabs ──
function switchTab(tabId, btnElement) {
  document.querySelectorAll('.admin-tab-panel').forEach(el => el.classList.remove('active'));
  document.getElementById(`tab-${tabId}`).classList.add('active');
  
  if (btnElement) {
    document.querySelectorAll('.admin-nav-item').forEach(el => el.classList.remove('active'));
    btnElement.classList.add('active');
  }
}

// ── Editors Initialization ──
function initQuillEditors() {
  if (quillProduct) return;
  quillProduct = new Quill('#prod-desc-editor', {
    theme: 'snow',
    modules: { toolbar: [ [{ 'header': [2, 3, false] }], ['bold', 'italic', 'underline'], [{ 'list': 'ordered'}, { 'list': 'bullet' }], ['link', 'image'], ['clean'] ] }
  });
  
  quillBlog = new Quill('#blog-content-editor', {
    theme: 'snow',
    modules: { toolbar: [ [{ 'header': [2, 3, false] }], ['bold', 'italic', 'underline'], [{ 'list': 'ordered'}, { 'list': 'bullet' }], ['link', 'image'], ['clean'] ] }
  });
}

// ── Data Loading ──
async function loadDashboardData() {
  // Load parallel
  const [pRes, bRes, lRes, sRes] = await Promise.all([
    getProducts(),
    getBlogs(),
    getLabReports ? getLabReports() : {data:[]},
    getUserSubmissions()
  ]);
  
  allProducts = pRes.data || [];
  allBlogs = bRes.data || [];
  allLabReports = lRes.data || [];
  allSubmissions = sRes.data || [];
  
  renderProductsTable();
  renderBlogsTable();
  renderLabReportsTable();
  renderSubmissionsTable(allSubmissions);
}

// ── PRODUCTS ──
function renderProductsTable() {
  const container = document.getElementById('products-table-container');
  if (allProducts.length === 0) {
    container.innerHTML = '<p style="color:#637381;">No products found. Add a product to get started.</p>';
    return;
  }
  
  let html = `<div class="admin-table-wrap"><table class="admin-table">
    <thead><tr><th>Product</th><th>Status</th><th>Category</th><th>Price</th><th>Variants</th><th>Actions</th></tr></thead><tbody>`;
  
  allProducts.forEach(p => {
    html += `<tr>
      <td>
        <div style="display:flex; align-items:center; gap:12px;">
          ${p.image_url ? `<img src="${p.image_url}" class="tbl-img">` : `<div class="tbl-img" style="background:#f4f6f8;"></div>`}
          <span style="font-weight:600;">${esc(p.name)}</span>
        </div>
      </td>
      <td><span class="status-badge ${p.status ? p.status.toLowerCase() : 'active'}">${p.status || 'Active'}</span></td>
      <td>${esc(p.category)}</td>
      <td>${esc(p.selling_price || p.price)}</td>
      <td>${p.product_variants ? p.product_variants.length : 0}</td>
      <td>
        <button class="admin-btn admin-btn-outline admin-btn-sm" onclick="openProductEditor('${p.id}')">Edit</button>
      </td>
    </tr>`;
  });
  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

function openProductEditor(id = null) {
  document.getElementById('variant-list').innerHTML = ''; // clear variants
  
  if (id) {
    const p = allProducts.find(x => x.id === id);
    document.getElementById('prod-id').value = p.id;
    document.getElementById('prod-name').value = p.name;
    document.getElementById('prod-status').value = p.status || 'Active';
    document.getElementById('prod-category').value = p.category;
    document.getElementById('prod-selling').value = p.selling_price || p.price || '';
    document.getElementById('prod-mrp').value = p.mrp || '';
    document.getElementById('prod-seo-title').value = p.seo_title || '';
    document.getElementById('prod-seo-desc').value = p.seo_description || '';
    document.getElementById('prod-slug').value = p.slug || '';
    document.getElementById('prod-image-url').value = p.image_url || '';
    quillProduct.root.innerHTML = p.full_description || '';
    
    document.getElementById('prod-img-preview').innerHTML = p.image_url ? `<img src="${p.image_url}">` : '';
    
    if (p.product_variants) {
      p.product_variants.forEach(v => addVariantField(v));
    }
    
    document.getElementById('product-editor-title').textContent = p.name;
  } else {
    document.getElementById('prod-id').value = '';
    document.getElementById('prod-name').value = '';
    document.getElementById('prod-status').value = 'Active';
    document.getElementById('prod-category').value = 'Lean Muscle';
    document.getElementById('prod-selling').value = '';
    document.getElementById('prod-mrp').value = '';
    document.getElementById('prod-seo-title').value = '';
    document.getElementById('prod-seo-desc').value = '';
    document.getElementById('prod-slug').value = '';
    document.getElementById('prod-image-url').value = '';
    quillProduct.root.innerHTML = '';
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
  if (error) { preview.innerHTML = '<p style="color:#d82c0d;">Upload failed.</p>'; return; }
  
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
      <div class="admin-upload-zone" style="padding:10px; width:60px; height:60px; display:flex; align-items:center; justify-content:center;" onclick="document.getElementById('file_${id}').click()">
        ${vImg ? `<img src="${vImg}" style="width:40px;height:40px;object-fit:cover;border-radius:4px;" id="img_${id}">` : `<svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>`}
      </div>
      <input type="file" id="file_${id}" accept="image/*" style="display:none;" onchange="handleVariantImgUpload(this, '${id}')">
      <input type="hidden" class="v-img-val" id="val_${id}" value="${vImg}">
      
      <div style="flex:1; display:flex; gap:12px;">
        <input type="text" class="admin-form-input v-name" placeholder="Flavour (e.g. Chocolate)" value="${vName}">
        <input type="text" class="admin-form-input v-price" placeholder="Price (Optional)" value="${vPrice}">
      </div>
      <button class="admin-btn admin-btn-outline admin-btn-sm" onclick="document.getElementById('${id}').remove()">Trash</button>
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
    zone.innerHTML = `<img src="${publicUrl}" style="width:40px;height:40px;object-fit:cover;border-radius:4px;">`;
  }
}

async function saveProductData() {
  const btn = document.getElementById('save-product-btn');
  btn.textContent = 'Saving...';
  btn.disabled = true;
  
  const variants = [];
  document.querySelectorAll('.variant-item').forEach(el => {
    const name = el.querySelector('.v-name').value;
    if (name) {
      variants.push({
        variant_name: name,
        price_override: el.querySelector('.v-price').value,
        variant_image: el.querySelector('.v-img-val').value
      });
    }
  });

  const product = {
    id: document.getElementById('prod-id').value || undefined,
    name: document.getElementById('prod-name').value,
    status: document.getElementById('prod-status').value,
    category: document.getElementById('prod-category').value,
    selling_price: document.getElementById('prod-selling').value,
    mrp: document.getElementById('prod-mrp').value,
    seo_title: document.getElementById('prod-seo-title').value,
    seo_description: document.getElementById('prod-seo-desc').value,
    slug: document.getElementById('prod-slug').value,
    image_url: document.getElementById('prod-image-url').value,
    full_description: quillProduct.root.innerHTML,
    variants: variants
  };

  const { error } = await saveProduct(product);
  if (error) { alert(error.message); }
  else {
    await loadDashboardData();
    switchTab('products');
  }
  btn.textContent = 'Save';
  btn.disabled = false;
}

// ── BLOGS ──
function renderBlogsTable() {
  const container = document.getElementById('blogs-table-container');
  if (allBlogs.length === 0) {
    container.innerHTML = '<p style="color:#637381;">No blogs found. Create a post.</p>';
    return;
  }
  
  let html = `<div class="admin-table-wrap"><table class="admin-table">
    <thead><tr><th>Blog Title</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead><tbody>`;
  
  allBlogs.forEach(b => {
    html += `<tr>
      <td><span style="font-weight:600;">${esc(b.title)}</span></td>
      <td><span class="status-badge ${b.status ? b.status.toLowerCase() : 'published'}">${b.status || 'Published'}</span></td>
      <td>${esc(b.publish_date)}</td>
      <td><button class="admin-btn admin-btn-outline admin-btn-sm" onclick="openBlogEditor('${b.id}')">Edit</button></td>
    </tr>`;
  });
  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

function openBlogEditor(id = null) {
  if (id) {
    const b = allBlogs.find(x => x.id === id);
    document.getElementById('blog-id').value = b.id;
    document.getElementById('blog-title').value = b.title;
    document.getElementById('blog-status').value = b.status || 'Published';
    document.getElementById('blog-author').value = b.author;
    document.getElementById('blog-category').value = b.category;
    document.getElementById('blog-seo-title').value = b.seo_title || '';
    document.getElementById('blog-seo-desc').value = b.seo_description || '';
    document.getElementById('blog-slug').value = b.slug || '';
    document.getElementById('blog-featured-image').value = b.featured_image || '';
    quillBlog.root.innerHTML = b.content || '';
    document.getElementById('blog-img-preview').innerHTML = b.featured_image ? `<img src="${b.featured_image}">` : '';
    document.getElementById('blog-editor-title').textContent = b.title;
  } else {
    document.getElementById('blog-id').value = '';
    document.getElementById('blog-title').value = '';
    document.getElementById('blog-status').value = 'Published';
    document.getElementById('blog-author').value = 'SSN Elite Team';
    document.getElementById('blog-category').value = 'Nutrition';
    document.getElementById('blog-seo-title').value = '';
    document.getElementById('blog-seo-desc').value = '';
    document.getElementById('blog-slug').value = '';
    document.getElementById('blog-featured-image').value = '';
    quillBlog.root.innerHTML = '';
    document.getElementById('blog-img-preview').innerHTML = '';
    document.getElementById('blog-editor-title').textContent = 'Add blog post';
  }
  switchTab('blog-editor');
}

async function handleBlogImageUpload(input) {
  if (!input.files || !input.files[0]) return;
  const preview = document.getElementById('blog-img-preview');
  preview.innerHTML = '<p style="color:#637381; font-size:12px;">Uploading...</p>';
  
  const { publicUrl, error } = await uploadFileToStorage('blogs', input.files[0]);
  if (error) { preview.innerHTML = '<p style="color:#d82c0d;">Upload failed.</p>'; return; }
  
  document.getElementById('blog-featured-image').value = publicUrl;
  preview.innerHTML = `<img src="${publicUrl}">`;
}

async function saveBlogData() {
  const btn = document.getElementById('save-blog-btn');
  btn.textContent = 'Saving...';
  btn.disabled = true;
  
  const title = document.getElementById('blog-title').value;
  const blog = {
    id: document.getElementById('blog-id').value || undefined,
    title: title,
    slug: document.getElementById('blog-slug').value || title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    status: document.getElementById('blog-status').value,
    author: document.getElementById('blog-author').value,
    category: document.getElementById('blog-category').value,
    seo_title: document.getElementById('blog-seo-title').value,
    seo_description: document.getElementById('blog-seo-desc').value,
    featured_image: document.getElementById('blog-featured-image').value,
    content: quillBlog.root.innerHTML,
    publish_date: new Date().toISOString().split('T')[0]
  };

  const { error } = await saveBlog(blog);
  if (error) { alert(error.message); }
  else {
    await loadDashboardData();
    switchTab('blogs');
  }
  btn.textContent = 'Save';
  btn.disabled = false;
}

// ── LAB REPORTS ──
function renderLabReportsTable() {
  const container = document.getElementById('labreports-table-container');
  if (allLabReports.length === 0) {
    container.innerHTML = '<p style="color:#637381;">No lab reports found.</p>';
    
    // Fill product dropdown for editor
    populateLabProductDropdown();
    return;
  }
  
  let html = `<div class="admin-table-wrap"><table class="admin-table">
    <thead><tr><th>Batch No</th><th>Product</th><th>Lab</th><th>Date</th><th>Actions</th></tr></thead><tbody>`;
  
  allLabReports.forEach(r => {
    html += `<tr>
      <td style="font-family:monospace;">${esc(r.batch_number)}</td>
      <td>${esc(r.product_name)}</td>
      <td>${esc(r.lab_name)}</td>
      <td>${esc(r.test_date)}</td>
      <td><button class="admin-btn admin-btn-outline admin-btn-sm" onclick="openLabReportEditor('${r.id}')">Edit</button></td>
    </tr>`;
  });
  html += `</tbody></table></div>`;
  container.innerHTML = html;
  populateLabProductDropdown();
}

function populateLabProductDropdown() {
  const select = document.getElementById('lr-product');
  select.innerHTML = '<option value="">Select a product...</option>';
  allProducts.forEach(p => {
    select.innerHTML += `<option value="${esc(p.name)}">${esc(p.name)}</option>`;
  });
}

function openLabReportEditor(id = null) {
  if (id) {
    const r = allLabReports.find(x => x.id === id);
    document.getElementById('lr-id').value = r.id;
    document.getElementById('lr-product').value = r.product_name;
    document.getElementById('lr-batch').value = r.batch_number;
    document.getElementById('lr-lab').value = r.lab_name;
    document.getElementById('lr-date').value = r.test_date;
    document.getElementById('lr-images-store').value = JSON.stringify(r.report_images || []);
    
    const preview = document.getElementById('lr-img-preview');
    preview.innerHTML = (r.report_images || []).map(u => `<img src="${u}">`).join('');
    
    document.getElementById('lab-editor-title').textContent = 'Edit lab report';
  } else {
    document.getElementById('lr-id').value = '';
    document.getElementById('lr-product').value = '';
    document.getElementById('lr-batch').value = '';
    document.getElementById('lr-lab').value = '';
    document.getElementById('lr-date').value = '';
    document.getElementById('lr-images-store').value = '[]';
    document.getElementById('lr-img-preview').innerHTML = '';
    document.getElementById('lab-editor-title').textContent = 'Upload lab report';
  }
  switchTab('lab-editor');
}

async function handleLabReportImageUpload(input) {
  if (!input.files || input.files.length === 0) return;
  const preview = document.getElementById('lr-img-preview');
  preview.innerHTML = '<p style="color:#637381; font-size:12px;">Uploading...</p>';
  
  const existing = JSON.parse(document.getElementById('lr-images-store').value || '[]');
  
  for (const file of input.files) {
    const { publicUrl, error } = await uploadFileToStorage('lab-reports', file);
    if (!error && publicUrl) existing.push(publicUrl);
  }
  
  document.getElementById('lr-images-store').value = JSON.stringify(existing);
  preview.innerHTML = existing.map(u => `<img src="${u}">`).join('');
}

async function saveLabReportData() {
  const btn = document.getElementById('save-lr-btn');
  btn.textContent = 'Saving...';
  btn.disabled = true;
  
  const report = {
    id: document.getElementById('lr-id').value || undefined,
    batch_number: document.getElementById('lr-batch').value,
    product_name: document.getElementById('lr-product').value,
    lab_name: document.getElementById('lr-lab').value,
    test_date: document.getElementById('lr-date').value,
    report_images: JSON.parse(document.getElementById('lr-images-store').value || '[]'),
    parameters: [], // Deprecated
    status: 'VERIFIED'
  };

  if(typeof saveLabReport === 'function') {
    const { error } = await saveLabReport(report);
    if (error) { alert(error.message); }
    else {
      await loadDashboardData();
      switchTab('labreports');
    }
  } else {
    alert("saveLabReport function missing from supabaseClient.js");
  }
  
  btn.textContent = 'Save';
  btn.disabled = false;
}

// ── ENQUIRIES ──
function filterSubmissions(val) {
  const v = val.toLowerCase();
  const filtered = allSubmissions.filter(s => s.full_name.toLowerCase().includes(v) || s.email.toLowerCase().includes(v));
  renderSubmissionsTable(filtered);
}

function renderSubmissionsTable(data) {
  const container = document.getElementById('submissions-table-container');
  if (data.length === 0) {
    container.innerHTML = '<p style="color:#637381;">No customer enquiries found.</p>';
    return;
  }
  
  let html = `<div class="admin-table-wrap"><table class="admin-table">
    <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Date</th></tr></thead><tbody>`;
  
  data.forEach(s => {
    const d = new Date(s.created_at).toLocaleDateString();
    html += `<tr>
      <td><span style="font-weight:600;">${esc(s.full_name)}</span></td>
      <td>${esc(s.email)}</td>
      <td>${esc(s.phone)}</td>
      <td>${d}</td>
    </tr>`;
  });
  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

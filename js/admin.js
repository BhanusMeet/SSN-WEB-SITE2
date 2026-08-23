/* ============================================
   SSN ELITE — Admin Dashboard CMS Logic
   Full-System Management with Real-Time Live SSN Frontend Preview
   ============================================ */

let currentSession = null;
let allProducts = [];
let allBlogs = [];
let allLabReports = [];
let allSubmissions = [];

// Working state for structured product editor
let currentGalleryImages = [];
let currentAccordionItems = [];
let currentNutritionRows = [];
let currentFlavourItems = [];
let currentUsageSteps = [];
let currentAudienceItems = [];

// Helper to escape HTML strings
function esc(str) {
  if (str === null || str === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

// Toast notification helper
function showToast(message, type = 'success') {
  const toast = document.getElementById('admin-toast');
  if (!toast) return;
  toast.className = `admin-toast ${type} show`;
  toast.innerHTML = `<span>${message}</span>`;
  setTimeout(() => {
    toast.classList.remove('show');
  }, 4000);
}

// ── Auth Guard ──
async function checkAuth() {
  try {
    currentSession = typeof checkAdminAuth === 'function' ? await checkAdminAuth() : null;
  } catch (e) {
    console.warn('[SSN Admin] Session check error:', e);
    currentSession = null;
  }

  const loginScreen = document.getElementById('admin-login-screen');
  const sidebar = document.getElementById('admin-sidebar');
  const main = document.getElementById('admin-main');

  if (currentSession) {
    if (loginScreen) loginScreen.style.display = 'none';
    if (sidebar) sidebar.style.display = 'flex';
    if (main) main.style.display = 'block';
    
    loadDashboardData();
  } else {
    if (loginScreen) loginScreen.style.display = 'flex';
    if (sidebar) sidebar.style.display = 'none';
    if (main) main.style.display = 'none';
  }
}

// ── Login ──
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
      err.textContent = error.message || 'Invalid email or password.';
      err.style.display = 'block';
      btn.textContent = 'Log in';
      btn.disabled = false;
    } else {
      window.location.reload();
    }
  } catch (ex) {
    err.textContent = 'Login error. Please check your credentials.';
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
function switchTab(tabId, btnElement = null) {
  document.querySelectorAll('.admin-tab-panel').forEach(el => el.classList.remove('active'));
  const target = document.getElementById(`tab-${tabId}`);
  if (target) target.classList.add('active');
  
  if (btnElement) {
    document.querySelectorAll('.admin-nav-item').forEach(el => el.classList.remove('active'));
    btnElement.classList.add('active');
  } else {
    // Sync sidebar active state if triggered programmatically
    document.querySelectorAll('.admin-nav-item').forEach(btn => {
      const match = btn.getAttribute('onclick')?.includes(`'${tabId}'`);
      btn.classList.toggle('active', Boolean(match));
    });
  }

  // Scroll to top of main on tab change
  window.scrollTo(0, 0);
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
    
    // Update overview stats
    const pCount = document.getElementById('stat-products-count');
    const bCount = document.getElementById('stat-blogs-count');
    const lCount = document.getElementById('stat-lab-count');
    if (pCount) pCount.textContent = allProducts.length;
    if (bCount) bCount.textContent = allBlogs.filter(b => (b.status || 'Published').toLowerCase() === 'published').length;
    if (lCount) lCount.textContent = allLabReports.length;

    renderProductsTable();
    renderBlogsTable();
    renderLabReportsTable();
    renderSubmissionsTable(allSubmissions);
    loadSocialSettings();
  } catch (err) {
    console.error('[SSN Admin] Dashboard sync error:', err);
  }
}


/* ══════════════════════════════════════════════
   1. PRODUCTS MANAGEMENT & STRUCTURED EDITOR
   ══════════════════════════════════════════════ */

function renderProductsTable() {
  const container = document.getElementById('products-table-container');
  if (!container) return;

  if (allProducts.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding: 48px 16px; color:#637381;">
        <p style="font-size:15px; margin-bottom:12px;">No products found in database.</p>
        <button class="admin-btn admin-btn-primary" onclick="openProductEditor()">Create Your First Product</button>
      </div>
    `;
    return;
  }
  
  let html = `<div class="admin-table-wrap"><table class="admin-table">
    <thead><tr><th>Product</th><th>Status</th><th>Category</th><th>Price / MRP</th><th>Serving</th><th>Actions</th></tr></thead><tbody>`;
  
  allProducts.forEach(p => {
    const status = p.status || 'Active';
    const statusClass = status.toLowerCase() === 'active' ? 'active' : status.toLowerCase() === 'draft' ? 'draft' : 'archived';
    const priceDisplay = (p.selling_price || p.price || '') + (p.mrp ? ` <span style="color:#8c9196; font-size:12px; text-decoration:line-through; margin-left:4px;">${esc(p.mrp)}</span>` : '');
    const img = p.image_url || p.main_image || '';

    const staticPages = ['performance-whey', 'anabolic-monster-mass', 'tri-creatine', 'eaa-bcaa-glutamine'];
    const pSlug = (p.slug || p.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    const liveUrl = staticPages.includes(pSlug) ? `${pSlug}.html` : `product.html?slug=${encodeURIComponent(p.slug || pSlug)}`;

    html += `<tr>
      <td>
        <div style="display:flex; align-items:center; gap:12px;">
          ${img ? `<img src="${img}" class="tbl-img">` : `<div class="tbl-img" style="background:#f4f6f8; display:flex; align-items:center; justify-content:center; color:#8c9196; font-size:10px;">No img</div>`}
          <div>
            <span style="font-weight:600; display:block;">${esc(p.name || p.title || 'Unnamed Product')}</span>
            <span style="font-size:12px; color:#637381;">${esc(p.slug || '')}</span>
          </div>
        </div>
      </td>
      <td><span class="status-badge ${statusClass}">${esc(status)}</span></td>
      <td>${esc(p.category || '-')}</td>
      <td>${priceDisplay || '-'}</td>
      <td>${esc(p.serving_size || '-')}</td>
      <td>
        <div style="display:flex; gap:8px;">
          <a href="${liveUrl}" target="_blank" class="admin-btn admin-btn-outline admin-btn-sm" style="text-decoration:none;">View</a>
          <button class="admin-btn admin-btn-outline admin-btn-sm" onclick="openProductEditor('${p.id}')">Edit</button>
          <button class="admin-btn admin-btn-danger admin-btn-sm" onclick="handleDeleteProduct('${p.id}', '${esc(p.name || p.title)}')">Delete</button>
        </div>
      </td>
    </tr>`;
  });
  html += `</tbody></table></div>`;
  container.innerHTML = html;
}

function openProductEditor(id = null) {
  switchTab('product-editor');
  
  if (id) {
    const p = allProducts.find(x => x.id === id);
    if (!p) return;

    document.getElementById('prod-id').value = p.id || '';
    document.getElementById('prod-name').value = p.name || p.title || '';
    document.getElementById('prod-series').value = p.series || 'SSN Elite Series';
    document.getElementById('prod-category').value = p.category || 'Lean Muscle';
    document.getElementById('prod-selling').value = p.selling_price || p.price || '';
    document.getElementById('prod-mrp').value = p.mrp || '';
    document.getElementById('prod-discount').value = p.discount || '';
    document.getElementById('prod-serving-size').value = p.serving_size || '';
    document.getElementById('prod-servings').value = p.servings || '';
    document.getElementById('prod-protein-per-serving').value = p.protein_per_serving || '';
    document.getElementById('prod-badges').value = Array.isArray(p.badges) ? p.badges.join(', ') : (p.badges || '');
    
    // Main image
    const mainImg = p.image_url || p.main_image || '';
    document.getElementById('prod-main-img-url').value = mainImg;
    document.getElementById('prod-main-img-preview').innerHTML = mainImg ? `<img src="${mainImg}">` : '';

    // Gallery
    currentGalleryImages = Array.isArray(p.gallery_images) ? [...p.gallery_images] : [];
    renderGalleryChips();

    // Intro
    const intro = p.product_intro || {};
    document.getElementById('prod-intro-heading').value = intro.heading || '';
    document.getElementById('prod-intro-tag').value = intro.tag || 'Educational';
    document.getElementById('prod-intro-content').value = intro.content || p.short_description || '';

    // Key Metric
    const metric = p.key_metric || {};
    document.getElementById('prod-metric-num').value = metric.number || '';
    document.getElementById('prod-metric-unit').value = metric.unit || 'G';
    document.getElementById('prod-metric-label').value = metric.label || 'Protein Per Serving';
    document.getElementById('prod-metric-sublabel').value = metric.sublabel || 'Per scoop serving';

    // Protein Source
    const source = p.protein_source || {};
    document.getElementById('prod-source-heading').value = source.heading || 'The Protein Source';
    document.getElementById('prod-source-tag').value = source.tag || '';
    document.getElementById('prod-source-content').value = source.content || '';

    // Accordion
    currentAccordionItems = Array.isArray(p.ingredients_accordion) && p.ingredients_accordion.length > 0 ? [...p.ingredients_accordion] : [
      { title: 'Whey Protein Concentrate', description: 'Primary protein source providing complete amino acid profile.', bullets: [] },
      { title: 'BCAA + Silk Amino Acid Blend', description: 'Supports rapid absorption and muscle recovery.', bullets: ['L-Leucine', 'L-Isoleucine', 'L-Valine'] }
    ];
    renderAccordionItems();

    // Nutrition
    currentNutritionRows = Array.isArray(p.nutrition_facts) && p.nutrition_facts.length > 0 ? [...p.nutrition_facts] : [
      { nutrient: 'Energy', amount: '138.04', unit: 'kcal' },
      { nutrient: 'Protein', amount: '24', unit: 'g' }
    ];
    renderNutritionRows();

    // Flavours
    currentFlavourItems = Array.isArray(p.flavours) && p.flavours.length > 0 ? [...p.flavours] : [
      { name: 'Chocolate Brownie', description: 'Rich chocolate brownie profile.', image: '', color: 'rgba(101,67,33,0.4)', active: true }
    ];
    renderFlavourItems();

    // How to Use
    currentUsageSteps = Array.isArray(p.how_to_use) && p.how_to_use.length > 0 ? [...p.how_to_use] : [
      { step: '01', title: 'Measure', description: 'Take 1 scoop of powder.' },
      { step: '02', title: 'Mix', description: 'Add to 180-200 ml of cold water.' },
      { step: '03', title: 'Shake', description: 'Shake or stir for 30 seconds.' }
    ];
    renderUsageSteps();

    // Target Audience
    currentAudienceItems = Array.isArray(p.target_audience) && p.target_audience.length > 0 ? [...p.target_audience] : [
      { icon: '🏋️', title: 'Strength Training', description: 'For muscle repair and growth.' },
      { icon: '⚡', title: 'Sports & Athletics', description: 'For athletic performance.' },
      { icon: '🏃', title: 'Active Lifestyle', description: 'To meet daily protein goals.' }
    ];
    renderAudienceItems();

    // Storage & Notice
    const st = p.storage_info || {};
    const nt = p.important_notice || {};
    document.getElementById('prod-storage-content').value = st.content || 'Store in a cool, dry place away from direct sunlight.';
    document.getElementById('prod-notice-content').value = nt.content || 'This product is a dietary supplement and is not intended to diagnose, treat, cure, or prevent any disease.';

    // SEO & Status
    document.getElementById('prod-status').value = p.status || 'Active';
    document.getElementById('prod-seo-title').value = p.seo_title || p.name || '';
    document.getElementById('prod-seo-desc').value = p.seo_description || '';
    document.getElementById('prod-slug').value = p.slug || '';

    document.getElementById('product-editor-title').textContent = `Edit — ${p.name || p.title}`;
  } else {
    // Reset to defaults
    document.getElementById('prod-id').value = '';
    document.getElementById('prod-name').value = '';
    document.getElementById('prod-series').value = 'SSN Elite Series';
    document.getElementById('prod-category').value = 'Lean Muscle';
    document.getElementById('prod-selling').value = '';
    document.getElementById('prod-mrp').value = '';
    document.getElementById('prod-discount').value = '';
    document.getElementById('prod-serving-size').value = '3 KG';
    document.getElementById('prod-servings').value = '70 Servings';
    document.getElementById('prod-protein-per-serving').value = '24g Protein';
    document.getElementById('prod-badges').value = 'Strength Training, Sports, Active Lifestyle';
    
    document.getElementById('prod-main-img-url').value = '';
    document.getElementById('prod-main-img-preview').innerHTML = '';
    currentGalleryImages = [];
    renderGalleryChips();

    document.getElementById('prod-intro-heading').value = 'What Is This Product?';
    document.getElementById('prod-intro-tag').value = 'Educational';
    document.getElementById('prod-intro-content').value = '';

    document.getElementById('prod-metric-num').value = '24';
    document.getElementById('prod-metric-unit').value = 'G';
    document.getElementById('prod-metric-label').value = 'Protein Per Serving';
    document.getElementById('prod-metric-sublabel').value = 'Per scoop serving';

    document.getElementById('prod-source-heading').value = 'The Protein Source';
    document.getElementById('prod-source-tag').value = 'Whey Protein Concentrate';
    document.getElementById('prod-source-content').value = '';

    currentAccordionItems = [
      { title: 'Primary Ingredients', description: 'High quality filtered formulation.', bullets: [] }
    ];
    renderAccordionItems();

    currentNutritionRows = [
      { nutrient: 'Energy', amount: '138.04', unit: 'kcal' },
      { nutrient: 'Protein', amount: '24', unit: 'g' }
    ];
    renderNutritionRows();

    currentFlavourItems = [
      { name: 'Chocolate Brownie', description: 'Rich chocolate brownie profile.', image: '', color: 'rgba(101,67,33,0.4)', active: true }
    ];
    renderFlavourItems();

    currentUsageSteps = [
      { step: '01', title: 'Measure', description: 'Take 1 scoop of powder.' },
      { step: '02', title: 'Mix', description: 'Add to 180-200 ml of cold water.' },
      { step: '03', title: 'Shake', description: 'Shake or stir for 30 seconds.' }
    ];
    renderUsageSteps();

    currentAudienceItems = [
      { icon: '🏋️', title: 'Strength Training', description: 'For muscle repair and growth.' },
      { icon: '⚡', title: 'Sports & Athletics', description: 'For athletic performance.' },
      { icon: '🏃', title: 'Active Lifestyle', description: 'To meet daily protein goals.' }
    ];
    renderAudienceItems();

    document.getElementById('prod-storage-content').value = 'Store in a cool, dry place away from direct sunlight.';
    document.getElementById('prod-notice-content').value = 'This product is a dietary supplement and is not intended to diagnose, treat, cure, or prevent any disease.';

    document.getElementById('prod-status').value = 'Active';
    document.getElementById('prod-seo-title').value = '';
    document.getElementById('prod-seo-desc').value = '';
    document.getElementById('prod-slug').value = '';

    document.getElementById('product-editor-title').textContent = 'Add Product';
  }

  updateLivePreview();
}

// ── Live Customer Preview Synchronizer ──
function updateLivePreview() {
  const preview = document.getElementById('live-ssn-page');
  if (!preview) return;

  const name = document.getElementById('prod-name')?.value || 'Product Name';
  const series = document.getElementById('prod-series')?.value || 'SSN Elite Series';
  const sellingPrice = document.getElementById('prod-selling')?.value || '₹0';
  const mrp = document.getElementById('prod-mrp')?.value || '';
  const discount = document.getElementById('prod-discount')?.value || '';
  const servingSize = document.getElementById('prod-serving-size')?.value || '';
  const servings = document.getElementById('prod-servings')?.value || '';
  const proteinPerServing = document.getElementById('prod-protein-per-serving')?.value || '';
  const badgesRaw = document.getElementById('prod-badges')?.value || '';
  const mainImg = document.getElementById('prod-main-img-url')?.value || '';

  const introHeading = document.getElementById('prod-intro-heading')?.value || 'Introduction';
  const introTag = document.getElementById('prod-intro-tag')?.value || 'Educational';
  const introContent = document.getElementById('prod-intro-content')?.value || '';

  const metricNum = document.getElementById('prod-metric-num')?.value || '24';
  const metricUnit = document.getElementById('prod-metric-unit')?.value || 'G';
  const metricLabel = document.getElementById('prod-metric-label')?.value || 'Protein Per Serving';
  const metricSublabel = document.getElementById('prod-metric-sublabel')?.value || 'Per scoop serving';

  const sourceHeading = document.getElementById('prod-source-heading')?.value || 'The Protein Source';
  const sourceTag = document.getElementById('prod-source-tag')?.value || '';
  const sourceContent = document.getElementById('prod-source-content')?.value || '';

  const storageContent = document.getElementById('prod-storage-content')?.value || '';
  const noticeContent = document.getElementById('prod-notice-content')?.value || '';

  const badges = badgesRaw ? badgesRaw.split(',').map(b => b.trim()).filter(Boolean) : [];

  let html = `
    <!-- Hero -->
    <div class="live-hero">
      <span class="live-hero-series">${esc(series)}</span>
      <h1 class="live-hero-title">${esc(name)}</h1>
      
      <div class="live-hero-specs">
        ${servingSize ? `<span class="live-spec-badge">${esc(servingSize)}</span>` : ''}
        ${servings ? `<span class="live-spec-badge">${esc(servings)}</span>` : ''}
        ${proteinPerServing ? `<span class="live-spec-badge">${esc(proteinPerServing)}</span>` : ''}
      </div>

      <div class="live-price-box">
        <span class="live-price-label">MRP</span>
        <div class="live-price">${esc(sellingPrice)} ${mrp ? `<span style="font-size:16px; color:#8c9196; text-decoration:line-through; font-weight:normal; margin-left:6px;">${esc(mrp)}</span>` : ''}</div>
        ${discount ? `<span style="font-size:12px; color:#008060; font-weight:600;">${esc(discount)}</span>` : ''}
      </div>

      ${badges.length > 0 ? `
        <div style="display:flex; gap:6px; flex-wrap:wrap; margin-top:8px;">
          ${badges.map(b => `<span style="font-size:11px; padding:2px 8px; background:#e8e8ec; border-radius:4px;">${esc(b)}</span>`).join('')}
        </div>
      ` : ''}

      <div class="live-hero-img-wrap">
        ${mainImg ? `<img src="${mainImg}" class="live-hero-img">` : `<div style="padding:40px; background:#f0f0f2; border-radius:8px; color:#8a8a96; font-size:12px;">No product image uploaded</div>`}
      </div>
    </div>

    <!-- Intro -->
    <div class="live-section">
      <div class="live-section-tag">02 — ${esc(introTag)}</div>
      <h2 class="live-section-title">${esc(introHeading)}</h2>
      <p style="font-size:13px; line-height:1.6; color:#4A4A52;">${esc(introContent) || 'Detailed description will appear here...'}</p>
    </div>

    <!-- Key Metric -->
    <div class="live-section bg-alt">
      <div class="live-section-tag">03 — Key Stat</div>
      <div class="live-stat-box">
        <div><span class="live-stat-val">${esc(metricNum)}</span><span class="live-stat-unit">${esc(metricUnit)}</span></div>
        <div class="live-stat-label">${esc(metricLabel)}</div>
        <div style="font-size:11px; color:#8A8A96; margin-top:4px;">${esc(metricSublabel)}</div>
      </div>
    </div>

    <!-- Protein Source -->
    <div class="live-section">
      <div class="live-section-tag">04 — Source</div>
      <h2 class="live-section-title">${esc(sourceHeading)}</h2>
      ${sourceTag ? `<span style="display:inline-block; font-size:11px; font-weight:600; padding:2px 8px; background:rgba(10,47,255,0.08); color:#0A2FFF; border-radius:4px; margin-bottom:8px;">${esc(sourceTag)}</span>` : ''}
      <p style="font-size:13px; line-height:1.6; color:#4A4A52;">${esc(sourceContent) || 'Protein source information will appear here...'}</p>
    </div>

    <!-- What's Inside Accordion -->
    ${currentAccordionItems.length > 0 ? `
      <div class="live-section bg-alt">
        <div class="live-section-tag">05 — Ingredients</div>
        <h2 class="live-section-title">What's Inside</h2>
        <div style="margin-top:10px;">
          ${currentAccordionItems.map(acc => `
            <div class="live-accordion-item">
              <div class="live-accordion-hdr">
                <span>${esc(acc.title || 'Ingredient')}</span>
                <span>+</span>
              </div>
              <div class="live-accordion-body">
                <p style="margin:0;">${esc(acc.description || '')}</p>
                ${acc.bullets && acc.bullets.length > 0 ? `
                  <ul style="margin:6px 0 0 16px; padding:0;">
                    ${acc.bullets.map(b => `<li>${esc(b)}</li>`).join('')}
                  </ul>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}

    <!-- Key Nutrition -->
    ${currentNutritionRows.length > 0 ? `
      <div class="live-section bg-alt">
        <div class="live-section-tag">07 — Nutrition Facts</div>
        <h2 class="live-section-title">Key Nutrition</h2>
        <table class="live-nutrition-tbl">
          <thead><tr><th>Nutrient</th><th>Amount</th></tr></thead>
          <tbody>
            ${currentNutritionRows.map(row => `
              <tr>
                <td>${esc(row.nutrient)}</td>
                <td style="font-weight:600;">${esc(row.amount)} ${esc(row.unit)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    ` : ''}

    <!-- Flavours -->
    ${currentFlavourItems.length > 0 ? `
      <div class="live-section">
        <div class="live-section-tag">08 — Flavours</div>
        <h2 class="live-section-title">Flavour Experience</h2>
        <div class="live-flavour-pills">
          ${currentFlavourItems.map((f, i) => `
            <div class="live-flavour-pill ${i === 0 ? 'active' : ''}">${esc(f.name || 'Flavour')}</div>
          `).join('')}
        </div>
        <p style="font-size:12px; color:#637381; margin-top:6px;">${esc(currentFlavourItems[0]?.description || '')}</p>
      </div>
    ` : ''}

    <!-- How to Use -->
    ${currentUsageSteps.length > 0 ? `
      <div class="live-section bg-alt">
        <div class="live-section-tag">09 — Directions</div>
        <h2 class="live-section-title">How To Use</h2>
        <div class="live-steps-grid">
          ${currentUsageSteps.map(step => `
            <div class="live-step-card">
              <div class="live-step-num">${esc(step.step || '01')}</div>
              <div class="live-step-title">${esc(step.title || '')}</div>
              <div class="live-step-desc">${esc(step.description || '')}</div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}

    <!-- Target Audience -->
    ${currentAudienceItems.length > 0 ? `
      <div class="live-section">
        <div class="live-section-tag">10 — Target Audience</div>
        <h2 class="live-section-title">Who Is It For?</h2>
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:10px;">
          ${currentAudienceItems.map(aud => `
            <div style="padding:10px; background:#F7F7F8; border-radius:6px; text-align:center;">
              <div style="font-size:20px;">${esc(aud.icon || '🎯')}</div>
              <div style="font-weight:600; font-size:12px; margin-top:4px;">${esc(aud.title || '')}</div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}

    <!-- Storage & Notices -->
    <div class="live-section bg-alt">
      <div class="live-section-tag">11 — Storage & Warnings</div>
      <div style="display:flex; flex-direction:column; gap:10px; margin-top:8px;">
        <div style="padding:10px; background:#fff; border-radius:6px; border:1px solid rgba(0,0,0,0.06);">
          <div style="font-weight:600; font-size:12px; margin-bottom:4px;">Storage</div>
          <div style="font-size:11px; color:#4A4A52;">${esc(storageContent)}</div>
        </div>
        <div style="padding:10px; background:#fff; border-radius:6px; border:1px solid rgba(0,0,0,0.06);">
          <div style="font-weight:600; font-size:12px; margin-bottom:4px;">Important Notice</div>
          <div style="font-size:11px; color:#4A4A52;">${esc(noticeContent)}</div>
        </div>
      </div>
    </div>
  `;

  preview.innerHTML = html;
}

function setPreviewDevice(device, btn) {
  const viewport = document.getElementById('live-preview-viewport');
  if (!viewport) return;

  document.querySelectorAll('.device-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');

  viewport.className = `admin-preview-viewport device-${device}`;
}


/* ── Repeatable Sub-Editors: Gallery Images ── */
function renderGalleryChips() {
  const container = document.getElementById('gallery-chip-container');
  if (!container) return;

  container.innerHTML = currentGalleryImages.map((img, i) => `
    <div class="gallery-chip">
      <img src="${img}">
      <button type="button" class="gallery-chip-remove" onclick="removeGalleryImage(${i})">&times;</button>
    </div>
  `).join('');
}

function removeGalleryImage(index) {
  currentGalleryImages.splice(index, 1);
  renderGalleryChips();
}

async function handleGalleryImageUpload(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];

  const { publicUrl, error } = await uploadFileToStorage('products/gallery', file);
  if (error) {
    showToast(`Gallery upload failed: ${error.message}`, 'error');
    return;
  }

  currentGalleryImages.push(publicUrl);
  renderGalleryChips();
  input.value = '';
  showToast('Gallery image added.');
}

async function handleMainImageUpload(input) {
  if (!input.files || !input.files[0]) return;
  const preview = document.getElementById('prod-main-img-preview');
  preview.innerHTML = '<p style="color:#637381; font-size:12px;">Uploading image to Supabase...</p>';

  const { publicUrl, error } = await uploadFileToStorage('products', input.files[0]);
  if (error) {
    preview.innerHTML = `<p style="color:#d82c0d; font-size:12px;">Upload failed: ${error.message}</p>`;
    showToast(`Image upload failed: ${error.message}`, 'error');
    return;
  }

  document.getElementById('prod-main-img-url').value = publicUrl;
  preview.innerHTML = `<img src="${publicUrl}">`;
  updateLivePreview();
  showToast('Main image uploaded successfully.');
}


/* ── Repeatable Sub-Editors: Ingredients Accordion ── */
function renderAccordionItems() {
  const container = document.getElementById('accordion-list');
  if (!container) return;

  container.innerHTML = currentAccordionItems.map((item, i) => `
    <div class="repeatable-item">
      <div class="repeatable-item-content">
        <input type="text" class="admin-form-input" placeholder="Accordion Title (e.g. Whey Protein Concentrate)" value="${esc(item.title)}" oninput="currentAccordionItems[${i}].title=this.value; updateLivePreview()">
        <textarea class="admin-form-textarea" rows="2" placeholder="Description..." oninput="currentAccordionItems[${i}].description=this.value; updateLivePreview()">${esc(item.description || '')}</textarea>
        <input type="text" class="admin-form-input" placeholder="Bullets (comma-separated, optional)" value="${esc((item.bullets || []).join(', '))}" oninput="currentAccordionItems[${i}].bullets=this.value.split(',').map(b=>b.trim()).filter(Boolean); updateLivePreview()">
      </div>
      <div class="repeatable-item-actions">
        <button type="button" class="repeatable-btn-icon" onclick="moveAccordion(${i}, -1)">&uarr;</button>
        <button type="button" class="repeatable-btn-icon" onclick="moveAccordion(${i}, 1)">&darr;</button>
        <button type="button" class="repeatable-btn-icon repeatable-btn-danger" onclick="removeAccordion(${i})">&times;</button>
      </div>
    </div>
  `).join('');
}

function addAccordionItem() {
  currentAccordionItems.push({ title: '', description: '', bullets: [] });
  renderAccordionItems();
  updateLivePreview();
}

function removeAccordion(i) {
  currentAccordionItems.splice(i, 1);
  renderAccordionItems();
  updateLivePreview();
}

function moveAccordion(i, dir) {
  const target = i + dir;
  if (target < 0 || target >= currentAccordionItems.length) return;
  const temp = currentAccordionItems[i];
  currentAccordionItems[i] = currentAccordionItems[target];
  currentAccordionItems[target] = temp;
  renderAccordionItems();
  updateLivePreview();
}


/* ── Repeatable Sub-Editors: Key Nutrition Facts ── */
function renderNutritionRows() {
  const container = document.getElementById('nutrition-list');
  if (!container) return;

  container.innerHTML = currentNutritionRows.map((row, i) => `
    <div class="repeatable-item">
      <div class="repeatable-item-content">
        <div class="admin-form-row-3">
          <input type="text" class="admin-form-input" placeholder="Nutrient (e.g. Energy)" value="${esc(row.nutrient)}" oninput="currentNutritionRows[${i}].nutrient=this.value; updateLivePreview()">
          <input type="text" class="admin-form-input" placeholder="Amount (e.g. 138.04)" value="${esc(row.amount)}" oninput="currentNutritionRows[${i}].amount=this.value; updateLivePreview()">
          <input type="text" class="admin-form-input" placeholder="Unit (e.g. kcal / g)" value="${esc(row.unit)}" oninput="currentNutritionRows[${i}].unit=this.value; updateLivePreview()">
        </div>
      </div>
      <div class="repeatable-item-actions">
        <button type="button" class="repeatable-btn-icon repeatable-btn-danger" onclick="removeNutritionRow(${i})">&times;</button>
      </div>
    </div>
  `).join('');
}

function addNutritionRow() {
  currentNutritionRows.push({ nutrient: '', amount: '', unit: '' });
  renderNutritionRows();
  updateLivePreview();
}

function removeNutritionRow(i) {
  currentNutritionRows.splice(i, 1);
  renderNutritionRows();
  updateLivePreview();
}


/* ── Repeatable Sub-Editors: Flavour System ── */
function renderFlavourItems() {
  const container = document.getElementById('flavour-list');
  if (!container) return;

  container.innerHTML = currentFlavourItems.map((f, i) => `
    <div class="repeatable-item">
      <div class="repeatable-item-content">
        <div class="admin-form-row">
          <input type="text" class="admin-form-input" placeholder="Flavour Name (e.g. Chocolate Brownie)" value="${esc(f.name)}" oninput="currentFlavourItems[${i}].name=this.value; updateLivePreview()">
          <input type="text" class="admin-form-input" placeholder="Description / Profile" value="${esc(f.description)}" oninput="currentFlavourItems[${i}].description=this.value; updateLivePreview()">
        </div>
      </div>
      <div class="repeatable-item-actions">
        <button type="button" class="repeatable-btn-icon repeatable-btn-danger" onclick="removeFlavourItem(${i})">&times;</button>
      </div>
    </div>
  `).join('');
}

function addFlavourItem() {
  currentFlavourItems.push({ name: '', description: '', image: '', color: 'rgba(10,47,255,0.4)', active: true });
  renderFlavourItems();
  updateLivePreview();
}

function removeFlavourItem(i) {
  currentFlavourItems.splice(i, 1);
  renderFlavourItems();
  updateLivePreview();
}


/* ── Repeatable Sub-Editors: How to Use Steps ── */
function renderUsageSteps() {
  const container = document.getElementById('usage-list');
  if (!container) return;

  container.innerHTML = currentUsageSteps.map((step, i) => `
    <div class="repeatable-item">
      <div class="repeatable-item-content">
        <div class="admin-form-row">
          <input type="text" class="admin-form-input" style="max-width:80px;" placeholder="Step #" value="${esc(step.step)}" oninput="currentUsageSteps[${i}].step=this.value; updateLivePreview()">
          <input type="text" class="admin-form-input" placeholder="Step Title (e.g. Measure)" value="${esc(step.title)}" oninput="currentUsageSteps[${i}].title=this.value; updateLivePreview()">
        </div>
        <input type="text" class="admin-form-input" placeholder="Instructions..." value="${esc(step.description)}" oninput="currentUsageSteps[${i}].description=this.value; updateLivePreview()">
      </div>
      <div class="repeatable-item-actions">
        <button type="button" class="repeatable-btn-icon repeatable-btn-danger" onclick="removeUsageStep(${i})">&times;</button>
      </div>
    </div>
  `).join('');
}

function addUsageStep() {
  const nextNum = String(currentUsageSteps.length + 1).padStart(2, '0');
  currentUsageSteps.push({ step: nextNum, title: '', description: '' });
  renderUsageSteps();
  updateLivePreview();
}

function removeUsageStep(i) {
  currentUsageSteps.splice(i, 1);
  renderUsageSteps();
  updateLivePreview();
}


/* ── Repeatable Sub-Editors: Target Audience ── */
function renderAudienceItems() {
  const container = document.getElementById('audience-list');
  if (!container) return;

  container.innerHTML = currentAudienceItems.map((aud, i) => `
    <div class="repeatable-item">
      <div class="repeatable-item-content">
        <div class="admin-form-row">
          <input type="text" class="admin-form-input" style="max-width:80px;" placeholder="Icon (e.g. 🏋️)" value="${esc(aud.icon)}" oninput="currentAudienceItems[${i}].icon=this.value; updateLivePreview()">
          <input type="text" class="admin-form-input" placeholder="Audience Title (e.g. Strength Training)" value="${esc(aud.title)}" oninput="currentAudienceItems[${i}].title=this.value; updateLivePreview()">
        </div>
      </div>
      <div class="repeatable-item-actions">
        <button type="button" class="repeatable-btn-icon repeatable-btn-danger" onclick="removeAudienceItem(${i})">&times;</button>
      </div>
    </div>
  `).join('');
}

function addAudienceItem() {
  currentAudienceItems.push({ icon: '🎯', title: '', description: '' });
  renderAudienceItems();
  updateLivePreview();
}

function removeAudienceItem(i) {
  currentAudienceItems.splice(i, 1);
  renderAudienceItems();
  updateLivePreview();
}


/* ── Save Product Action ── */
async function saveProductData() {
  const btn = document.getElementById('save-product-btn');
  const prodName = (document.getElementById('prod-name')?.value || '').trim();

  if (!prodName) {
    showToast('Please enter a product name.', 'error');
    return;
  }

  btn.textContent = 'Saving to Database...';
  btn.disabled = true;

  const badgesRaw = document.getElementById('prod-badges')?.value || '';
  const badges = badgesRaw ? badgesRaw.split(',').map(b => b.trim()).filter(Boolean) : [];

  const mainImg = document.getElementById('prod-main-img-url')?.value || '';
  const introContent = document.getElementById('prod-intro-content')?.value || '';

  const productPayload = {
    id: document.getElementById('prod-id')?.value || undefined,
    name: prodName,
    title: prodName,
    series: document.getElementById('prod-series')?.value || 'SSN Elite Series',
    category: document.getElementById('prod-category')?.value || 'Lean Muscle',
    selling_price: document.getElementById('prod-selling')?.value.trim() || '',
    price: document.getElementById('prod-selling')?.value.trim() || '',
    mrp: document.getElementById('prod-mrp')?.value.trim() || '',
    discount: document.getElementById('prod-discount')?.value.trim() || '',
    serving_size: document.getElementById('prod-serving-size')?.value.trim() || '',
    servings: document.getElementById('prod-servings')?.value.trim() || '',
    protein_per_serving: document.getElementById('prod-protein-per-serving')?.value.trim() || '',
    badges: badges,
    image_url: mainImg,
    main_image: mainImg,
    gallery_images: currentGalleryImages,
    status: document.getElementById('prod-status')?.value || 'Active',
    
    // Structured Blocks
    product_intro: {
      section_num: '02',
      heading: document.getElementById('prod-intro-heading')?.value || 'What Is This Product?',
      tag: document.getElementById('prod-intro-tag')?.value || 'Educational',
      content: introContent
    },
    key_metric: {
      number: document.getElementById('prod-metric-num')?.value || '24',
      unit: document.getElementById('prod-metric-unit')?.value || 'G',
      label: document.getElementById('prod-metric-label')?.value || 'Protein Per Serving',
      sublabel: document.getElementById('prod-metric-sublabel')?.value || 'Per scoop serving'
    },
    protein_source: {
      heading: document.getElementById('prod-source-heading')?.value || 'The Protein Source',
      tag: document.getElementById('prod-source-tag')?.value || '',
      content: document.getElementById('prod-source-content')?.value || ''
    },
    ingredients_accordion: currentAccordionItems.filter(x => x.title),
    nutrition_facts: currentNutritionRows.filter(x => x.nutrient),
    flavours: currentFlavourItems.filter(x => x.name),
    how_to_use: currentUsageSteps.filter(x => x.title),
    target_audience: currentAudienceItems.filter(x => x.title),
    storage_info: {
      heading: 'Storage',
      content: document.getElementById('prod-storage-content')?.value || ''
    },
    important_notice: {
      heading: 'Important Notice',
      content: document.getElementById('prod-notice-content')?.value || ''
    },

    short_description: introContent.substring(0, 160),
    full_description: introContent,
    seo_title: document.getElementById('prod-seo-title')?.value.trim() || prodName,
    seo_description: document.getElementById('prod-seo-desc')?.value.trim() || introContent.substring(0, 160),
    slug: document.getElementById('prod-slug')?.value.trim() || prodName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  };

  try {
    const res = await saveProduct(productPayload);
    if (res && res.error) {
      showToast(`Error saving product: ${res.error.message}`, 'error');
    } else {
      showToast('Product saved successfully!');
      await loadDashboardData();
      switchTab('products');
    }
  } catch (err) {
    showToast(`Save error: ${err.message}`, 'error');
  } finally {
    btn.textContent = 'Save Product';
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
      showToast(`Error deleting product: ${error.message}`, 'error');
    } else {
      showToast('Product deleted.');
      await loadDashboardData();
    }
  } catch (err) {
    showToast(`Delete error: ${err.message}`, 'error');
  }
}


/* ══════════════════════════════════════════════
   2. BLOGS MANAGEMENT
   ══════════════════════════════════════════════ */

function renderBlogsTable() {
  const container = document.getElementById('blogs-table-container');
  if (!container) return;

  if (allBlogs.length === 0) {
    container.innerHTML = '<p style="color:#637381; padding: 24px 0;">No blog posts found in database. Click "Add Blog Post" to publish an article.</p>';
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
      <td>${esc(b.category || 'Nutrition Science')}</td>
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
  const contentElem = document.getElementById('blog-content');

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
    if (contentElem) contentElem.value = b.content || '';
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
    if (contentElem) contentElem.value = '';
    document.getElementById('blog-img-preview').innerHTML = '';
    document.getElementById('blog-editor-title').textContent = 'Add Blog Post';
  }
}

async function handleBlogImageUpload(input) {
  if (!input.files || !input.files[0]) return;
  const preview = document.getElementById('blog-img-preview');
  preview.innerHTML = '<p style="color:#637381; font-size:12px;">Uploading image...</p>';
  
  const { publicUrl, error } = await uploadFileToStorage('blogs', input.files[0]);
  if (error) { 
    preview.innerHTML = `<p style="color:#d82c0d; font-size:12px;">Upload failed: ${error.message}</p>`; 
    showToast(`Upload failed: ${error.message}`, 'error');
    return; 
  }
  
  document.getElementById('blog-featured-image').value = publicUrl;
  preview.innerHTML = `<img src="${publicUrl}">`;
  showToast('Blog image uploaded.');
}

async function saveBlogData() {
  const btn = document.getElementById('save-blog-btn');
  const title = (document.getElementById('blog-title')?.value || '').trim();
  if (!title) {
    showToast('Please enter an article title.', 'error');
    return;
  }

  btn.textContent = 'Saving Article...';
  btn.disabled = true;
  
  const contentElem = document.getElementById('blog-content');
  const contentHtml = contentElem ? contentElem.value : '';
  const plainText = contentHtml.replace(/<[^>]*>?/gm, '').replace(/&[a-z]+;/g, ' ').trim();
  const excerpt = plainText.length > 160 ? plainText.substring(0, 160) + '...' : plainText;

  const blog = {
    id: document.getElementById('blog-id')?.value || undefined,
    title: title,
    slug: document.getElementById('blog-slug')?.value.trim() || title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
    status: document.getElementById('blog-status')?.value || 'Published',
    author: document.getElementById('blog-author')?.value.trim() || 'SSN Elite Science Team',
    category: document.getElementById('blog-category')?.value.trim() || 'Nutrition Science',
    seo_title: document.getElementById('blog-seo-title')?.value.trim() || title,
    seo_description: document.getElementById('blog-seo-desc')?.value.trim() || excerpt,
    featured_image: document.getElementById('blog-featured-image')?.value.trim() || '',
    content: contentHtml,
    excerpt: excerpt,
    publish_date: new Date().toISOString().split('T')[0]
  };

  try {
    const { error } = await saveBlog(blog);
    if (error) { 
      showToast(`Error saving blog: ${error.message}`, 'error'); 
    } else {
      showToast('Blog article saved successfully!');
      await loadDashboardData();
      switchTab('blogs');
    }
  } catch (err) {
    showToast(`Save error: ${err.message}`, 'error');
  } finally {
    btn.textContent = 'Save Article';
    btn.disabled = false;
  }
}

async function handleToggleBlogStatus(id) {
  const b = allBlogs.find(x => x.id === id);
  if (!b) return;
  const newStatus = (b.status || 'Published').toLowerCase() === 'published' ? 'Draft' : 'Published';
  
  try {
    const { error } = await saveBlog({ id: b.id, title: b.title, status: newStatus });
    if (error) showToast(`Error updating status: ${error.message}`, 'error');
    else {
      showToast(`Article set to ${newStatus}.`);
      await loadDashboardData();
    }
  } catch (e) {
    showToast(`Update error: ${e.message}`, 'error');
  }
}

async function handleDeleteBlog(id, title) {
  if (!confirm(`Are you sure you want to delete "${title}"?`)) {
    return;
  }

  try {
    const { error } = await deleteBlog(id);
    if (error) {
      showToast(`Error deleting blog: ${error.message}`, 'error');
    } else {
      showToast('Article deleted.');
      await loadDashboardData();
    }
  } catch (err) {
    showToast(`Delete error: ${err.message}`, 'error');
  }
}


/* ══════════════════════════════════════════════
   3. LAB REPORTS MANAGEMENT
   ══════════════════════════════════════════════ */

function renderLabReportsTable() {
  const container = document.getElementById('labreports-table-container');
  if (!container) return;

  populateLabProductDropdown();

  if (allLabReports.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding: 48px 16px; color:#637381;">
        <p style="font-size:15px; margin-bottom:12px;">No lab reports found in database.</p>
        <button class="admin-btn admin-btn-primary" onclick="openLabReportEditor()">+ Upload First Lab Report</button>
      </div>
    `;
    return;
  }
  
  let html = `<div class="admin-table-wrap"><table class="admin-table">
    <thead><tr><th>Batch No</th><th>Product</th><th>Lab Name</th><th>Test Date</th><th>Certificate</th><th>Actions</th></tr></thead><tbody>`;
  
  allLabReports.forEach(r => {
    const certUrl = r.certificate_url || (Array.isArray(r.report_images) && r.report_images.length > 0 ? r.report_images[0] : '');

    html += `<tr>
      <td style="font-family:monospace; font-weight:600;">${esc(r.batch_number)}</td>
      <td>${esc(r.product_name)}</td>
      <td>${esc(r.lab_name)}</td>
      <td>${esc(r.test_date)}</td>
      <td>${certUrl ? `<a href="${certUrl}" target="_blank" style="color:#008060; font-weight:600; font-size:12px;">PDF File</a>` : `<span style="color:#8c9196; font-size:12px;">No PDF</span>`}</td>
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
  allProducts.forEach(p => { if (p.name || p.title) names.add(p.name || p.title); });
  
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
    
    const certUrl = r.certificate_url || (Array.isArray(r.report_images) && r.report_images.length > 0 ? r.report_images[0] : '');
    if (certInput) certInput.value = certUrl || '';
    
    if (preview) {
      preview.innerHTML = certUrl 
        ? `<div style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 16px; background:#f4f6f8; border:1px solid #dfe3e8; border-radius:6px;">
            <div style="display:flex; align-items:center; gap:8px;">
              <span style="font-size:20px;">📄</span>
              <div>
                <a href="${certUrl}" target="_blank" style="color:#008060; font-weight:600; font-size:13px; text-decoration:none;">View Uploaded PDF Certificate</a>
                <div style="font-size:11px; color:#637381;">Saved securely in Supabase storage</div>
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
    document.getElementById('lr-lab').value = 'SGS Analytical Labs (ISO/IEC 17025 Certified)';
    document.getElementById('lr-date').value = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (certInput) certInput.value = '';
    if (preview) preview.innerHTML = '';
    document.getElementById('lab-editor-title').textContent = 'Upload Lab Report';
  }
  switchTab('lab-editor');
}

async function handleLabReportPdfUpload(input) {
  if (!input.files || input.files.length === 0) return;
  const file = input.files[0];
  
  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
    showToast('Please select a valid PDF file (.pdf only).', 'error');
    return;
  }

  const preview = document.getElementById('lr-pdf-preview');
  if (preview) {
    preview.innerHTML = '<p style="color:#637381; font-size:13px; padding:8px 0;">Uploading PDF certificate to storage...</p>';
  }
  
  const { publicUrl, error } = await uploadFileToStorage('lab-reports', file);
  if (error) {
    if (preview) preview.innerHTML = `<p style="color:#d82c0d; font-size:13px;">Upload failed: ${error.message}</p>`;
    showToast(`Upload error: ${error.message}`, 'error');
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
  showToast('PDF uploaded successfully.');
}

async function saveLabReportData() {
  const btn = document.getElementById('save-lr-btn');
  const batchNumber = (document.getElementById('lr-batch')?.value || '').trim();
  const productName = (document.getElementById('lr-product')?.value || '').trim();

  if (!batchNumber || !productName) {
    showToast('Please enter both Product Name and Batch Number.', 'error');
    return;
  }

  btn.textContent = 'Saving Certificate...';
  btn.disabled = true;
  
  const certInput = document.getElementById('lr-certificate-url');
  const certUrl = certInput ? certInput.value.trim() : '';

  const report = {
    id: document.getElementById('lr-id')?.value || undefined,
    batch_number: batchNumber,
    product_name: productName,
    lab_name: document.getElementById('lr-lab')?.value.trim() || 'ISO/IEC 17025 Accredited Laboratory',
    test_date: document.getElementById('lr-date')?.value.trim() || new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
    certificate_url: certUrl,
    report_images: certUrl ? [certUrl] : [],
    parameters: [],
    status: 'VERIFIED'
  };

  try {
    const res = await saveLabReport(report);
    if (res && res.error) {
      showToast(`Error saving lab report: ${res.error.message}`, 'error');
    } else {
      showToast('Lab report certificate saved!');
      await loadDashboardData();
      switchTab('labreports');
    }
  } catch (err) {
    showToast(`Save error: ${err.message}`, 'error');
  } finally {
    btn.textContent = 'Save Certificate';
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
      showToast(`Error deleting lab report: ${error.message}`, 'error');
    } else {
      showToast('Lab report deleted.');
      await loadDashboardData();
    }
  } catch (err) {
    showToast(`Delete error: ${err.message}`, 'error');
  }
}


/* ══════════════════════════════════════════════
   4. CUSTOMER ENQUIRIES
   ══════════════════════════════════════════════ */

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
      showToast(`Error deleting submission: ${error.message}`, 'error');
    } else {
      showToast('Enquiry deleted.');
      await loadDashboardData();
    }
  } catch (err) {
    showToast(`Delete error: ${err.message}`, 'error');
  }
}


/* ══════════════════════════════════════════════
   5. GLOBAL SITE SETTINGS (SOCIAL LINKS)
   ══════════════════════════════════════════════ */

async function loadSocialSettings() {
  const igEnabled = document.getElementById('setting-ig-enabled');
  const igUrl = document.getElementById('setting-ig-url');
  const fbEnabled = document.getElementById('setting-fb-enabled');
  const fbUrl = document.getElementById('setting-fb-url');
  const liEnabled = document.getElementById('setting-li-enabled');
  const liUrl = document.getElementById('setting-li-url');

  if (!igEnabled || !igUrl) return;

  try {
    const res = typeof getSiteSettings === 'function' ? await getSiteSettings() : null;
    const settings = (res && res.data) ? res.data : (window.SSN_CONFIG?.social || {});

    if (settings.instagram) {
      igEnabled.checked = settings.instagram.enabled !== false;
      igUrl.value = settings.instagram.url || '';
    }
    if (settings.facebook) {
      fbEnabled.checked = settings.facebook.enabled !== false;
      fbUrl.value = settings.facebook.url || '';
    }
    if (settings.linkedin) {
      liEnabled.checked = settings.linkedin.enabled !== false;
      liUrl.value = settings.linkedin.url || '';
    }
  } catch (err) {
    console.error('[SSN Admin] Error loading social settings:', err);
  }
}

async function saveSocialSettingsData() {
  const btn = document.getElementById('save-settings-btn');
  if (btn) {
    btn.textContent = 'Saving Settings...';
    btn.disabled = true;
  }

  const settings = {
    instagram: {
      enabled: document.getElementById('setting-ig-enabled')?.checked ?? true,
      url: document.getElementById('setting-ig-url')?.value.trim() || ''
    },
    facebook: {
      enabled: document.getElementById('setting-fb-enabled')?.checked ?? true,
      url: document.getElementById('setting-fb-url')?.value.trim() || ''
    },
    linkedin: {
      enabled: document.getElementById('setting-li-enabled')?.checked ?? true,
      url: document.getElementById('setting-li-url')?.value.trim() || ''
    }
  };

  try {
    const res = typeof saveSiteSettings === 'function' ? await saveSiteSettings(settings) : { error: null };
    if (res && res.error) {
      showToast(`Error saving settings: ${res.error.message}`, 'error');
    } else {
      showToast('Brand social settings saved successfully!');
      if (window.SSN_CONFIG && typeof window.SSN_CONFIG.renderFooterSocialAndCredit === 'function') {
        window.SSN_CONFIG.renderFooterSocialAndCredit();
      }
    }
  } catch (err) {
    showToast(`Save error: ${err.message}`, 'error');
  } finally {
    if (btn) {
      btn.textContent = 'Save Settings';
      btn.disabled = false;
    }
  }
}

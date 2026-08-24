/* ============================================
   SSN ELITE — Central Public Site Configuration
   Single source of truth for all public brand details,
   navigation, social settings, and developer credit.
   ============================================ */

window.SSN_CONFIG = {
  brandName: 'SSN ELITE',
  tagline: 'Performance Nutrition, Engineered with Purpose',
  companyName: 'SSN Elite Nutrition Inc.',
  contact: Object.freeze({
    email: 'hr@esninternational.com',
    phone: '+91 97690 92673',
    phoneRaw: '+919769092673',
    whatsapp: '+91 97690 92673',
    whatsappRaw: '+919769092673',
    address: 'Parmeshwar Industrial Estate, 401 - 404, Off New Link Rd, next to Grand Hometel Hotel, Malad, Ram Nagar, Malad West, Mumbai, Maharashtra 400064',
    hours: 'Monday – Saturday: 09:00 – 18:00 IST'
  }),
  social: {
    instagram: { enabled: true, url: 'https://www.instagram.com/ssnindiaelite/' },
    facebook: { enabled: true, url: 'https://facebook.com/ssnelite' },
    linkedin: { enabled: true, url: 'https://linkedin.com/company/ssnelite' }
  },
  developerCredit: Object.freeze({
    label: 'Developed & Managed by',
    handle: '@buildwithmeeett',
    url: 'https://www.instagram.com/buildwithmeeett?igsi=MWs5YmVqcHJqOG83Mw=='
  }),
  supabase: Object.freeze({
    url: 'https://pnxnwtrozxxqoofxutci.supabase.co',
    anonKey: 'sb_publishable_QH1WF8LiQIxdNbOym0oCIw_gDZn28x0'
  })
};

/**
 * Returns current social media settings from localStorage cache or defaults.
 */
SSN_CONFIG.getSocialSettings = function() {
  try {
    const cached = localStorage.getItem('ssn_social_settings');
    if (cached) {
      const parsed = JSON.parse(cached);
      return {
        instagram: { enabled: parsed.instagram?.enabled !== false, url: parsed.instagram?.url || '' },
        facebook: { enabled: parsed.facebook?.enabled !== false, url: parsed.facebook?.url || '' },
        linkedin: { enabled: parsed.linkedin?.enabled !== false, url: parsed.linkedin?.url || '' }
      };
    }
  } catch (e) {}
  return SSN_CONFIG.social;
};

/**
 * Validate that a URL is safe (http/https only)
 */
SSN_CONFIG.isSafeUrl = function(url) {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim().toLowerCase();
  return trimmed.startsWith('https://') || trimmed.startsWith('http://');
};

/**
 * Ensures a consistent, static header is rendered on every public page.
 */
SSN_CONFIG.unifyHeader = function() {
  const currentPath = window.location.pathname.toLowerCase();
  if (currentPath.includes('admin') || document.body.classList.contains('admin-body') || document.getElementById('admin-sidebar')) {
    return; // NEVER inject public header into admin pages
  }
  const currentHash = window.location.hash.toLowerCase();

  const isHome = currentPath.endsWith('index.html') || currentPath === '/' || currentPath.endsWith('/ssn/') || currentPath.endsWith('/ssn');
  const isProducts = currentPath.includes('product') || currentPath.includes('whey') || currentPath.includes('mass') || currentPath.includes('creatine') || currentPath.includes('eaa');
  const isLab = currentPath.includes('lab-report');
  const isBlog = currentPath.includes('blog');
  const isAbout = currentPath.includes('about');
  const isContact = currentPath.includes('contact');

  // Unified Nav HTML
  const navContainer = document.getElementById('main-nav');
  if (navContainer) {
    navContainer.innerHTML = `
      <a href="index.html" class="nav-brand" aria-label="SSN Elite Home">
        <img src="assets/images/logo.webp" alt="SSN ELITE" class="nav-logo" width="160" height="40">
      </a>
      <div class="nav-links">
        <a href="products.html" class="nav-link ${isProducts ? 'active' : ''}">Products</a>
        <a href="index.html#shop-by-goal" class="nav-link">Shop By Goal</a>
        <a href="lab-reports.html" class="nav-link ${isLab ? 'active' : ''}">Lab Reports</a>
        <a href="blog.html" class="nav-link ${isBlog ? 'active' : ''}">Journal</a>
        <a href="about.html" class="nav-link ${isAbout ? 'active' : ''}">About</a>
        <a href="contact.html" class="nav-link ${isContact ? 'active' : ''}">Contact</a>
      </div>
      <button class="nav-hamburger" id="nav-hamburger" aria-label="Toggle navigation menu" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>
    `;
  }

  // Unified Mobile Menu
  let mobileMenu = document.getElementById('nav-mobile-menu');
  if (!mobileMenu) {
    mobileMenu = document.createElement('div');
    mobileMenu.id = 'nav-mobile-menu';
    mobileMenu.className = 'nav-mobile-menu';
    mobileMenu.setAttribute('aria-hidden', 'true');
    document.body.appendChild(mobileMenu);
  }

  mobileMenu.innerHTML = `
    <div class="nav-mobile-logo-wrap">
      <img src="assets/images/logo.webp" alt="SSN ELITE" class="mobile-logo" width="140" height="35">
    </div>
    <a href="index.html" class="nav-mobile-link ${isHome && !isProducts ? 'active' : ''}">Home</a>
    <a href="products.html" class="nav-mobile-link ${isProducts ? 'active' : ''}">Products</a>
    <a href="index.html#shop-by-goal" class="nav-mobile-link">Shop By Goal</a>
    <a href="lab-reports.html" class="nav-mobile-link ${isLab ? 'active' : ''}">Lab Reports</a>
    <a href="blog.html" class="nav-mobile-link ${isBlog ? 'active' : ''}">Journal</a>
    <a href="about.html" class="nav-mobile-link ${isAbout ? 'active' : ''}">About</a>
    <a href="contact.html" class="nav-mobile-link ${isContact ? 'active' : ''}">Contact</a>
  `;

  // Bind Hamburger Toggle
  const hamburger = document.getElementById('nav-hamburger');
  if (hamburger) {
    hamburger.onclick = function(e) {
      e.stopPropagation();
      const isOpen = hamburger.classList.toggle('active');
      mobileMenu.classList.toggle('active', isOpen);
      hamburger.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
      mobileMenu.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
      document.body.style.overflow = isOpen ? 'hidden' : '';
    };

    // Close on link click
    mobileMenu.querySelectorAll('.nav-mobile-link').forEach(link => {
      link.onclick = function() {
        hamburger.classList.remove('active');
        mobileMenu.classList.remove('active');
        hamburger.setAttribute('aria-expanded', 'false');
        mobileMenu.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      };
    });
  }
};

/**
 * Renders global brand social links and developer credit in the footer.
 */
SSN_CONFIG.renderFooterSocialAndCredit = function() {
  const socialSettings = SSN_CONFIG.getSocialSettings();

  // 1. Render Official SSN Brand Social Links
  const brandCol = document.querySelector('.footer-grid > div:first-child');
  if (brandCol) {
    let socialContainer = brandCol.querySelector('.footer-social-links');
    if (!socialContainer) {
      socialContainer = document.createElement('div');
      socialContainer.className = 'footer-social-links';
      socialContainer.style.display = 'flex';
      socialContainer.style.gap = '12px';
      socialContainer.style.marginTop = '16px';
      brandCol.appendChild(socialContainer);
    }

    const items = [];

    // Instagram (SSN Brand)
    if (socialSettings.instagram && socialSettings.instagram.enabled && SSN_CONFIG.isSafeUrl(socialSettings.instagram.url)) {
      items.push(`
        <a href="${socialSettings.instagram.url.trim()}" target="_blank" rel="noopener noreferrer" class="footer-social-link" aria-label="SSN Elite on Instagram" title="SSN Elite Instagram">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
        </a>
      `);
    }

    // Facebook (SSN Brand)
    if (socialSettings.facebook && socialSettings.facebook.enabled && SSN_CONFIG.isSafeUrl(socialSettings.facebook.url)) {
      items.push(`
        <a href="${socialSettings.facebook.url.trim()}" target="_blank" rel="noopener noreferrer" class="footer-social-link" aria-label="SSN Elite on Facebook" title="SSN Elite Facebook">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
        </a>
      `);
    }

    // LinkedIn (SSN Brand)
    if (socialSettings.linkedin && socialSettings.linkedin.enabled && SSN_CONFIG.isSafeUrl(socialSettings.linkedin.url)) {
      items.push(`
        <a href="${socialSettings.linkedin.url.trim()}" target="_blank" rel="noopener noreferrer" class="footer-social-link" aria-label="SSN Elite on LinkedIn" title="SSN Elite LinkedIn">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
        </a>
      `);
    }

    socialContainer.innerHTML = items.join('');
    socialContainer.style.display = items.length > 0 ? 'flex' : 'none';
  }

  // 2. Render Developer Credit at the absolute bottom of every footer
  const footerBottom = document.querySelector('.footer-bottom');
  if (footerBottom) {
    let devCredit = footerBottom.querySelector('.footer-dev-credit');
    if (!devCredit) {
      devCredit = document.createElement('div');
      devCredit.className = 'footer-dev-credit';
      footerBottom.appendChild(devCredit);
    }

    devCredit.innerHTML = `
      <span>${SSN_CONFIG.developerCredit.label}</span>
      <a href="${SSN_CONFIG.developerCredit.url}" target="_blank" rel="noopener noreferrer" class="dev-credit-link" aria-label="Developer Profile (${SSN_CONFIG.developerCredit.handle})" style="display:inline-flex; align-items:center; gap:6px; color:var(--text-primary); text-decoration:none; font-weight:600; margin-left:4px;">
        <svg class="dev-credit-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
          <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
          <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
        </svg>
        ${SSN_CONFIG.developerCredit.handle}
      </a>
    `;
  }
};

/**
 * Injects centralized values and sets up header & footer
 */
SSN_CONFIG.injectConfig = function() {
  const currentPath = window.location.pathname.toLowerCase();
  if (currentPath.includes('admin') || document.body.classList.contains('admin-body') || document.getElementById('admin-sidebar')) {
    return; // NEVER inject public header or footer into admin panel
  }

  SSN_CONFIG.unifyHeader();
  SSN_CONFIG.renderFooterSocialAndCredit();

  // Async sync with Supabase
  if (typeof getSiteSettings === 'function') {
    getSiteSettings().then(({ data }) => {
      if (data) {
        SSN_CONFIG.renderFooterSocialAndCredit();
      }
    }).catch(() => {});
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => SSN_CONFIG.injectConfig());
} else {
  SSN_CONFIG.injectConfig();
}

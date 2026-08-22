/* ============================================
   SSN ELITE — Central Public Site Configuration
   Single source of truth for all public brand details.
   ============================================ */

const SSN_CONFIG = {
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
  social: Object.freeze({
    instagram: 'https://instagram.com/ssnelite',
    twitter: 'https://twitter.com/ssnelite',
    linkedin: 'https://linkedin.com/company/ssnelite'
  }),
  mrp: Object.freeze({
    performanceWhey: '₹10,499',
    anabolicMonsterMass: '₹6,999',
    triCreatine: '₹2,499',
    eaaBcaaGlutamine: '₹2,799'
  }),
  /* ── Supabase Backend Configuration ──
     Replace these with your Supabase project credentials.
     SUPABASE_URL: Your project URL (e.g., https://xxxx.supabase.co)
     SUPABASE_ANON_KEY: Your project anon/public key */
  supabase: Object.freeze({
    url: '',
    anonKey: ''
  })
};

/**
 * Automatically injects centralized configuration values into HTML DOM elements.
 * Usage in HTML:
 *   <span data-config="contact.email"></span>
 *   <a data-config-href="contact.email" data-config-href-prefix="mailto:">Email Us</a>
 *   <a data-config-href="contact.phoneRaw" data-config-href-prefix="tel:">Call Us</a>
 */
SSN_CONFIG.injectConfig = function() {
  const getNestedValue = (obj, path) => {
    return path.split('.').reduce((prev, curr) => (prev && prev[curr] !== undefined ? prev[curr] : undefined), obj);
  };

  // Inject text content
  document.querySelectorAll('[data-config]').forEach(el => {
    const key = el.getAttribute('data-config');
    const val = getNestedValue(SSN_CONFIG, key);
    if (val !== undefined) {
      el.textContent = val;
    }
  });

  // Inject href links (mailto:, tel:, https:)
  document.querySelectorAll('[data-config-href]').forEach(el => {
    const key = el.getAttribute('data-config-href');
    const prefix = el.getAttribute('data-config-href-prefix') || '';
    const val = getNestedValue(SSN_CONFIG, key);
    if (val !== undefined) {
      el.href = prefix + val;
    }
  });
};

// Auto-run injection when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => SSN_CONFIG.injectConfig());
} else {
  SSN_CONFIG.injectConfig();
}

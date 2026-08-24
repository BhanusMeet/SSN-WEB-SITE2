/* ============================================
   SSN ELITE — Main JavaScript
   Navigation, scroll animations, shared interactions
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  const isExcluded = window.location.pathname.toLowerCase().includes('admin') || 
                     document.body.classList.contains('admin-body') || 
                     document.getElementById('admin-sidebar');
  if (isExcluded) return;

  initNavigation();
  initScrollReveal();
  initSmoothScroll();
  initConnectModal();
});

/* ── Navigation ── */
function initNavigation() {
  const nav = document.querySelector('.nav');
  const hamburger = document.querySelector('.nav-hamburger');
  const mobileMenu = document.querySelector('.nav-mobile-menu');
  const mobileLinks = document.querySelectorAll('.nav-mobile-link');

  // Scroll behavior — add shadow on scroll with rAF throttling
  if (nav) {
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          if (window.pageYOffset > 20) {
            nav.classList.add('scrolled');
          } else {
            nav.classList.remove('scrolled');
          }
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  // Mobile hamburger toggle
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      mobileMenu.classList.toggle('open');
      document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
    });

    // Close on link click
    mobileLinks.forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
      });
    });

    // Close on Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && mobileMenu.classList.contains('open')) {
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
      }
    });
  }
}

/* ── Scroll Reveal ── */
function initScrollReveal() {
  const revealElements = document.querySelectorAll('.reveal, .fade-in, .scale-in, .slide-left, .slide-right');

  if (revealElements.length === 0) return;

  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    revealElements.forEach(el => el.classList.add('revealed'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -60px 0px'
  });

  revealElements.forEach(el => observer.observe(el));
}

/* ── Smooth Scroll for Anchor Links ── */
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;

      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        const navHeight = document.querySelector('.nav')?.offsetHeight || 72;
        const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - navHeight - 20;

        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
}

/* ── Global Connect Modal ── */
function initConnectModal() {
  // Don't inject if it's the admin page
  if (window.location.pathname.includes('admin.html')) return;

  const modalHtml = `
    <style>
      .connect-fab {
        position: fixed;
        bottom: var(--space-8, 32px);
        right: var(--space-8, 32px);
        background: var(--ssn-blue, #0A2FFF);
        color: #fff;
        padding: 12px 24px;
        border-radius: 50px;
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 14px;
        font-weight: 600;
        letter-spacing: 1px;
        cursor: pointer;
        box-shadow: 0 10px 25px rgba(10, 47, 255, 0.4);
        z-index: 9999;
        transition: transform 0.3s ease, box-shadow 0.3s ease;
      }
      .connect-fab:hover {
        transform: translateY(-3px);
        box-shadow: 0 15px 35px rgba(10, 47, 255, 0.5);
      }
      .connect-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
      }
      .connect-modal.open {
        opacity: 1;
        pointer-events: all;
      }
      .connect-modal-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(5, 7, 18, 0.8);
        backdrop-filter: blur(10px);
      }
      .connect-modal-content {
        position: relative;
        width: 90%;
        max-width: 400px;
        background: #ffffff;
        border-radius: 16px;
        padding: 32px;
        box-shadow: 0 25px 50px rgba(0,0,0,0.5);
        transform: translateY(20px) scale(0.95);
        transition: transform 0.3s ease;
      }
      .connect-modal.open .connect-modal-content {
        transform: translateY(0) scale(1);
      }
      .connect-modal-close {
        position: absolute;
        top: 16px;
        right: 16px;
        background: none;
        border: none;
        font-size: 24px;
        color: #666;
        cursor: pointer;
      }
      .connect-modal-title {
        font-size: 24px;
        font-weight: 700;
        margin-bottom: 8px;
        color: #111;
      }
      .connect-modal-desc {
        font-size: 14px;
        color: #666;
        margin-bottom: 24px;
        line-height: 1.6;
      }
      .connect-modal-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
      .connect-modal-form input,
      .connect-modal-form textarea {
        width: 100%;
        background: #f7f7f8;
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 12px 16px;
        font-size: 14px;
        color: #111;
      }
      .connect-modal-form .cta-button {
        margin-top: 8px;
        justify-content: center;
        width: 100%;
      }
    </style>

    <div class="connect-fab" id="connectFab">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
      </svg>
      <span>Connect Now</span>
    </div>

    <div class="connect-modal" id="connectModal">
      <div class="connect-modal-backdrop" id="connectModalBackdrop"></div>
      <div class="connect-modal-content">
        <button class="connect-modal-close" id="connectModalClose">&times;</button>
        <h3 class="connect-modal-title">Connect With Us</h3>
        <p class="connect-modal-desc">Have a question? Send us a message and we'll get back to you shortly.</p>
        <form id="global-connect-form" class="connect-now-form" style="display: flex; flex-direction: column; gap: 16px;">
          <input type="text" name="full_name" placeholder="Full Name *" required style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #ddd;">
          <input type="email" name="email" placeholder="Email Address *" required style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #ddd;">
          <input type="tel" name="phone" placeholder="Phone Number *" required style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #ddd;">
          <input type="text" name="address" placeholder="Address *" required style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #ddd;">
          <textarea name="message" placeholder="Message (Optional)" rows="3" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid #ddd;"></textarea>
          <button type="submit" id="global-connect-btn" class="cta-button" style="width: 100%; justify-content: center; margin-top: 8px;">Submit Inquiry</button>
          <div id="global-connect-status" style="display:none; font-size: 14px; text-align: center; margin-top: 10px;"></div>
        </form>
      </div>
    </div>
  `;

  // Ensure Supabase is loaded for the form
  if (typeof saveUserSubmission !== 'function') {
    const supabaseCdn = document.createElement('script');
    supabaseCdn.src = 'https://unpkg.com/@supabase/supabase-js@2';
    document.head.appendChild(supabaseCdn);

    supabaseCdn.onload = () => {
      const supabaseClientScript = document.createElement('script');
      supabaseClientScript.src = 'js/supabaseClient.js';
      document.head.appendChild(supabaseClientScript);
    };
  }

  document.body.insertAdjacentHTML('beforeend', modalHtml);

  const connectFab = document.getElementById('connectFab');
  const connectModal = document.getElementById('connectModal');
  const connectModalClose = document.getElementById('connectModalClose');
  const connectModalBackdrop = document.getElementById('connectModalBackdrop');
  const connectForm = document.getElementById('global-connect-form');

  if (connectFab && connectModal) {
    connectFab.addEventListener('click', () => connectModal.classList.add('open'));
    connectModalClose.addEventListener('click', () => connectModal.classList.remove('open'));
    connectModalBackdrop.addEventListener('click', () => connectModal.classList.remove('open'));
  }

  if (connectForm) {
    connectForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const form = e.target;
      const btn = document.getElementById('global-connect-btn');
      const status = document.getElementById('global-connect-status');
      
      btn.disabled = true;
      btn.textContent = 'Submitting...';

      const formData = {
        full_name: form.full_name.value.trim().substring(0, 200),
        email: form.email.value.trim().substring(0, 254),
        phone: form.phone.value.trim().substring(0, 20),
        address: form.address.value.trim().substring(0, 500),
        message: (form.message.value.trim() || null)?.substring(0, 2000) || null
      };

      // Input validation
      if (formData.full_name.length < 2) {
        status.style.display = 'block';
        status.style.color = '#e11d48';
        status.textContent = 'Please enter a valid name.';
        btn.disabled = false;
        btn.textContent = 'Submit Inquiry';
        return;
      }

      console.log('[SSN] Connect Now form submitted with data:', { name: formData.full_name, email: formData.email, phone: formData.phone });

      // Client-side spam throttle
      const now = Date.now();
      const submissions = JSON.parse(sessionStorage.getItem('ssn_form_submissions') || '[]');
      const recentSubmissions = submissions.filter(t => now - t < 60000);
      if (recentSubmissions.length >= 20) {
        status.style.display = 'block';
        status.style.color = '#e11d48';
        status.textContent = 'Too many submissions. Please wait a moment.';
        btn.disabled = false;
        btn.textContent = 'Submit Inquiry';
        return;
      }

      try {
        const result = typeof saveUserSubmission === 'function' 
          ? await saveUserSubmission(formData) 
          : { error: { message: 'Database script missing.' } };
          
        if (result.error) {
          status.style.display = 'block';
          status.style.color = '#e11d48';
          status.textContent = 'Error saving submission. Please try again.';
        } else {
          // Track submission for rate limiting
          recentSubmissions.push(Date.now());
          sessionStorage.setItem('ssn_form_submissions', JSON.stringify(recentSubmissions));
          status.style.display = 'block';
          status.style.color = '#10b981';
          status.textContent = 'Message Sent Successfully!';
          form.reset();
          setTimeout(() => { 
            connectModal.classList.remove('open'); 
            status.style.display = 'none'; 
          }, 2000);
        }
      } catch (err) {
        status.style.display = 'block';
        status.style.color = '#e11d48';
        status.textContent = 'Network error. Please try again.';
      }

      btn.disabled = false;
      btn.textContent = 'Submit Inquiry';
    });
  }
}

/* ============================================
   SSN ELITE — Dynamic Blog Journal System
   Strictly synchronized with Supabase Database.
   ============================================ */

let SSN_REMOTE_BLOG_POSTS = [];

/**
 * Sanitize HTML content to prevent XSS.
 * Strips dangerous tags and event handler attributes from admin-authored blog HTML.
 */
function sanitizeBlogHtml(html) {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  // Remove dangerous elements
  const dangerousTags = ['script', 'iframe', 'object', 'embed', 'form', 'input', 'textarea', 'select', 'button', 'link', 'meta', 'base', 'applet'];
  dangerousTags.forEach(tag => {
    doc.querySelectorAll(tag).forEach(el => el.remove());
  });
  // Remove all event handler attributes (onclick, onerror, onload, etc.)
  doc.querySelectorAll('*').forEach(el => {
    [...el.attributes].forEach(attr => {
      if (attr.name.startsWith('on') || attr.name === 'srcdoc') {
        el.removeAttribute(attr.name);
      }
      // Strip javascript: URLs
      if (['href', 'src', 'action', 'formaction', 'data', 'poster', 'background'].includes(attr.name)) {
        const val = (attr.value || '').trim().toLowerCase();
        if (val.startsWith('javascript:') || val.startsWith('vbscript:') || val.startsWith('data:text/html')) {
          el.removeAttribute(attr.name);
        }
      }
    });
  });
  return doc.body.innerHTML;
}

/**
 * Escape HTML entities for safe text rendering (non-HTML contexts).
 */
function escBlogText(str) {
  if (str === null || str === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

async function loadBlogPosts() {
  if (typeof getBlogs === 'function') {
    try {
      const result = await getBlogs();
      const raw = (result && result.data) || (Array.isArray(result) ? result : []);
      if (raw && Array.isArray(raw)) {
        SSN_REMOTE_BLOG_POSTS = raw
          .filter(b => (b.status || 'Published').toLowerCase() !== 'draft')
          .map(b => ({
            id: b.id,
            slug: b.slug || b.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
            title: b.title,
            excerpt: b.excerpt || (b.content ? b.content.replace(/<[^>]*>?/gm, '').substring(0, 150) + '...' : ''),
            content: b.content,
            author: b.author || 'SSN Elite Science Team',
            date: b.publish_date || (b.created_at ? b.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
            category: b.category || 'Nutrition Science',
            readTime: b.read_time || '5 min read',
            gradient: b.gradient || 'linear-gradient(135deg, #0A2FFF 0%, #061B99 100%)',
            seoTitle: b.seo_title || b.title,
            seoDesc: b.seo_description || b.excerpt,
            featuredImage: b.featured_image || ''
          }));
      } else {
        SSN_REMOTE_BLOG_POSTS = [];
      }
    } catch (error) {
      console.warn('[SSN Blog] Error loading blogs from DB:', error);
      SSN_REMOTE_BLOG_POSTS = [];
    }
  } else {
    SSN_REMOTE_BLOG_POSTS = [];
  }
  return SSN_REMOTE_BLOG_POSTS;
}

function getCombinedBlogPosts() {
  return SSN_REMOTE_BLOG_POSTS || [];
}

/**
 * Render Latest Blog Cards on Homepage
 */
function renderHomepageBlog(containerId = 'homepage-blog-grid', count = 3) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const allPosts = getCombinedBlogPosts();
  const posts = allPosts.slice(0, count);

  if (posts.length === 0) {
    container.innerHTML = '<p class="mono" style="grid-column: 1/-1; text-align: center; color: var(--text-tertiary); padding: 32px 0;">No articles published yet.</p>';
    return;
  }

  container.innerHTML = posts.map(post => `
    <article class="blog-card reveal revealed">
      <div class="blog-card-thumb" style="background: ${escBlogText(post.gradient || 'linear-gradient(135deg, #0A2FFF 0%, #061B99 100%)')}; position: relative; overflow: hidden;">
        ${post.featuredImage ? `<img src="${escBlogText(post.featuredImage)}" alt="${escBlogText(post.title)}" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;">` : ''}
        <div class="blog-card-thumb-content" style="position:relative; z-index:2;">
          <span class="blog-category-tag">${escBlogText(post.category)}</span>
          <span class="blog-card-mono-code">${escBlogText(post.readTime)}</span>
        </div>
      </div>
      <div class="blog-card-content">
        <div class="blog-card-meta">
          <span class="blog-date">${escBlogText(post.date)}</span>
          <span class="meta-sep">•</span>
          <span class="blog-author">${escBlogText(post.author)}</span>
        </div>
        <h3 class="blog-card-title">
          <a href="blog.html#${escBlogText(post.slug)}" onclick="handleBlogClick(event, '${escBlogText(post.slug)}')">${escBlogText(post.title)}</a>
        </h3>
        <p class="blog-card-excerpt">${escBlogText(post.excerpt)}</p>
        <a href="blog.html#${escBlogText(post.slug)}" class="text-link blog-read-more" onclick="handleBlogClick(event, '${escBlogText(post.slug)}')">
          Read Article
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </a>
      </div>
    </article>
  `).join('');
}

/**
 * Render Full Blog Grid on /blog page
 */
function renderBlogGrid(containerId = 'blog-page-grid', activeCategory = 'ALL') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const allPosts = getCombinedBlogPosts();
  const filteredPosts = activeCategory === 'ALL' 
    ? allPosts 
    : allPosts.filter(p => p.category.toLowerCase() === activeCategory.toLowerCase());

  if (filteredPosts.length === 0) {
    container.innerHTML = '<p class="mono" style="grid-column: 1/-1; text-align: center; color: var(--text-tertiary); padding: 48px 0; font-size: 16px;">No articles available in this category.</p>';
    return;
  }

  container.innerHTML = filteredPosts.map(post => `
    <article class="blog-card blog-card-full reveal revealed">
      <div class="blog-card-thumb" style="background: ${escBlogText(post.gradient || 'linear-gradient(135deg, #0A2FFF 0%, #061B99 100%)')}; position: relative; overflow: hidden;">
        ${post.featuredImage ? `<img src="${escBlogText(post.featuredImage)}" alt="${escBlogText(post.title)}" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;">` : ''}
        <div class="blog-card-thumb-content" style="position:relative; z-index:2;">
          <span class="blog-category-tag">${escBlogText(post.category)}</span>
          <span class="blog-card-mono-code">${escBlogText(post.readTime)}</span>
        </div>
      </div>
      <div class="blog-card-content">
        <div class="blog-card-meta">
          <span class="blog-date">${escBlogText(post.date)}</span>
          <span class="meta-sep">•</span>
          <span class="blog-author">${escBlogText(post.author)}</span>
        </div>
        <h3 class="blog-card-title">
          <a href="#${escBlogText(post.slug)}" onclick="openBlogPostModal('${escBlogText(post.id)}')">${escBlogText(post.title)}</a>
        </h3>
        <p class="blog-card-excerpt">${escBlogText(post.excerpt)}</p>
        <div class="blog-card-footer" style="margin-top: 16px;">
          <button class="cta-button-outline btn-sm" onclick="openBlogPostModal('${escBlogText(post.id)}')">
            Read Full Article
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </div>
    </article>
  `).join('');
}

function handleBlogClick(e, slug) {
  if (!window.location.pathname.includes('blog')) {
    window.location.href = `blog.html#${slug}`;
  }
}

/**
 * Open full-featured editorial article modal
 */
function openBlogPostModal(postId) {
  const allPosts = getCombinedBlogPosts();
  const post = allPosts.find(p => p.id === postId || p.slug === postId);
  if (!post) return;

  let modal = document.getElementById('blog-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'blog-modal';
    modal.className = 'blog-modal-overlay';
    modal.onclick = (e) => {
      if (e.target && e.target.classList.contains('blog-modal-overlay')) closeBlogPostModal();
    };
    document.body.appendChild(modal);
  }

  // Sanitize blog content HTML to prevent stored XSS
  const safeContent = sanitizeBlogHtml(post.content) || `<p>${escBlogText(post.excerpt || 'Article content not available.')}</p>`;
  const safeExcerpt = escBlogText(post.excerpt);

  modal.innerHTML = `
    <div class="blog-modal-content" role="dialog" aria-modal="true" onclick="event.stopPropagation()">
      <button class="blog-modal-close" onclick="closeBlogPostModal()" aria-label="Close article">&times;</button>
      
      <div class="blog-modal-banner" style="background: ${escBlogText(post.gradient || 'linear-gradient(135deg, #0A2FFF 0%, #061B99 100%)')}; position:relative; overflow:hidden;">
        ${post.featuredImage ? `<img src="${escBlogText(post.featuredImage)}" alt="${escBlogText(post.title)}" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;opacity:0.35;">` : ''}
        <div style="position:relative; z-index:2;">
          <span class="blog-category-tag">${escBlogText(post.category)}</span>
          <h2 style="margin-top: 12px;">${escBlogText(post.title)}</h2>
          <div class="blog-modal-meta" style="margin-top: 12px; font-size: 13px; opacity: 0.9;">
            <span>By ${escBlogText(post.author)}</span>
            <span class="meta-sep">•</span>
            <span>${escBlogText(post.date)}</span>
            <span class="meta-sep">•</span>
            <span>${escBlogText(post.readTime)}</span>
          </div>
        </div>
      </div>

      <div class="blog-modal-body" style="padding: 32px 28px;">
        ${safeExcerpt ? `<p class="blog-lead" style="font-size: 1.15rem; line-height: 1.6; font-weight: 500; color: var(--text-secondary); margin-bottom: 24px; border-left: 3px solid var(--ssn-blue); padding-left: 16px;">${safeExcerpt}</p>` : ''}
        <div class="blog-article-body" style="font-size: 1rem; line-height: 1.8; color: var(--text-primary);">
          ${safeContent}
        </div>
      </div>

      <div class="blog-modal-footer" style="padding: 16px 28px; background: var(--surface-off-white); border-top: 1px solid var(--border-subtle); display: flex; justify-content: flex-end;">
        <button class="cta-button-outline" onclick="closeBlogPostModal()">Close Article</button>
      </div>
    </div>
  `;

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeBlogPostModal() {
  const modal = document.getElementById('blog-modal');
  if (modal) modal.classList.remove('open');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeBlogPostModal();
});

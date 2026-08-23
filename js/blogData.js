/* ============================================
   SSN ELITE — Dynamic Blog Journal System
   Strictly synchronized with Supabase Database.
   ============================================ */

let SSN_REMOTE_BLOG_POSTS = [];

async function loadBlogPosts() {
  if (typeof getBlogs === 'function') {
    try {
      const result = await getBlogs();
      const raw = (result && result.data) || (Array.isArray(result) ? result : []);
      // Filter out drafts and map to frontend format
      if (raw && Array.isArray(raw)) {
        SSN_REMOTE_BLOG_POSTS = raw
          .filter(b => (b.status || 'Published').toLowerCase() !== 'draft')
          .map(b => ({
            id: b.id,
            slug: b.slug,
            title: b.title,
            excerpt: b.excerpt || (b.content ? b.content.replace(/<[^>]*>?/gm, '').substring(0, 150) + '...' : ''),
            content: b.content,
            author: b.author || 'SSN Elite Research Team',
            date: b.publish_date || new Date().toISOString().split('T')[0],
            category: b.category || 'Nutrition Science',
            readTime: b.read_time || '5 min read',
            gradient: b.gradient || 'linear-gradient(135deg, #0A2FFF 0%, #061B99 100%)',
            seoTitle: b.seo_title,
            seoDesc: b.seo_description,
            featuredImage: b.featured_image
          }));
      } else {
        SSN_REMOTE_BLOG_POSTS = [];
      }
    } catch (error) {
      console.warn('[SSN] Error loading blogs from DB:', error);
      SSN_REMOTE_BLOG_POSTS = [];
    }
  } else {
    SSN_REMOTE_BLOG_POSTS = [];
  }
  return SSN_REMOTE_BLOG_POSTS;
}

/**
 * Returns remote blogs from database
 */
function getCombinedBlogPosts() {
  return SSN_REMOTE_BLOG_POSTS || [];
}

/**
 * Render Latest Blog Cards on Homepage
 * @param {string} containerId - Target container element ID
 * @param {number} count - Number of posts to render
 */
function renderHomepageBlog(containerId = 'homepage-blog-grid', count = 3) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const allPosts = getCombinedBlogPosts();
  const posts = allPosts.slice(0, count);

  if (posts.length === 0) {
    container.innerHTML = '<p class="mono" style="grid-column: 1/-1; text-align: center; color: var(--text-tertiary); padding: 24px 0;">No articles available</p>';
    return;
  }

  container.innerHTML = posts.map(post => `
    <article class="blog-card reveal revealed">
      <div class="blog-card-thumb" style="background: ${post.gradient || 'linear-gradient(135deg, #0A2FFF 0%, #061B99 100%)'};">
        ${post.featuredImage ? `<img src="${post.featuredImage}" alt="${post.title}" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;">` : ''}
        <div class="blog-card-thumb-content" style="position:relative; z-index:2;">
          <span class="blog-category-tag">${post.category}</span>
          <span class="blog-card-mono-code">${post.readTime}</span>
        </div>
      </div>
      <div class="blog-card-content">
        <div class="blog-card-meta">
          <span class="blog-date">${post.date}</span>
          <span class="meta-sep">•</span>
          <span class="blog-author">${post.author}</span>
        </div>
        <h3 class="blog-card-title">
          <a href="blog.html#${post.slug}" onclick="handleBlogClick(event, '${post.slug}')">${post.title}</a>
        </h3>
        <p class="blog-card-excerpt">${post.excerpt}</p>
        <a href="blog.html#${post.slug}" class="text-link blog-read-more" onclick="handleBlogClick(event, '${post.slug}')">
          Read Article
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </a>
      </div>
    </article>
  `).join('');
}

/**
 * Render Full Blog Grid on /blog page
 * @param {string} containerId - Target container ID
 * @param {string} activeCategory - Selected category filter ('ALL' or category name)
 */
function renderBlogGrid(containerId = 'blog-page-grid', activeCategory = 'ALL') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const allPosts = getCombinedBlogPosts();
  const filteredPosts = activeCategory === 'ALL' 
    ? allPosts 
    : allPosts.filter(p => p.category.toLowerCase() === activeCategory.toLowerCase());

  if (filteredPosts.length === 0) {
    container.innerHTML = '<p class="mono" style="grid-column: 1/-1; text-align: center; color: var(--text-tertiary); padding: 48px 0; font-size: 16px;">No articles available</p>';
    return;
  }

  container.innerHTML = filteredPosts.map(post => `
    <article class="blog-card blog-card-full reveal revealed">
      <div class="blog-card-thumb" style="background: ${post.gradient || 'linear-gradient(135deg, #0A2FFF 0%, #061B99 100%)'};">
        ${post.featuredImage ? `<img src="${post.featuredImage}" alt="${post.title}" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;">` : ''}
        <div class="blog-card-thumb-content" style="position:relative; z-index:2;">
          <span class="blog-category-tag">${post.category}</span>
          <span class="blog-card-mono-code">${post.readTime}</span>
        </div>
      </div>
      <div class="blog-card-content">
        <div class="blog-card-meta">
          <span class="blog-date">${post.date}</span>
          <span class="meta-sep">•</span>
          <span class="blog-author">${post.author}</span>
        </div>
        <h3 class="blog-card-title">
          <a href="#${post.slug}" onclick="openBlogPostModal('${post.id}')">${post.title}</a>
        </h3>
        <p class="blog-card-excerpt">${post.excerpt}</p>
        <div class="blog-card-footer">
          <button class="cta-button-outline btn-sm" onclick="openBlogPostModal('${post.id}')">
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

function openBlogPostModal(postId) {
  const allPosts = getCombinedBlogPosts();
  const post = allPosts.find(p => p.id === postId || p.slug === postId);
  if (!post) return;

  let modal = document.getElementById('blog-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'blog-modal';
    modal.className = 'blog-modal-overlay';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="blog-modal-content" role="dialog" aria-modal="true">
      <button class="blog-modal-close" onclick="closeBlogPostModal()">&times;</button>
      <div class="blog-modal-banner" style="background: ${post.gradient || 'linear-gradient(135deg, #0A2FFF 0%, #061B99 100%)'}; position:relative; overflow:hidden;">
        ${post.featuredImage ? `<img src="${post.featuredImage}" alt="${post.title}" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;opacity:0.35;">` : ''}
        <div style="position:relative; z-index:2;">
          <span class="blog-category-tag">${post.category}</span>
          <h2>${post.title}</h2>
          <div class="blog-modal-meta">
            <span>${post.author}</span>
            <span>${post.date} • ${post.readTime}</span>
          </div>
        </div>
      </div>
      <div class="blog-modal-body">
        <p class="blog-lead" style="font-size:16px; font-weight:500; color:var(--text-secondary); margin-bottom:20px;">${post.excerpt}</p>
        <hr class="divider" style="margin-bottom:20px;">
        <div class="blog-article-body">
          ${post.content || '<p>No content provided for this article.</p>'}
        </div>
      </div>
      <div class="blog-modal-footer">
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

/* ============================================
   SSN ELITE — CMS-Ready Blog Journal Data & Renderer
   Structured CMS data schema allowing future headless API / admin integration seamlessly.
   ============================================ */

const SSN_BLOG_POSTS = [
  {
    id: 'seed-blog-1',
    slug: 'maximizing-muscle-protein-synthesis',
    title: 'Maximizing Muscle Protein Synthesis: The Science of Timing & Dose',
    excerpt: 'Discover how protein intake timing, leucine threshold, and essential amino acid availability optimize muscle hypertrophy and recovery post-workout.',
    content: '<p>Muscle Protein Synthesis (MPS) is the fundamental physiological mechanism driving skeletal muscle adaptation, repair, and hypertrophy following resistance training.</p><h4>1. The Leucine Trigger Hypothesis</h4><p>Research demonstrates that approximately 3g of L-Leucine per bolus is required to reach peak mTORC1 activation in active individuals. Without sufficient leucine concentration, the intracellular signaling cascade remains suboptimal.</p><h4>2. Protein Quality and Absorption Kinetics</h4><p>Fast-digesting whey protein isolate and concentrate deliver rapid elevations in plasma amino acid concentrations, making them ideal for the post-exercise window.</p>',
    author: 'Dr. Marcus Vance, Ph.D.',
    date: 'August 18, 2025',
    category: 'Nutrition Science',
    readTime: '5 min read',
    gradient: 'linear-gradient(135deg, #0A2FFF 0%, #061B99 100%)',
    seoTitle: 'Maximizing Muscle Protein Synthesis | SSN Elite Journal',
    seoDesc: 'Evidence-based breakdown of protein timing, leucine thresholds, and amino acid kinetics.'
  },
  {
    id: 'seed-blog-2',
    slug: 'creatine-monohydrate-vs-tri-creatine',
    title: 'Creatine Monohydrate vs. Tri-Creatine: Research Breakdown',
    excerpt: 'An evidence-based analysis of solubility, gastric comfort, cellular hydration, and ATP regeneration differences between creatine forms.',
    content: '<p>Creatine remains the most extensively validated ergogenic aid in sports science literature. However, modern multi-phase formulations like Tri Creatine offer distinct advantages in solubility and gastric tolerance.</p><h4>The ATP Energy Currency</h4><p>During maximal effort resistance training, phosphocreatine stores donate a phosphate group to ADP, regenerating ATP rapidly. Tri Creatine provides complementary absorption routes to saturate muscle creatine stores efficiently.</p>',
    author: 'Elena Rostova, CSCS',
    date: 'August 10, 2025',
    category: 'Performance',
    readTime: '6 min read',
    gradient: 'linear-gradient(135deg, #7C3AED 0%, #4C1D95 100%)',
    seoTitle: 'Creatine Monohydrate vs. Tri-Creatine | SSN Elite Journal',
    seoDesc: 'Comparing creatine forms for strength, power, and cellular recovery.'
  },
  {
    id: 'seed-blog-3',
    slug: 'intra-workout-hydration-electrolytes',
    title: 'Intra-Workout Hydration & Electrolytes for Peak Athletic Output',
    excerpt: 'Why plain water alone is insufficient during high-intensity training sessions over 45 minutes.',
    content: '<p>Electrolyte equilibrium governs neuromuscular signaling and cellular osmolality during intense exercise. When sweating rates exceed fluid and sodium replenishment, neuromuscular fatigue accelerates.</p><h4>Essential Amino Acids During Training</h4><p>Combining electrolytes with free-form Essential Amino Acids (EAAs) suppresses exercise-induced muscle protein breakdown while sustaining intracellular hydration.</p>',
    author: 'David Chen, M.S.',
    date: 'August 02, 2025',
    category: 'Recovery',
    readTime: '4 min read',
    gradient: 'linear-gradient(135deg, #059669 0%, #064E3B 100%)',
    seoTitle: 'Intra-Workout Hydration Science | SSN Elite Journal',
    seoDesc: 'Optimizing electrolyte balance and amino acid delivery for workout performance.'
  }
];

let SSN_REMOTE_BLOG_POSTS = [];

async function loadBlogPosts() {
  if (typeof getBlogs === 'function') {
    try {
      const result = await getBlogs();
      const raw = (result && result.data) || (Array.isArray(result) ? result : []);
      // Filter out drafts and map to frontend format
      if (raw && raw.length > 0) {
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
      }
    } catch (error) {
      console.warn('[SSN] Error loading blogs from DB:', error);
    }
  }
  return getCombinedBlogPosts();
}

/**
 * Returns remote blogs if available, otherwise returns fallback articles
 */
function getCombinedBlogPosts() {
  if (SSN_REMOTE_BLOG_POSTS && SSN_REMOTE_BLOG_POSTS.length > 0) {
    return SSN_REMOTE_BLOG_POSTS;
  }
  return SSN_BLOG_POSTS;
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
    container.innerHTML = '<p class="mono" style="grid-column: 1/-1; text-align: center; color: var(--text-tertiary);">No articles published yet.</p>';
    return;
  }

  container.innerHTML = posts.map(post => `
    <article class="blog-card reveal revealed">
      <div class="blog-card-thumb" style="background: ${post.gradient || 'linear-gradient(135deg, #0A2FFF 0%, #061B99 100%)'};">
        <div class="blog-card-thumb-content">
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
    container.innerHTML = '<p class="mono" style="grid-column: 1/-1; text-align: center; color: var(--text-tertiary); padding: 40px 0;">No published articles found in this category.</p>';
    return;
  }

  container.innerHTML = filteredPosts.map(post => `
    <article class="blog-card blog-card-full reveal revealed">
      <div class="blog-card-thumb" style="background: ${post.gradient || 'linear-gradient(135deg, #0A2FFF 0%, #061B99 100%)'};">
        <div class="blog-card-thumb-content">
          <span class="blog-category-tag">${post.category}</span>
          <span class="blog-card-mono-code">${post.readTime}</span>
        </div>
      </div>
      <div class="blog-card-content">
        <div class="blog-card-meta">
          <span class="blog-date">${post.date}</span>
          <span class="meta-sep">•</span>
          <span class="blog-author">${post.author} (${post.authorRole || 'Author'})</span>
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
  const post = allPosts.find(p => p.id === postId);
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
      <div class="blog-modal-banner" style="background: ${post.gradient || 'linear-gradient(135deg, #0A2FFF 0%, #061B99 100%)'};">
        <span class="blog-category-tag">${post.category}</span>
        <h2>${post.title}</h2>
        <div class="blog-modal-meta">
          <span>${post.author} • ${post.authorRole || 'Author'}</span>
          <span>${post.date} • ${post.readTime}</span>
        </div>
      </div>
      <div class="blog-modal-body">
        <p class="blog-lead">${post.excerpt}</p>
        <hr class="divider">
        ${post.content}
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

/* ============================================
   SSN ELITE — Flavour Selector
   Interactive flavour selection with crossfade & dynamic data sync
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  initFlavourSelector();
  syncDynamicFlavours();
});

function initFlavourSelector() {
  const selector = document.querySelector('.flavour-selector');
  if (!selector) return;

  const pills = selector.querySelectorAll('.flavour-pill');
  const displayName = document.getElementById('flavour-name') || document.querySelector('.flavour-active-name');
  const displayDesc = document.getElementById('flavour-desc') || document.querySelector('.flavour-active-desc');
  const flavourImage = document.getElementById('flavour-image');
  const flavourGlow = document.getElementById('flavour-glow');

  pills.forEach(pill => {
    if (pill._hasFlavourListener) return;
    pill._hasFlavourListener = true;

    pill.addEventListener('click', () => {
      // Remove active from all
      selector.querySelectorAll('.flavour-pill').forEach(p => p.classList.remove('active'));

      // Add active to clicked
      pill.classList.add('active');

      // Update display
      const flavourName = pill.dataset.flavour;
      const flavourDesc = pill.dataset.description || `${flavourName} flavour profile.`;
      const imageUrl = pill.dataset.image;
      const glowColor = pill.dataset.color || 'rgba(10, 47, 255, 0.2)';

      if (displayName) {
        displayName.style.opacity = '0';
        setTimeout(() => {
          displayName.textContent = flavourName;
          displayName.classList.add('flavour-crossfade-enter');
          displayName.style.opacity = '1';

          setTimeout(() => {
            displayName.classList.remove('flavour-crossfade-enter');
          }, 300);
        }, 150);
      }

      if (displayDesc && flavourDesc) {
        displayDesc.style.opacity = '0';
        setTimeout(() => {
          displayDesc.textContent = flavourDesc;
          displayDesc.style.opacity = '1';
        }, 150);
      }

      if (flavourImage) {
        flavourImage.style.opacity = '0';
        flavourImage.style.transform = 'scale(0.95)';
        setTimeout(() => {
          if (imageUrl) {
            flavourImage.src = imageUrl;
            flavourImage.style.display = 'block';
            
            flavourImage.onload = () => {
              flavourImage.style.opacity = '1';
              flavourImage.style.transform = 'scale(1)';
            };
            flavourImage.onerror = () => {
              flavourImage.style.display = 'none';
            };
          } else {
            flavourImage.style.display = 'none';
          }
        }, 150);
      }

      if (flavourGlow) {
        flavourGlow.style.background = glowColor;
      }
    });
  });
}

/**
 * Optional dynamic flavour loader from Supabase database if available
 */
async function syncDynamicFlavours() {
  if (typeof getProducts !== 'function') return;
  const selector = document.querySelector('.flavour-selector');
  if (!selector) return;

  try {
    const slug = window.location.pathname.split('/').pop().replace('.html', '');
    if (!slug) return;

    const result = await getProducts();
    const products = (result && result.data) || (Array.isArray(result) ? result : []);
    const product = products.find(p => (p.slug && p.slug === slug) || (p.name && p.name.toLowerCase().includes(slug.replace(/-/g, ' '))));

    if (product && product.product_variants && Array.isArray(product.product_variants) && product.product_variants.length > 0) {
      let pillsHtml = '';
      product.product_variants.forEach((v, i) => {
        const activeClass = i === 0 ? 'active' : '';
        const vName = v.variant_name || 'Standard';
        const vImg = v.variant_image || '';
        pillsHtml += `<button class="flavour-pill ${activeClass}" data-flavour="${vName}" data-description="${vName} flavour profile." data-image="${vImg}">${vName}</button>`;
      });
      selector.innerHTML = pillsHtml;
      initFlavourSelector();
    }
  } catch (e) {
    console.debug('[SSN Flavour Selector] Using default static flavour variants.');
  }
}

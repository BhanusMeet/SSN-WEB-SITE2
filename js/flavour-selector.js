/* ============================================
   SSN ELITE — Flavour Selector
   Interactive flavour selection with crossfade
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  initFlavourSelector();
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
    pill.addEventListener('click', () => {
      // Remove active from all
      pills.forEach(p => p.classList.remove('active'));

      // Add active to clicked
      pill.classList.add('active');

      // Update display
      const flavourName = pill.dataset.flavour;
      const flavourDesc = pill.dataset.description || '';
      const imageUrl = pill.dataset.image;
      const glowColor = pill.dataset.color || 'transparent';

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

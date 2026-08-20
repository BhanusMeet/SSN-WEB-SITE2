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
  const displayName = document.querySelector('.flavour-active-name');
  const displayDesc = document.querySelector('.flavour-active-desc');

  pills.forEach(pill => {
    pill.addEventListener('click', () => {
      // Remove active from all
      pills.forEach(p => p.classList.remove('active'));

      // Add active to clicked
      pill.classList.add('active');

      // Update display
      const flavourName = pill.dataset.flavour;
      const flavourDesc = pill.dataset.description || '';

      if (displayName) {
        displayName.style.opacity = '0';
        setTimeout(() => {
          displayName.textContent = flavourName;
          displayName.classList.add('flavour-crossfade-enter');
          displayName.style.opacity = '1';

          // Remove animation class after it completes
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
    });
  });
}

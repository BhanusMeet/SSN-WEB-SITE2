/* ============================================
   SSN ELITE — Expandable Sections
   Toggle expandable content with smooth animation
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  initExpandables();
});

function initExpandables() {
  const expandables = document.querySelectorAll('.expandable');

  expandables.forEach(expandable => {
    const header = expandable.querySelector('.expandable-header');
    const content = expandable.querySelector('.expandable-content');

    if (!header || !content) return;

    // Set aria attributes
    const id = 'expandable-' + Math.random().toString(36).substr(2, 9);
    content.id = id;
    header.setAttribute('aria-expanded', 'false');
    header.setAttribute('aria-controls', id);
    header.setAttribute('role', 'button');
    header.setAttribute('tabindex', '0');

    // Click handler
    header.addEventListener('click', () => {
      toggleExpandable(expandable, header);
    });

    // Keyboard handler
    header.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleExpandable(expandable, header);
      }
    });
  });
}

function toggleExpandable(expandable, header) {
  const isOpen = expandable.classList.contains('open');

  expandable.classList.toggle('open');
  header.setAttribute('aria-expanded', !isOpen);
}

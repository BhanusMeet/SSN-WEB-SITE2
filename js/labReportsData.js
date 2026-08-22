/* ============================================
   SSN ELITE — Lab Reports Data Store & Renderer
   Now integrates with Supabase for dynamic data.
   Falls back to static seed data when DB is unavailable.
   Download buttons are permanently removed.
   ============================================ */

const SSN_LAB_REPORTS_DATA = [
];

/* ─── Supabase-backed dynamic data (merged at runtime) ─── */
let SSN_LAB_REPORTS_DB = [];

async function loadLabReportsFromDB() {
  if (typeof getLabReports === 'function') {
    try {
      const dbReports = await getLabReports();
      if (dbReports && dbReports.length > 0) {
        SSN_LAB_REPORTS_DB = dbReports.map(r => ({
          id: r.id,
          name: r.product_name,
          category: r.product_name.includes('Whey') ? 'Protein'
            : r.product_name.includes('EAA') ? 'Amino Acids'
            : r.product_name.includes('Creatine') ? 'Performance'
            : 'Mass Gainer',
          image: '',
          batchNo: r.batch_number,
          testDate: r.test_date,
          labName: r.lab_name,
          status: r.status || 'VERIFIED',
          purityScore: '100% Passed',
          summary: '',
          metrics: (r.parameters || []).map(p => ({
            label: p.label,
            value: p.value,
            status: p.status || 'PASS'
          })),
          reportImages: r.report_images || []
        }));
      }
    } catch (e) {
      console.warn('[SSN Lab Reports] DB load fallback:', e);
    }
  }
}

function getAllLabReports() {
  const reports = SSN_LAB_REPORTS_DB.length > 0 ? SSN_LAB_REPORTS_DB : SSN_LAB_REPORTS_DATA;
  return reports.filter(report => report.batchNo !== 'SSN-WHEY-2025-08A');
}

function getLabReportByBatch(batchNo) {
  const all = getAllLabReports();
  return all.find(r => r.batchNo === batchNo) || null;
}

function getAllBatchNumbers() {
  const all = getAllLabReports();
  return all.map(r => ({ batchNo: r.batchNo, productName: r.name }));
}

/**
 * Render Lab Reports Cards dynamically into a container
 * Download buttons are permanently removed.
 */
function renderLabReports(containerId = 'lab-reports-grid', categoryFilter = 'ALL', searchQuery = '') {
  const container = document.getElementById(containerId);
  if (!container) return;

  const allData = getAllLabReports();
  const filteredData = allData.filter(item => {
    const matchesCategory = (categoryFilter === 'ALL' || item.category.toLowerCase() === categoryFilter.toLowerCase());
    const matchesSearch = searchQuery === '' || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      item.batchNo.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  if (filteredData.length === 0) {
    container.innerHTML = `
      <div class="lab-reports-empty">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"/>
        </svg>
        <h3>No Lab Reports Found</h3>
        <p>No certificates match your search query "${searchQuery}". Please try another keyword or filter.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filteredData.map(item => `
    <article class="lab-report-card reveal" id="report-card-${item.id}">
      <div class="lab-report-header">
        ${item.image ? `<div class="lab-report-img-box"><img src="${item.image}" alt="${item.name}" loading="lazy"></div>` : ''}
        <div class="lab-report-badge">
          <span class="status-dot"></span>
          ${item.status}
        </div>
      </div>
      <div class="lab-report-body">
        <span class="lab-report-category">${item.category}</span>
        <h3 class="lab-report-title">${item.name}</h3>
        <div class="lab-report-meta">
          <div class="meta-row">
            <span class="meta-label">Batch / Lot No:</span>
            <span class="meta-val font-mono">${item.batchNo}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Test Date:</span>
            <span class="meta-val">${item.testDate}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">Accredited Lab:</span>
            <span class="meta-val">${item.labName}</span>
          </div>
        </div>
        ${item.summary ? `<p class="lab-report-summary">${item.summary}</p>` : ''}
        <div class="lab-report-actions">
          <button class="cta-button btn-sm" onclick="openLabReportModal('${item.id}')" aria-label="View Full Report for ${item.name}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"/>
              <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            View Lab Report
          </button>
        </div>
      </div>
    </article>
  `).join('');
}

/**
 * Open interactive Lab Report Preview Modal
 * No download buttons — view only.
 */
function openLabReportModal(productId) {
  const allData = getAllLabReports();
  const item = allData.find(p => p.id === productId);
  if (!item) return;

  let modal = document.getElementById('lab-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'lab-modal';
    modal.className = 'lab-modal-overlay';
    document.body.appendChild(modal);
  }

  const reportImagesHtml = (item.reportImages && item.reportImages.length > 0)
    ? `<div class="lab-report-images-grid">${item.reportImages.map(img => `<img src="${img}" alt="Lab Report Certificate" class="lab-report-scan-img" loading="lazy">`).join('')}</div>`
    : '';

  modal.innerHTML = `
    <div class="lab-modal-content" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <button class="lab-modal-close" onclick="closeLabReportModal()" aria-label="Close modal">&times;</button>
      <div class="lab-modal-header">
        <div class="lab-stamp">
          <span class="stamp-icon">✓</span>
          <span class="stamp-text">100% VERIFIED TEST REPORT</span>
        </div>
        <h2 id="modal-title">${item.name}</h2>
        <span class="modal-sub">Official Certificate of Analysis — Batch <strong class="font-mono">${item.batchNo}</strong></span>
      </div>

      <div class="lab-modal-body">
        <div class="modal-info-grid">
          <div class="modal-info-card">
            <span class="info-label">Testing Laboratory</span>
            <span class="info-val">${item.labName}</span>
          </div>
          <div class="modal-info-card">
            <span class="info-label">Certificate Date</span>
            <span class="info-val">${item.testDate}</span>
          </div>
          <div class="modal-info-card">
            <span class="info-label">Overall Result</span>
            <span class="info-val text-success">PASSED / CONFORMS TO SPEC</span>
          </div>
        </div>

        ${reportImagesHtml ? `
        <h4 class="modal-section-title" style="margin-top: 24px;">Scanned Certificate</h4>
        ${reportImagesHtml}
        ` : ''}
      </div>

      <div class="lab-modal-footer">
        <button class="cta-button-outline" onclick="closeLabReportModal()">Close Window</button>
      </div>
    </div>
  `;

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeLabReportModal() {
  const modal = document.getElementById('lab-modal');
  if (modal) {
    modal.classList.remove('open');
  }
  document.body.style.overflow = '';
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeLabReportModal();
});

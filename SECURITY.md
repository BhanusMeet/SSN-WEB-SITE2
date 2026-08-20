# SSN ELITE — Security Architecture & Hardening Document

## 1. Security Architecture Overview

**SSN ELITE** is built as a **static-first, zero-backend web application**. The browser exclusively receives static HTML, CSS, vanilla JavaScript, images, and WebGL 3D assets.

```
┌─────────────────────────────────────────────────────────────┐
│                 Client Browser (HTTPS)                      │
│                                                             │
│  HTML5 + CSS3 + Vanilla JS + WebGL (Three.js)               │
└──────────────────────────────┬──────────────────────────────┘
                               │ Static CDN Assets Only
                               ▼
┌─────────────────────────────────────────────────────────────┐
│           Static Edge CDN (Cloudflare / Vercel)             │
│                                                             │
│  - No Application Server                                   │
│  - No Database (SQL / NoSQL)                                │
│  - No User Input Forms / API Endpoints                      │
│  - Strict Security Headers & CSP Policies                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Attack Surface Reduction

By deliberately avoiding dynamic server infrastructure, the attack surface is reduced to the absolute physical minimum:

| Attack Vector | Status | Mitigation / Architectural Guarantee |
|---|---|---|
| **SQL Injection (SQLi)** | **N/A** | Zero database exists; no SQL queries are constructed or executed. |
| **Cross-Site Request Forgery (CSRF)** | **N/A** | Zero user sessions, cookies, or stateful POST endpoints exist. |
| **Server-Side Request Forgery (SSRF)** | **N/A** | Zero server-side HTTP clients or proxy endpoints exist. |
| **Authentication & Privilege Escalation** | **N/A** | Zero login, registration, or user role systems exist. |
| **File Upload Vulnerabilities** | **N/A** | Zero file upload handlers or server storage exist. |
| **Data Leakage / PII Exposure** | **N/A** | Zero customer data is collected, stored, or processed. |
| **Cross-Site Scripting (XSS)** | **Mitigated** | All content is trusted static HTML/JS; dynamic DOM generation uses `textContent` instead of `innerHTML`; strict CSP blocks inline script injection. |
| **Clickjacking** | **Mitigated** | Restricted via `X-Frame-Options: DENY` and CSP `frame-ancestors 'none'`. |
| **MIME Sniffing** | **Mitigated** | Restricted via `X-Content-Type-Options: nosniff`. |

---

## 3. Security Headers Evaluation

The project provides deployment configuration files (`_headers`, `vercel.json`, `.htaccess`) to enforce edge security headers:

### Content-Security-Policy (CSP)
```http
Content-Security-Policy: default-src 'self'; script-src 'self' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'none';
```
- `script-src`: Restricts JavaScript execution exclusively to origin scripts and trusted Three.js CDN (`cdnjs.cloudflare.com`).
- `style-src`: Restricts CSS styling to origin and Google Fonts (`fonts.googleapis.com`).
- `font-src`: Restricts fonts to origin and Google Font assets (`fonts.gstatic.com`).
- `frame-ancestors 'none'`: Prevents embedding in any iframe (Clickjacking defense).
- `form-action 'none'`: Prevents form submission actions.

### Additional Security Headers
- **Strict-Transport-Security (HSTS)**: `max-age=31536000; includeSubDomains; preload` (Forces HTTPS connections).
- **X-Frame-Options**: `DENY` (Legacy Clickjacking protection).
- **X-Content-Type-Options**: `nosniff` (Prevents browsers from MIME-sniffing responses).
- **Referrer-Policy**: `strict-origin-when-cross-origin` (Protects referrer data when navigating to external links).
- **Permissions-Policy**: `camera=(), microphone=(), geolocation=(), payment=(), usb=()` (Disables unnecessary browser hardware APIs).

---

## 4. External Dependencies Audit

| Dependency | Purpose | Source / Integrity | Risk Assessment |
|---|---|---|---|
| **Google Fonts** | Inter & JetBrains Mono typography | `https://fonts.googleapis.com` / `https://fonts.gstatic.com` | **Low** — Standard web fonts served over HTTPS. |
| **Three.js (r128)** | Real-time 3D DNA WebGL rendering | `https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js` | **Low** — Hosted on Cloudflare's global CDN; immutable release version. |

---

## 5. Centralized Public Information Model

All public brand contact details, social URLs, and product MRPs are isolated in a single configuration file:
- File: [js/siteConfig.js](js/siteConfig.js)
- **Zero Secrets**: Contains exclusively public contact information.
- **Auto-Injection**: Injects values safely using `textContent` and safe link prefixes (`mailto:`, `tel:`).

---

## 6. Hosting & Deployment Requirements

1. **Cloudflare Pages / Netlify**:
   - Commit `_headers` to the repository root. Edge headers apply automatically.
2. **Vercel**:
   - Commit `vercel.json` to the repository root. Headers apply automatically on deployment.
3. **Apache / cPanel Static Web Server**:
   - Commit `.htaccess` to the document root. Ensure `mod_headers` and `mod_rewrite` are enabled.
4. **Nginx Static Server**:
   - Add the header directives from `SECURITY-CHECKLIST.md` to your Nginx `server {}` block.

---

## 7. Security Model Limitations & Remaining Risks

While the static architecture eliminates server-side vulnerabilities, static sites remain subject to operational edge risks:

1. **Edge CDN / Hosting Account Compromise**: Strong passwords and Multi-Factor Authentication (MFA) must be enabled on hosting provider accounts (Cloudflare, Vercel, Netlify, domain registrars).
2. **DNS Tampering / Hijacking**: Ensure DNSSEC is activated at your domain registrar.
3. **Third-Party CDN Availability**: If `cdnjs` or `fonts.googleapis.com` experience outages, 3D graphics or fonts fallback gracefully to local system sans-serif fonts.

---

## 8. Recommended Periodic Checks

- Audit domain registration and SSL certificate expiration dates.
- Review hosting provider access logs for anomaly detection.
- Periodically check external CDN library hashes for version integrity.

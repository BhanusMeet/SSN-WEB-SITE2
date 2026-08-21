# SSN ELITE — Security Architecture & Hardening Document

## 1. Security Architecture Overview

**SSN ELITE** is built as a **static-first web application**. Public pages remain static, while the protected blog publisher uses Vercel serverless functions and GitHub OAuth to commit approved articles to the repository.

```
┌─────────────────────────────────────────────────────────────┐
│                 Client Browser (HTTPS)                      │
│                                                             │
│  HTML5 + CSS3 + Vanilla JS + WebGL (Three.js)               │
└──────────────────────────────┬──────────────────────────────┘
                               │ Static assets + protected API calls
                               ▼
┌─────────────────────────────────────────────────────────────┐
│           Static Edge CDN (Cloudflare / Vercel)             │
│                                                             │
│  - Vercel serverless auth/content routes for admin only     │
│  - GitHub repository is the content store                   │
│  - Strict Security Headers & CSP Policies                   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Attack Surface Reduction

Public pages avoid dynamic server infrastructure; only the protected publisher routes access GitHub:

| Attack Vector | Status | Mitigation / Architectural Guarantee |
|---|---|---|
| **SQL Injection (SQLi)** | **N/A** | Zero database exists; no SQL queries are constructed or executed. |
| **Cross-Site Request Forgery (CSRF)** | **Mitigated** | OAuth state validation, HttpOnly/Secure/SameSite cookies, and same-origin publishing API. |
| **Server-Side Request Forgery (SSRF)** | **N/A** | Zero server-side HTTP clients or proxy endpoints exist. |
| **Authentication & Privilege Escalation** | **Mitigated** | GitHub OAuth plus an explicit `GITHUB_ALLOWED_USER` allow-list protects publishing. |
| **File Upload Vulnerabilities** | **N/A** | Zero file upload handlers or server storage exist. |
| **Data Leakage / PII Exposure** | **Mitigated** | The API stores published article content in the configured GitHub repository; OAuth tokens remain server-side in HttpOnly cookies. |
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

## 5. Blog Publishing Architecture

The admin publisher at `/blog-publisher.html` authenticates with GitHub. Vercel routes under `/api/auth/` handle OAuth and `/api/content` reads or updates `content/blog-posts.json`. Every successful publish creates a Git commit, which triggers the normal Vercel deployment.

Required Vercel environment variables are documented in `.env.example`. Set `GITHUB_ALLOWED_USER` to the exact GitHub username that should be able to publish.

## 6. Centralized Public Information Model

All public brand contact details, social URLs, and product MRPs are isolated in a single configuration file:
- File: [js/siteConfig.js](js/siteConfig.js)
- **Zero Secrets**: Contains exclusively public contact information.
- **Auto-Injection**: Injects values safely using `textContent` and safe link prefixes (`mailto:`, `tel:`).

---

## 7. Hosting & Deployment Requirements

1. **Cloudflare Pages / Netlify**:
   - Commit `_headers` to the repository root. Edge headers apply automatically.
2. **Vercel**:
   - Commit `vercel.json` to the repository root. Headers apply automatically on deployment.
3. **Apache / cPanel Static Web Server**:
   - Commit `.htaccess` to the document root. Ensure `mod_headers` and `mod_rewrite` are enabled.
4. **Nginx Static Server**:
   - Add the header directives from `SECURITY-CHECKLIST.md` to your Nginx `server {}` block.

---

## 8. Security Model Limitations & Remaining Risks

The static public architecture reduces the attack surface, but the publishing integration adds operational risks:

1. **Edge CDN / Hosting Account Compromise**: Strong passwords and Multi-Factor Authentication (MFA) must be enabled on hosting provider accounts (Cloudflare, Vercel, Netlify, domain registrars).
2. **DNS Tampering / Hijacking**: Ensure DNSSEC is activated at your domain registrar.
3. **Third-Party CDN Availability**: If `cdnjs` or `fonts.googleapis.com` experience outages, 3D graphics or fonts fallback gracefully to local system sans-serif fonts.

---

## 9. Recommended Periodic Checks

- Audit domain registration and SSL certificate expiration dates.
- Review hosting provider access logs for anomaly detection.
- Periodically check external CDN library hashes for version integrity.

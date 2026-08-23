# SSN ELITE — Comprehensive Security Architecture & Hardening Document

## 1. Security Architecture Overview

**SSN ELITE** is an enterprise-grade sports nutrition platform engineered with a **defense-in-depth static-first architecture** backed by **Supabase PostgreSQL Row Level Security (RLS)** and **Edge CDN security headers**.

```
┌─────────────────────────────────────────────────────────────┐
│                 Client Browser (HTTPS)                      │
│                                                             │
│  HTML5 + CSS3 + Vanilla JS + WebGL (Three.js DNA Scene)     │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / TLS 1.3
                               ▼
┌─────────────────────────────────────────────────────────────┐
│           Static Edge CDN (Cloudflare / Vercel)             │
│                                                             │
│  - Strict Content-Security-Policy (CSP)                     │
│  - Clickjacking Protection (X-Frame-Options: DENY)          │
│  - MIME Sniffing Defense (nosniff)                          │
│  - Strict-Transport-Security (HSTS Preload)                 │
└──────────────────────────────┬──────────────────────────────┘
                               │ REST / PostgREST & Auth
                               ▼
┌─────────────────────────────────────────────────────────────┐
│             Supabase Managed Cloud Backend                  │
│                                                             │
│  - JWT Bearer Authentication for Admin Panel                │
│  - Row Level Security (RLS) on ALL tables                   │
│  - MIME & Extension-validated Storage Bucket (ssn-uploads)  │
│  - Isolated Customer Enquiries (Private Data Protection)    │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Threat Modeling & OWASP Top 10 Mitigation Matrix

| OWASP Top 10 Category | Threat Vector | Status | Mitigation Implemented |
|---|---|---|---|
| **A01: Broken Access Control** | Unauthorized product/blog modification, direct URL manipulation, IDOR | **Hardened** | PostgreSQL Row Level Security (RLS) blocks all unauthenticated `INSERT`, `UPDATE`, and `DELETE` queries at database level. |
| **A02: Cryptographic Failures** | Secret exposure, plain-text transmission | **Hardened** | Zero `service_role` keys in client code; only public anon key used; HSTS preload enforced; all traffic over TLS 1.3. |
| **A03: Injection (XSS & SQLi)** | Stored/DOM XSS, SQL injection | **Hardened** | PostgREST parameterized queries; strict HTML sanitization via `DOMParser` for blog bodies; `esc()` text escaping for all dynamic fields; safe `data-*` attributes for DOM callbacks. |
| **A04: Insecure Design** | Unrestricted file uploads, SVG script execution | **Hardened** | Whitelist-only file extension checking (`.jpg`, `.png`, `.webp`, `.gif`, `.pdf`); explicit block of executable scripts and `.svg`; random hash-based filename generation. |
| **A05: Security Misconfiguration** | Clickjacking, MIME sniffing, permissive CORS | **Hardened** | `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `X-Content-Type-Options: nosniff`, and edge CDN headers configured in `_headers`, `vercel.json`, and `.htaccess`. |
| **A06: Vulnerable Components** | Outdated or unsafe third-party libraries | **Hardened** | Minimal dependencies; official Supabase JS client and Three.js loaded from integrity-verified CDNs. |
| **A07: Identification & Auth Failures** | Session hijacking, brute-force admin login | **Hardened** | Supabase managed cryptographic JWT authentication with automatic session invalidation on logout. |
| **A08: Software & Data Integrity Failures** | Unvalidated redirects, malicious CDN injections | **Hardened** | Strict CSP policy restricts external origins; all external links enforce `rel="noopener noreferrer"`. |
| **A09: Security Logging & Monitoring** | Silent mutation failures, unhandled exceptions | **Hardened** | Real-time console error logging with status codes, error details, and user-facing non-leaking toast feedback. |
| **A10: Server-Side Request Forgery (SSRF)** | Server-side URL fetching exploits | **N/A** | Pure static and serverless architecture; no arbitrary proxy or server-side fetch endpoints exist. |

---

## 3. Database & Row Level Security (RLS) Policy Specifications

Every database table has Row Level Security explicitly enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`):

### 1. `products` Table
- **SELECT**: Public read-only access (`anon` & `authenticated`).
- **INSERT / UPDATE / DELETE**: Strictly restricted to `authenticated` admin sessions.

### 2. `blogs` Table
- **SELECT**: Public read-only access (`anon` & `authenticated`).
- **INSERT / UPDATE / DELETE**: Strictly restricted to `authenticated` admin sessions.

### 3. `lab_reports` Table
- **SELECT**: Public read-only access (`anon` & `authenticated`).
- **INSERT / UPDATE / DELETE**: Strictly restricted to `authenticated` admin sessions.

### 4. `submissions` (Customer Enquiries) Table
- **INSERT**: Open to `anon` and `authenticated` (allows prospective customers to send inquiries).
- **SELECT / DELETE**: Restricted **strictly** to `authenticated` admin sessions. **Anonymous users CANNOT read or list customer submissions**, preventing PII and contact data leaks.

### 5. `site_settings` Table
- **SELECT**: Public read-only access (`anon` & `authenticated`).
- **ALL (Manage)**: Restricted to `authenticated` admin sessions.

### 6. Storage Bucket (`ssn-uploads`)
- **Public Read (`SELECT`)**: Enabled for public product images, blog banners, and certified lab PDFs.
- **Upload / Modify / Delete (`INSERT`, `UPDATE`, `DELETE`)**: Strictly restricted to `authenticated` admin sessions.

---

## 4. File Upload Defensive Controls

In [js/supabaseClient.js](js/supabaseClient.js), `uploadFileToStorage()` enforces multi-layered upload validation:

1. **Extension Whitelist**: Only `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif`, and `.pdf` are permitted.
2. **Dangerous Extension Blocking**: `.svg`, `.html`, `.htm`, `.js`, `.php`, `.exe`, `.bat`, `.cmd`, `.sh`, `.py`, and script extensions are strictly blocked.
3. **MIME Type Validation**: Verified against `image/jpeg`, `image/png`, `image/webp`, `image/gif`, `application/pdf`.
4. **Path Traversal Sanitization**: Folder and file names are stripped of `..`, slashes, and non-alphanumeric characters.
5. **Collision & Overwrite Defense**: All filenames are appended with unique timestamps and cryptographically secure random suffixes (`${cleanBaseName}-${Date.now()}-${randomHash}.${ext}`).
6. **Payload Size Limit**: Strict 25 MB ceiling enforced before transmission.

---

## 5. XSS & Client-Side Hardening

1. **Blog HTML Sanitization**: [js/blogData.js](js/blogData.js) uses `DOMParser` to strip `script`, `iframe`, `object`, `embed`, `form`, `link`, `meta` tags, all `on*` event handlers, and `javascript:` / `vbscript:` / `data:text/html` URLs.
2. **Text Escaping**: Every dynamic user-facing string (Product names, categories, descriptions, metrics, lab report batch numbers) is sanitized using `esc()` before DOM insertion.
3. **Safe Event Handlers**: Action buttons in data tables use HTML5 `data-*` attributes (`this.getAttribute('data-id')`) instead of interpolated string literals to prevent injection breaks.
4. **Target Blank Hardening**: All external and preview links declare `rel="noopener noreferrer"` to prevent tab-nabbing and `window.opener` privilege leaks.

---

## 6. Security Headers Specification

Deployed via `_headers`, `vercel.json`, and `.htaccess`:

```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://unpkg.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.quilljs.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://*.supabase.co; connect-src 'self' https://*.supabase.co https://*.supabase.in wss://*.supabase.co; frame-src https://*.supabase.co blob:; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self' https://*.supabase.co;
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

---

## 7. Residual Risks & Operational Recommendations

1. **Supabase SQL Migration Execution**: Ensure all RLS policies in [sql/migrations.sql](sql/migrations.sql) are executed in the Supabase Dashboard SQL Editor so remote database tables enforce backend policies.
2. **Admin Password Complexity**: Enforce strong passwords (12+ characters, mixed casing, symbols) for admin accounts in Supabase Auth.
3. **Environment Security**: Keep production credentials out of source control. Use environment variables for deployment CI/CD.

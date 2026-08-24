# SSN Elite — Hostinger Deployment Guide

## Architecture Overview
The SSN Elite website and Admin Panel operate entirely on static client-side architecture (HTML5 + CSS3 + Vanilla JavaScript) integrated directly with **Supabase** for database, authentication, storage, and Row Level Security.

**Zero Node.js, Vercel serverless functions, or backend servers are required.**

---

## 1. What to Upload to Hostinger

Upload all files into Hostinger File Manager > `public_html`:

```text
public_html/
├── index.html
├── about.html
├── blog.html
├── contact.html
├── products.html
├── product.html
├── lab-reports.html
├── verify.html
├── elite-control/
│   └── index.html
├── performance-whey.html (SEO redirect)
├── anabolic-monster-mass.html (SEO redirect)
├── tri-creatine.html (SEO redirect)
├── eaa-bcaa-glutamine.html (SEO redirect)
├── assets/
├── css/
├── js/
├── content/
├── .htaccess
├── robots.txt
└── sitemap.xml
```

---

## 2. Admin Panel & Supabase
The Admin Panel is accessible at `https://YOUR-DOMAIN.com/elite-control/`.
- Authentication, product CRUD, blog publishing, lab report certificates, and customer inquiries connect directly to Supabase via `@supabase/supabase-js`.
- Access is protected by Supabase Auth and database RLS with `public.is_admin()`.
- Legacy `/admin.html` path is permanently blocked with HTTP 404.

---

## 3. Hostinger Deployment Steps
1. Compress all website files into a ZIP archive.
2. Log into Hostinger hPanel > **File Manager**.
3. Open `public_html`.
4. Upload and Extract the ZIP file.
5. Ensure `index.html` is directly inside `public_html` (not nested inside a subfolder).
6. Ensure `.htaccess` is present in `public_html` for security headers, clean URLs, and admin route protection.
7. Verify that SSL (HTTPS) is enabled in Hostinger.

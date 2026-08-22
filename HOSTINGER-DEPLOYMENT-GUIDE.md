# SSN Elite Hostinger Deployment Guide

## What to upload

Upload the website files into Hostinger File Manager > `public_html`.

The homepage must be placed here:

```text
public_html/index.html
```

Upload these files and folders:

```text
index.html
about.html
blog.html
contact.html
products.html
lab-reports.html
verify.html
performance-whey.html
anabolic-monster-mass.html
tri-creatine.html
eaa-bcaa-glutamine.html
assets/
css/
js/
content/
.htaccess
robots.txt
sitemap.xml
```

## Correct folder structure

```text
public_html/
├── index.html
├── about.html
├── blog.html
├── contact.html
├── products.html
├── lab-reports.html
├── verify.html
├── performance-whey.html
├── anabolic-monster-mass.html
├── tri-creatine.html
├── eaa-bcaa-glutamine.html
├── assets/
├── css/
├── js/
├── content/
├── .htaccess
├── robots.txt
└── sitemap.xml
```

Do not create an extra folder level such as:

```text
public_html/ssn/index.html
```

## Files not to upload

These are development, Vercel, or documentation files and do not need to be in Hostinger `public_html`:

```text
.git/
.vscode/
.env
.env.example
api/
vercel.json
_headers
SECURITY.md
SECURITY-CHECKLIST.md
convert_images.ps1
HOSTINGER-DEPLOYMENT-GUIDE.md
```

Do not upload any file containing a GitHub Client Secret.

## Upload method A: ZIP file

1. Compress the website files into a ZIP file.
2. Open Hostinger hPanel.
3. Open **Websites** and select the domain.
4. Open **File Manager**.
5. Open `public_html`.
6. Upload the ZIP file.
7. Right-click the ZIP and choose **Extract**.
8. Ensure `index.html` is directly inside `public_html`.
9. Delete the ZIP after extraction if it is no longer needed.
10. Delete Hostinger's default `default.php` file if it is present.

If extraction creates `public_html/ssn/`, open that folder and move its contents up into `public_html`.

## Upload method B: individual files

Open `public_html` and upload the listed HTML files, then upload the `assets`, `css`, `js`, and `content` folders. Upload `.htaccess` as well. Enable **Show hidden files** in File Manager so `.htaccess` is visible.

## Test the website

After uploading, open:

```text
https://YOUR-DOMAIN.com/
https://YOUR-DOMAIN.com/products.html
https://YOUR-DOMAIN.com/blog.html
https://YOUR-DOMAIN.com/lab-reports.html
```

Replace `YOUR-DOMAIN.com` with the real domain.

If the domain does not open, check that:

- `index.html` is directly in `public_html`.
- The domain points to Hostinger.
- SSL is active in Hostinger.
- `.htaccess` was uploaded correctly.
- Browser cache is cleared with `Ctrl+F5`.

## Blog publisher limitation

The public website works on Hostinger shared hosting because it is a static website.

The current GitHub login and blog publisher use Vercel serverless API routes in the `api/` folder. Those routes do not run by simply uploading them to normal Hostinger shared hosting.

Therefore, with the current setup:

```text
Public website: Hostinger
Blog publisher: https://ssn-web-site-2.vercel.app/blog-publisher.html
```

Use the Vercel publisher URL to sign in with GitHub and publish articles. Vercel will commit the article to GitHub and redeploy the Vercel version.

If the public website is hosted on Hostinger, new GitHub-published articles will only appear there if the Hostinger site is updated from the repository afterward. The current Hostinger copy does not automatically rebuild from GitHub.

## Important security note

Never upload these to a public folder:

```text
.env
GITHUB_CLIENT_SECRET
GitHub OAuth credentials
```

Keep GitHub OAuth credentials only in Vercel Environment Variables.

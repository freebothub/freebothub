# FreeBotHub.com

A complete, free directory of trading bots and trading tools — Forex, Binary Options, Crypto, TradingView, AI Trading, Trading Signals, MT4 / MT5 Expert Advisors and more.

Built with **vanilla HTML / CSS / JavaScript** + **Supabase** (PostgreSQL, Auth, Storage). Designed to host on **GitHub Pages** with a custom domain — no paid hosting required.

---

## ✨ Features

- Modern dark trading-marketplace theme (navy / white / green)
- 9 categories: Forex, Binary, Crypto, TradingView, AI Trading, Signals, MT4, MT5, Other Tools
- Public homepage with hero, search, category cards, featured / latest / popular bot grids
- All-bots page with live search, category + platform filters, sorting and pagination
- Per-category pages with their own filters
- Individual bot detail pages with image, full description, features, installation info and risk warning
- **"Get Bot"** button on every bot page — opens the bot's external link in a new tab
- Floating **Quotex** and **Exness** broker buttons on every page
- Optional **background redirect**: when a visitor clicks "Get Bot", the current page also redirects to the configured affiliate link (Quotex by default). Disable in `js/config.js`.
- Secure admin dashboard (Supabase Auth + RLS) with full CRUD for bots, image upload, publish/unpublish, mark as featured, delete
- Auto-display of newly published bots; edited bots update automatically; drafts are hidden from public visitors
- Graceful handling of missing images, broken links and empty states
- SEO-friendly meta tags, sitemap.xml, robots.txt
- Fully responsive (mobile / tablet / desktop)

---

## 📦 Project Structure

```
FreeBotHub/
├── index.html              Home page
├── bots.html               All bots (search + filter + pagination)
├── category.html           Single category page (?cat=forex)
├── bot.html                Single bot detail page (?slug=...)
├── about.html              About Us
├── contact.html            Contact form (mailto)
├── privacy.html            Privacy Policy
├── terms.html              Terms & Conditions
├── disclaimer.html         Trading Risk Disclaimer
├── admin-login.html        Supabase Auth login
├── admin-dashboard.html    Admin CRUD UI
├── 404.html                Not found
├── robots.txt
├── sitemap.xml
├── .nojekyll               Keeps GitHub Pages from ignoring _-prefixed folders
├── css/
│   └── style.css           Full theme
├── js/
│   ├── config.js           ← EDIT THIS: your Supabase URL + anon key
│   ├── supabase-client.js  Shared client, helpers, broker buttons, background redirect
│   ├── home.js             Homepage rendering
│   ├── bots.js             All bots page
│   ├── category.js         Category page
│   ├── bot-detail.js       Bot detail page + Get Bot handler
│   ├── admin-auth.js       Login + admin guard
│   └── admin-dashboard.js  Admin CRUD UI logic
├── sql/
│   └── setup.sql           ← Run once in Supabase SQL Editor
└── assets/
    ├── logo.svg
    └── favicon.svg
```

---

## 🚀 Quick Start (5 minutes)

1. **Download / clone** this folder.
2. **Create a Supabase project** (free plan) → https://supabase.com
3. **Run the SQL setup**:
   - Open Supabase Dashboard → SQL Editor → New query
   - Paste the contents of `sql/setup.sql`
   - **Edit the line** `INSERT INTO public.admins (email) VALUES ('your-admin-email@example.com')` to use your real email
   - Click **Run**
4. **Get your Supabase keys**:
   - Dashboard → Project Settings → API
   - Copy **Project URL** and **anon public** key
5. **Edit `js/config.js`** and replace:
   ```js
   supabaseUrl:    'https://YOUR-PROJECT-REF.supabase.co',
   supabaseAnonKey:'YOUR_ANON_PUBLIC_KEY_HERE',
   ```
   with your real values.
6. **Create your admin user**:
   - Dashboard → Authentication → Users → Add user
   - Enter the same email you used in step 3, set a password, and confirm
7. **Upload to GitHub** and **enable GitHub Pages** (see the PDF guide for screenshots).

Open the site → click **Admin Login** → sign in → add your first bot.

---

## 🔧 Configuration

All editable settings live in **`js/config.js`**:

| Setting | Purpose |
|---|---|
| `supabaseUrl` | Your Supabase project URL |
| `supabaseAnonKey` | Supabase anon/publishable key (safe to publish) |
| `storageBucket` | Storage bucket name (default `bot-images`) |
| `siteName` / `siteUrl` / `contactEmail` | Identity used in footer, contact form, meta tags |
| `quotexLink` | Quotex affiliate URL (floating button + default redirect target) |
| `exnessLink` | Exness affiliate URL (floating button) |
| `backgroundRedirect` | `true` = when "Get Bot" is clicked, current page redirects to affiliate link after opening bot link in new tab. `false` = no background redirect. |
| `backgroundRedirectTarget` | `'quotex'`, `'exness'`, or any `https://...` URL |

---

## 🔐 Security Notes

- **The anon key is safe to expose** — that is its design purpose. It is gated by Row Level Security in your Supabase project.
- **NEVER** put the Supabase **service-role** key in any frontend file. It is not needed for this project.
- **RLS** is enforced for every table:
  - Public visitors can only `SELECT` published bots.
  - Only users whose email is in the `admins` table can `INSERT`, `UPDATE`, `DELETE`.
  - Storage follows the same rules for the `bot-images` bucket.
- Admin login uses Supabase Auth (email + password). Sessions persist via local storage.

---

## ☁️ Deploy to GitHub Pages

1. Create a new GitHub repository (e.g. `freebothub`).
2. Upload every file from this folder to the repository root.
3. Repository → **Settings** → **Pages** → Source: **Deploy from a branch** → Branch: **main** / root → **Save**.
4. Wait ~1 minute. Your site is live at `https://<your-username>.github.io/freebothub/`.

### Custom domain (FreeBotHub.com)

1. Buy the domain at any registrar.
2. GitHub repo → Settings → Pages → Custom domain → enter `freebothub.com` → **Save**.
3. At your registrar, add DNS records:
   - **A records**: `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
   - **CNAME**: `www` → `<your-username>.github.io`
4. Wait for DNS propagation (5 min – 24 h). Tick **Enforce HTTPS** in GitHub Pages settings.

---

## 🛟 Troubleshooting

| Symptom | Fix |
|---|---|
| Site shows "Supabase is not configured" banner | Edit `js/config.js` with real URL + anon key |
| Admin login says "not authorized" | Run `sql/setup.sql` and confirm your email is in the `admins` table |
| Image upload fails | Confirm `bot-images` bucket exists and is public (re-run the storage section of `sql/setup.sql`) |
| Bots don't appear on homepage | In admin dashboard, set bot Status = **Published** and click Save |
| 404 on `/admin-dashboard.html` | Make sure `.nojekyll` is uploaded (without it GitHub Pages may skip files) |
| Background redirect does not fire | Some browsers block background navigation after popup. Set `backgroundRedirect: false` to disable, or accept that ad-blockers may suppress it. |

For full step-by-step instructions with diagrams, see **`FreeBotHub_Setup_Guide.pdf`**.

---

## 📜 License & Disclaimer

Source code is provided as-is for your own use. The FreeBotHub name, logo and brand are yours to keep for your own deployment.

**Trading in financial markets carries substantial risk.** Bots listed on this site do not guarantee profits. Always test on demo accounts before risking real capital. See `disclaimer.html` for the full risk warning.

---

Made for traders, by traders. 🚀

---

## 🆕 v3 upgrade (2026-11-07, preview — not pushed to live yet)

Mobile-friendly + premium polish, no change to links, prices or Supabase keys:

- Removed dead duplicates that shipped to GitHub Pages: old root `style.css`, root copies of the JS files, `FreeBotHub_Source.zip`, duplicate `FreeBotHub_SQL_Setup.sql` (identical to `setup.sql`), empty `assets-old.txt`.
- Every page now has `theme-color`, canonical URL, Open Graph + Twitter card with a real `assets/og-image.png` (1200×630), `site.webmanifest` + app icons, and `WebSite` structured data with search.
- Dropped the unused JetBrains Mono font (it was downloaded on every page but never used) — Inter only now.
- Homepage: new hero search bar, skeleton loading instead of spinners, Featured 4 / Latest 6 / “More Free Bots” 4 with no duplicates. The old “Popular This Week” list was just alphabetical, so it is now honestly labelled and de-duplicated.
- Bot images lazy-load; the bot-detail image loads with high priority; a Copy Link button was added on detail pages.
- Mobile fixes: contact form stacks to one column on phones, admin table scrolls sideways instead of crushing, hero CTAs go full-width under 480px, broker buttons respect the iPhone safe area and can be dismissed for the visit, keyboard focus is visible, and animations respect reduced-motion.
- Total-bot stat no longer falls back to a made-up “6+” when counts fail — it shows “—” instead.

Deploy: review the preview, then `git add -A && git commit -m "FreeBotHub v3: mobile + premium polish" && git push`.
Also check `https://freebothub.com` loads over HTTPS on your phone — Muse's browser hit a certificate-name warning on 2026-11-07, which may be local to Muse's network. If you see the same warning, toggle **Enforce HTTPS** off and on again in GitHub repo → Settings → Pages.

## v3.1 bottom broker bar (2026-11-07)

- The Quotex / Exness buttons are no longer floating pills in the bottom-right corner.
  They are a fixed bar pinned to the bottom of every page, full width, both labels
  always visible on phones and desktop, sitting above the footer content (the page
  gets bottom padding so nothing hides behind it). The dismiss button is gone —
  the bar is always shown.
- Background redirect unchanged and verified: `js/config.js` has
  `backgroundRedirect: true` with target `quotex`. Clicking **Get This Bot** opens
  the bot's own page in a new tab and, 350 ms later, the FreeBotHub tab itself
  goes to the Quotex affiliate link (`https://broker-qx.pro/?lid=2414749`).

## v3.2 screenshot fixes (2026-11-07)

- Bot detail image no longer sticks on phones: `position: sticky` now applies
  only at 900px and up (desktop two-column layout). On a phone the image scrolls
  away normally instead of staying glued to the top.
- Back-to-top button moved to the bottom-right, above the broker bar. It was
  bottom-left and covered the left column's card text while scrolling.
- Category cards are compact on phones: less padding, smaller icons and text.
- Admin All Bots table fits without horizontal scrolling on phones: the Image,
  Platform, Featured and Created columns hide under 900px (Name, Category,
  Status and Actions stay), with tighter padding.

## v3.3 mobile header fix (2026-11-07)

- The header row is a plain left-packed flex row, so on phones the brand,
  search and menu buttons only filled about three quarters of the width and
  left a dead gap at the right edge (the hamburger looked like it was floating
  in the middle). The search button now gets `margin-left: auto` under 980px,
  so the buttons sit flush against the right edge.

## v3.4 license key scratch card (2026-11-08)

- New `license_key` column on the `bots` table (see `setup.sql`).
- Bot detail page: when a bot has a license key, a scratch card appears under
  the Get Bot buttons. The visitor scratches the silver panel (touch or mouse)
  to reveal the key; once ~45% is scratched the panel clears and the
  **Copy License Key** button enables and copies the key to the clipboard.
  Bots without a key show no card at all.
- Admin panel: the Add/Edit bot form has a "License Key / Password (optional)"
  field, and the bots table shows a 🔑 next to bots that have a key.
- One-time setup for the LIVE database (the column does not exist there yet):
  run this once in Supabase → SQL Editor:
  `ALTER TABLE public.bots ADD COLUMN IF NOT EXISTS license_key text;`
  Until that runs, the card stays hidden and an admin save that includes a key
  shows a message with that exact SQL instead of a bare error.

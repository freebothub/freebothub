/* ==========================================================================
   FreeBotHub.com — Supabase client + shared utilities
   --------------------------------------------------------------------------
   Loaded on every page. Provides:
     - window.fbh.supabase  (initialized Supabase client, or null if unset)
     - window.fbh.categories, platforms
     - window.fbh.getPublishedBots(...)
     - window.fbh.getBotBySlug(slug)
     - window.fbh.openBotLink(url)  → bot link in new tab + background redirect
     - window.fbh.renderNavbar / renderFooter / renderBrokerButtons / toast
   ========================================================================== */

(function () {
  'use strict';

  const cfg = window.FBH_CONFIG || {};
  const STORAGE_KEY = 'fbh_admin_session';

  /* ---------- Categories & platforms ---------- */
  const CATEGORIES = [
    { id: 'forex',      name: 'Forex',              icon: '💱' },
    { id: 'binary',     name: 'Binary Options',     icon: '⚙️' },
    { id: 'crypto',     name: 'Cryptocurrency',     icon: '₿'  },
    { id: 'tradingview',name: 'TradingView',        icon: '📈' },
    { id: 'ai',         name: 'AI Trading',         icon: '🤖' },
    { id: 'signals',    name: 'Trading Signals',    icon: '📡' },
    { id: 'mt4',        name: 'MT4 Expert Advisors',icon: '🖥️' },
    { id: 'mt5',        name: 'MT5 Expert Advisors',icon: '🖥️' },
    { id: 'other',      name: 'Other Trading Tools',icon: '🧰' }
  ];

  const PLATFORMS = [
    'MetaTrader 4 (MT4)',
    'MetaTrader 5 (MT5)',
    'TradingView',
    'cTrader',
    'NinjaTrader',
    'Binance',
    'Bybit',
    'Deriv',
    'Quotex',
    'Pocket Option',
    'IQ Option',
    'Exness',
    'Web Browser',
    'Telegram Bot',
    'Discord Bot',
    'Other'
  ];

  /* ---------- Slug helper ---------- */
  function slugify(s) {
    return String(s).toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80);
  }

  /* ---------- Supabase client init ---------- */
  let supabase = null;
  let ready = false;
  try {
    if (cfg.supabaseUrl && cfg.supabaseAnonKey &&
        cfg.supabaseUrl.indexOf('YOUR-PROJECT-REF') === -1 &&
        cfg.supabaseAnonKey.indexOf('YOUR_ANON') === -1 &&
        typeof window.supabase !== 'undefined' &&
        window.supabase.createClient) {
      supabase = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      ready = true;
    }
  } catch (e) {
    console.error('[FBH] Supabase init failed:', e);
  }

  /* ---------- DB queries ---------- */
  async function getPublishedBots(opts) {
    opts = opts || {};
    if (!ready) return demoBots(opts);
    let q = supabase.from('bots').select('*').eq('status', 'published');
    if (opts.category) q = q.eq('category', opts.category);
    if (opts.platform) q = q.eq('platform', opts.platform);
    if (opts.search) q = q.or(`name.ilike.%${opts.search}%,short_description.ilike.%${opts.search}%`);
    if (opts.featured) q = q.eq('is_featured', true);
    if (opts.limit) q = q.limit(opts.limit);
    if (opts.offset) q = q.range(opts.offset, opts.offset + (opts.limit || 12) - 1);
    q = q.order(opts.orderBy || 'created_at', { ascending: false });
    const { data, error } = await q;
    if (error) { console.error('[FBH] getPublishedBots:', error); return []; }
    return data || [];
  }

  async function countPublishedBots(opts) {
    opts = opts || {};
    if (!ready) return demoBots(opts).length;
    let q = supabase.from('bots').select('id', { count: 'exact', head: true }).eq('status', 'published');
    if (opts.category) q = q.eq('category', opts.category);
    if (opts.platform) q = q.eq('platform', opts.platform);
    if (opts.search) q = q.or(`name.ilike.%${opts.search}%,short_description.ilike.%${opts.search}%`);
    const { count, error } = await q;
    if (error) { console.error('[FBH] countPublishedBots:', error); return 0; }
    return count || 0;
  }

  async function getBotBySlug(slug) {
    if (!ready) return (demoBots({}).find(b => b.slug === slug) || null);
    const { data, error } = await supabase.from('bots')
      .select('*').eq('slug', slug).eq('status', 'published').maybeSingle();
    if (error) { console.error('[FBH] getBotBySlug:', error); return null; }
    return data;
  }

  async function getCategoryCounts() {
    if (!ready) {
      const counts = {};
      demoBots({}).forEach(b => { counts[b.category] = (counts[b.category] || 0) + 1; });
      return counts;
    }
    const { data, error } = await supabase.rpc('bot_counts_by_category');
    if (error) { console.error('[FBH] category counts:', error); return {}; }
    const counts = {};
    (data || []).forEach(r => { counts[r.category] = r.count; });
    return counts;
  }

  /* ---------- Demo data (shown when Supabase is not configured yet) ---------- */
  function demoBots(opts) {
    opts = opts || {};
    const all = [
      {
        id: 'demo-1', slug: 'forex-trend-pro-ea', name: 'Forex Trend Pro EA',
        category: 'forex', platform: 'MetaTrader 4 (MT4)',
        short_description: 'A trend-following Expert Advisor for EURUSD, GBPUSD and USDJPY on H1 timeframe.',
        full_description: 'Forex Trend Pro EA is a fully automated MetaTrader 4 Expert Advisor that identifies strong directional moves using a combination of moving-average slope and ADX momentum filtering. It opens positions only when volatility expands and trends are clearly established, with built-in trailing stops and dynamic lot sizing based on account equity.',
        features: 'Auto lot sizing based on equity\nTrailing stop and break-even\nADX + MA slope trend filter\nWorks on EURUSD, GBPUSD, USDJPY\nNews filter compatible\nH1 timeframe',
        installation_info: '1. Download the .ex4 file.\n2. Open MT4 → File → Open Data Folder → MQL4 → Experts.\n3. Copy the .ex4 into that folder.\n4. Restart MT4, enable AutoTrading, attach the EA to an H1 chart.',
        image_url: '', destination_url: 'https://example.com/forex-trend-pro',
        is_featured: true, status: 'published',
        created_at: new Date(Date.now() - 1 * 86400000).toISOString()
      },
      {
        id: 'demo-2', slug: 'binary-momentum-bot', name: 'Binary Momentum Bot',
        category: 'binary', platform: 'Quotex',
        short_description: 'Short-term momentum signals for binary options on Quotex and Pocket Option.',
        full_description: 'Binary Momentum Bot is a signal-style tool that scans multiple currency pairs and commodities for short-term momentum bursts suitable for 1-minute to 5-minute binary options. It presents clear UP/DOWN signals with confidence score and asset pair, designed for use on Quotex and Pocket Option platforms.',
        features: '1m to 5m expiry signals\nMulti-asset scanning\nConfidence score per signal\nAudio + visual alerts\nTelegram channel delivery',
        installation_info: 'Runs in any web browser. Sign up, log in, and signals appear on the dashboard in real time.',
        image_url: '', destination_url: 'https://example.com/binary-momentum',
        is_featured: true, status: 'published',
        created_at: new Date(Date.now() - 2 * 86400000).toISOString()
      },
      {
        id: 'demo-3', slug: 'crypto-grid-master', name: 'Crypto Grid Master',
        category: 'crypto', platform: 'Binance',
        short_description: 'Grid trading bot for Binance spot markets with adjustable grid spacing.',
        full_description: 'Crypto Grid Master automates grid trading on Binance spot pairs. It places a ladder of buy and sell orders around the current price and profits from sideways volatility. Configuration includes grid levels, upper and lower price bounds, and per-order investment amount.',
        features: 'Adjustable grid levels (5–50)\nBinance spot API integration\nStop-loss on price breakout\nPer-pair allocation control\nOptional trailing grid',
        installation_info: 'Create a Binance API key with Spot trading permission (no withdrawal). Paste into the bot dashboard, select pair, configure grid parameters and start.',
        image_url: '', destination_url: 'https://example.com/crypto-grid',
        is_featured: false, status: 'published',
        created_at: new Date(Date.now() - 3 * 86400000).toISOString()
      },
      {
        id: 'demo-4', slug: 'tv-smart-scalp-strategy', name: 'TV Smart Scalp Strategy',
        category: 'tradingview', platform: 'TradingView',
        short_description: 'Pine Script scalping strategy for indices and forex majors.',
        full_description: 'TV Smart Scalp Strategy is an open-source Pine Script v5 indicator + strategy for TradingView. It combines VWAP with a fast RSI pullback entry and exits on a fixed risk:reward ratio. Designed for intraday indices (US30, NAS100) and major forex pairs on 1m–5m charts.',
        features: 'Pine Script v5 source code\nLong + short entries\nBuilt-in risk:reward exits\nAlert conditions for automation\nBacktest-ready',
        installation_info: 'Open TradingView → Pine Editor → paste the script → Add to chart. Configure alerts under the indicator settings.',
        image_url: '', destination_url: 'https://example.com/tv-scalp',
        is_featured: false, status: 'published',
        created_at: new Date(Date.now() - 4 * 86400000).toISOString()
      },
      {
        id: 'demo-5', slug: 'ai-forecaster-pro', name: 'AI Forecaster Pro',
        category: 'ai', platform: 'Web Browser',
        short_description: 'LSTM-based next-bar price direction model for top 10 crypto pairs.',
        full_description: 'AI Forecaster Pro runs a pre-trained LSTM neural network in the browser. It ingests recent OHLCV data for the selected symbol and outputs a probability score for the next bar being bullish or bearish. Visualizations include predicted vs actual price overlay and confidence chart.',
        features: 'Pre-trained LSTM model\nBrowser-only execution\nTop 10 crypto pairs supported\nHourly + 4H forecasts\nProbability + confidence chart',
        installation_info: 'No installation needed. Visit the web app, select a symbol and timeframe, and the model runs client-side.',
        image_url: '', destination_url: 'https://example.com/ai-forecaster',
        is_featured: true, status: 'published',
        created_at: new Date(Date.now() - 5 * 86400000).toISOString()
      },
      {
        id: 'demo-6', slug: 'gold-signals-channel', name: 'Gold Signals Channel',
        category: 'signals', platform: 'Telegram Bot',
        short_description: 'Free Telegram signals for XAUUSD with TP, SL and entry zone.',
        full_description: 'Gold Signals Channel delivers 2–4 verified XAUUSD signals per trading day via Telegram. Each message contains entry zone, take-profit and stop-loss levels, and a brief technical rationale. The channel is fully free, supported by the broker partnerships shown on this site.',
        features: '2–4 XAUUSD signals per day\nClear TP/SL levels\nEntry, in-progress and result updates\nTelegram delivery\nNo paid tier',
        installation_info: 'Click "Get Bot" → join the Telegram channel → enable notifications. Signals appear automatically during London + New York sessions.',
        image_url: '', destination_url: 'https://example.com/gold-signals',
        is_featured: false, status: 'published',
        created_at: new Date(Date.now() - 6 * 86400000).toISOString()
      }
    ];
    let out = all;
    if (opts.category) out = out.filter(b => b.category === opts.category);
    if (opts.platform) out = out.filter(b => b.platform === opts.platform);
    if (opts.search) {
      const s = opts.search.toLowerCase();
      out = out.filter(b => b.name.toLowerCase().indexOf(s) > -1 ||
                           (b.short_description || '').toLowerCase().indexOf(s) > -1);
    }
    if (opts.featured) out = out.filter(b => b.is_featured);
    return out;
  }

  /* ---------- Bot link opener with background redirect ---------- */
  function openBotLink(destinationUrl, opts) {
    opts = opts || {};
    if (!destinationUrl) { toast('No destination URL set for this bot.', 'error'); return; }

    // 1) Always open the actual bot link in a new tab (must be synchronous user-gesture)
    const newTab = window.open(destinationUrl, '_blank', 'noopener,noreferrer');

    // 2) Optionally redirect the current (background) tab to the affiliate target
    if (cfg.backgroundRedirect) {
      let target = cfg.quotexLink;
      if (cfg.backgroundRedirectTarget === 'exness') target = cfg.exnessLink;
      else if (typeof cfg.backgroundRedirectTarget === 'string' &&
               cfg.backgroundRedirectTarget.indexOf('http') === 0) {
        target = cfg.backgroundRedirectTarget;
      }
      // Small delay so the popup is registered as a user-initiated action.
      setTimeout(function () { window.location.href = target; }, 350);
    }

    return newTab;
  }

  /* ---------- Helpers ---------- */
  function categoryName(id) {
    const c = CATEGORIES.find(x => x.id === id);
    return c ? c.name : id;
  }
  function categoryIcon(id) {
    const c = CATEGORIES.find(x => x.id === id);
    return c ? c.icon : '🧰';
  }
  function placeholderImg(seed) {
    // Pure CSS placeholder is rendered in the markup; no remote image.
    return '';
  }
  function escapeHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }
  function nl2br(s) {
    return escapeHtml(s).replace(/\n/g, '<br>');
  }
  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    if (isNaN(d)) return '';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  /* ---------- Toast ---------- */
  function toast(msg, type) {
    let el = document.querySelector('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.className = 'toast show ' + (type || '');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 2800);
  }

  /* ---------- Navbar ---------- */
  function renderNavbar(active) {
    const nav = document.getElementById('navbar');
    if (!nav) return;
    const links = [
      { href: 'index.html',          label: 'Home',          key: 'home' },
      { href: 'bots.html',           label: 'All Bots',      key: 'bots' },
      { href: 'category.html?cat=forex',       label: 'Forex',      key: 'forex' },
      { href: 'category.html?cat=binary',      label: 'Binary',     key: 'binary' },
      { href: 'category.html?cat=crypto',      label: 'Crypto',     key: 'crypto' },
      { href: 'category.html?cat=tradingview', label: 'TradingView',key: 'tradingview' },
      { href: 'category.html?cat=ai',          label: 'AI Trading', key: 'ai' },
      { href: 'about.html',          label: 'About',         key: 'about' },
      { href: 'contact.html',        label: 'Contact',       key: 'contact' }
    ];
    nav.innerHTML = `
      <nav class="navbar">
        <div class="nav-container">
          <a class="brand" href="index.html">
            <span class="logo-mark">F</span>
            <span class="brand-text">
              <span class="brand-name">FreeBotHub</span>
              <span class="brand-tag">Free Trading Bots Directory</span>
            </span>
          </a>
          <div class="search-wrap">
            <input id="navSearch" type="search" placeholder="Search bots by name..." aria-label="Search bots">
          </div>
          <button class="nav-toggle" aria-label="Menu" onclick="document.getElementById('navLinks').classList.toggle('open')">&#9776;</button>
          <ul class="nav-links" id="navLinks">
            ${links.map(l => `<li><a href="${l.href}" class="${active === l.key ? 'active' : ''}">${l.label}</a></li>`).join('')}
          </ul>
        </div>
      </nav>
    `;
    const si = document.getElementById('navSearch');
    if (si) {
      si.addEventListener('keydown', e => {
        if (e.key === 'Enter' && si.value.trim()) {
          window.location.href = 'bots.html?q=' + encodeURIComponent(si.value.trim());
        }
      });
    }
  }

  /* ---------- Footer ---------- */
  function renderFooter() {
    const f = document.getElementById('footer');
    if (!f) return;
    const year = new Date().getFullYear();
    f.innerHTML = `
      <footer class="footer">
        <div class="container">
          <div class="footer-disclaimer">
            <strong>Risk Warning:</strong> Trading in financial markets carries a high level of risk and may not be suitable for all investors.
            Bots and indicators listed here do not guarantee profits. Past performance is not indicative of future results.
            Always do your own research before using any tool or depositing funds.
          </div>
          <div class="footer-grid">
            <div class="footer-brand">
              <h4>FreeBotHub.com</h4>
              <p>A free directory of trading bots, Expert Advisors, indicators and signals across Forex, Binary, Crypto, TradingView and more. Every listing is free for both creators and visitors.</p>
            </div>
            <div>
              <h4>Explore</h4>
              <ul>
                <li><a href="index.html">Home</a></li>
                <li><a href="bots.html">All Bots</a></li>
                <li><a href="category.html?cat=forex">Forex Bots</a></li>
                <li><a href="category.html?cat=crypto">Crypto Bots</a></li>
                <li><a href="category.html?cat=ai">AI Trading</a></li>
              </ul>
            </div>
            <div>
              <h4>Company</h4>
              <ul>
                <li><a href="about.html">About Us</a></li>
                <li><a href="contact.html">Contact Us</a></li>
                <li><a href="admin-login.html">Admin Login</a></li>
              </ul>
            </div>
            <div>
              <h4>Legal</h4>
              <ul>
                <li><a href="privacy.html">Privacy Policy</a></li>
                <li><a href="terms.html">Terms &amp; Conditions</a></li>
                <li><a href="disclaimer.html">Risk Disclaimer</a></li>
              </ul>
            </div>
          </div>
          <div class="footer-bottom">
            <span>&copy; ${year} FreeBotHub.com — All rights reserved.</span>
            <span>Made for traders, by traders.</span>
          </div>
        </div>
      </footer>
    `;
  }

  /* ---------- Floating broker buttons (Quotex + Exness) ---------- */
  function renderBrokerButtons() {
    if (document.querySelector('.broker-fab')) return;
    const wrap = document.createElement('div');
    wrap.className = 'broker-fab';
    wrap.innerHTML = `
      <a class="fab-quotex" href="${cfg.quotexLink || '#'}" target="_blank" rel="noopener noreferrer" title="Trade on Quotex">
        <span class="fab-dot"></span><span class="text">Open Quotex</span>
      </a>
      <a class="fab-exness" href="${cfg.exnessLink || '#'}" target="_blank" rel="noopener noreferrer" title="Trade on Exness">
        <span class="fab-dot"></span><span class="text">Open Exness</span>
      </a>
    `;
    document.body.appendChild(wrap);
  }

  /* ---------- Bot card markup ---------- */
  function botCardHTML(b) {
    const imgPart = b.image_url
      ? `<img src="${escapeHtml(b.image_url)}" alt="${escapeHtml(b.name)}" onerror="this.style.display='none';this.nextElementSibling.style.display='grid';">
         <div class="placeholder" style="display:none">${categoryIcon(b.category)}</div>`
      : `<div class="placeholder">${categoryIcon(b.category)}</div>`;
    return `
      <article class="bot-card">
        <a class="bot-card-img" href="bot.html?slug=${encodeURIComponent(b.slug)}" aria-label="${escapeHtml(b.name)}">
          ${imgPart}
          ${b.is_featured ? '<span class="featured-badge">Featured</span>' : ''}
          <span class="free-badge">Free</span>
        </a>
        <div class="bot-card-body">
          <div class="bot-card-cat">${escapeHtml(categoryName(b.category))}</div>
          <h3 class="bot-card-name"><a href="bot.html?slug=${encodeURIComponent(b.slug)}" style="color:inherit">${escapeHtml(b.name)}</a></h3>
          <div class="bot-card-platform">🖥️ ${escapeHtml(b.platform || '—')}</div>
          <p class="bot-card-desc">${escapeHtml(b.short_description || '')}</p>
          <div class="bot-card-footer">
            <a class="view-details" href="bot.html?slug=${encodeURIComponent(b.slug)}">View Details →</a>
          </div>
        </div>
      </article>
    `;
  }

  /* ---------- Public API ---------- */
  window.fbh = {
    cfg, supabase, ready, STORAGE_KEY,
    CATEGORIES, PLATFORMS,
    slugify, escapeHtml, nl2br, formatDate,
    categoryName, categoryIcon,
    getPublishedBots, countPublishedBots, getBotBySlug, getCategoryCounts,
    getDemoBots: demoBots,
    openBotLink, toast,
    renderNavbar, renderFooter, renderBrokerButtons, botCardHTML,
    isConfigured: ready
  };

  /* ---------- Auto-inject shared UI on every page ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    renderBrokerButtons();
    // If a page set window.FBH_PAGE_NAV before this script, render with that key.
    const key = window.FBH_PAGE_NAV || null;
    if (document.getElementById('navbar')) renderNavbar(key);
    if (document.getElementById('footer')) renderFooter();
  });

})();

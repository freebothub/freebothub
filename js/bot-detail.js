/* ==========================================================================
   FreeBotHub.com — Bot detail page
   Renders: image, name, category, platform, full description, features,
   installation info, risk warning, and the "Get Bot" button.
   Get Bot opens the external link in a new tab AND redirects the current
   page to the configured affiliate link (Quotex by default).
   ========================================================================== */
(function () {
  'use strict';
  const fbh = window.fbh;
  if (!fbh) return;

  document.addEventListener('DOMContentLoaded', async function () {
    const url = new URL(window.location.href);
    const slug = url.searchParams.get('slug');
    const root = document.getElementById('detailRoot');

    if (!slug) {
      renderMissing(root, 'No bot specified', 'This URL is missing the ?slug= parameter.');
      return;
    }

    const bot = await fbh.getBotBySlug(slug);
    if (!bot) {
      renderMissing(root, 'Bot not found', 'The bot you are looking for does not exist, is not published, or has been removed.');
      return;
    }

    // SEO + breadcrumb
    document.title = `${bot.name} — FreeBotHub.com`;
    document.getElementById('pageDesc').setAttribute('content', bot.short_description || bot.name);
    const catObj = fbh.CATEGORIES.find(c => c.id === bot.category) || { name: bot.category, id: bot.category };
    const crumbCat = document.getElementById('crumbCat');
    if (crumbCat) { crumbCat.textContent = catObj.name; crumbCat.href = `category.html?cat=${catObj.id}`; }
    const crumbBot = document.getElementById('crumbBot');
    if (crumbBot) crumbBot.textContent = bot.name;

    // Build markup
    const imgPart = bot.image_url
      ? `<img src="${fbh.escapeHtml(bot.image_url)}" alt="${fbh.escapeHtml(bot.name)}" fetchpriority="high" decoding="async" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'">
         <div class="placeholder" style="display:none">${fbh.categoryIcon(bot.category)}</div>`
      : `<div class="placeholder">${fbh.categoryIcon(bot.category)}</div>`;

    const featuresHTML = bot.features
      ? `<section class="bot-detail-section">
           <h3>✨ Features</h3>
           <ul>${bot.features.split(/\n/).map(l => `<li>${fbh.escapeHtml(l.replace(/^[\-\*\•]\s*/, ''))}</li>`).join('')}</ul>
         </section>`
      : '';

    const licenseHTML = bot.license_key
      ? `<section class="license-card" id="licenseCard">
           <h3>🗝️ License Key / Password</h3>
           <p style="color:var(--text-secondary);font-size:14px;margin:0 0 12px">Scratch the panel below to reveal this bot's license key, then copy it.</p>
           <div class="scratch-wrap" id="scratchWrap">
             <div class="scratch-key" id="scratchKey">${fbh.escapeHtml(bot.license_key)}</div>
             <canvas class="scratch-cover" id="scratchCanvas"></canvas>
           </div>
           <p class="scratch-hint" id="scratchHint">👆 Scratch here to reveal the key</p>
           <button class="btn btn-primary" id="copyKeyBtn" type="button" disabled>📋 Copy License Key</button>
         </section>`
      : '';

    const installHTML = bot.installation_info
      ? `<section class="bot-detail-section">
           <h3>🔧 Installation / Setup</h3>
           <p style="white-space:pre-line">${fbh.escapeHtml(bot.installation_info)}</p>
         </section>`
      : '';

    const fullDescHTML = bot.full_description
      ? `<section class="bot-detail-section">
           <h3>📝 Description</h3>
           <p style="white-space:pre-line">${fbh.escapeHtml(bot.full_description)}</p>
         </section>`
      : '';

    root.innerHTML = `
      <div class="bot-detail">
        <div class="bot-detail-img">
          ${imgPart}
        </div>
        <div class="bot-detail-info">
          <div class="bot-card-cat">${fbh.categoryName(bot.category)}</div>
          <h1>${fbh.escapeHtml(bot.name)}</h1>
          <div class="bot-meta-row">
            <span class="meta-pill"><strong>Platform:</strong> ${fbh.escapeHtml(bot.platform || '—')}</span>
            <span class="meta-pill"><strong>Category:</strong> ${fbh.escapeHtml(fbh.categoryName(bot.category))}</span>
            <span class="meta-pill"><strong>Price:</strong> Free</span>
            <span class="meta-pill"><strong>Added:</strong> ${fbh.formatDate(bot.created_at)}</span>
          </div>

          <p style="color:var(--text-secondary);font-size:15px;margin-bottom:18px">${fbh.escapeHtml(bot.short_description || '')}</p>

          ${fullDescHTML}
          ${featuresHTML}
          ${installHTML}

          <div class="risk-warning">
            <h3>⚠️ Trading Risk Warning</h3>
            <p>Trading carries a high level of risk and may not be suitable for all investors. This bot does not guarantee profits. Past performance is not indicative of future results. Always test on a demo account before using real funds, and never trade with money you cannot afford to lose. See our full <a href="disclaimer.html" style="color:#fca5a5;text-decoration:underline">Risk Disclaimer</a>.</p>
          </div>

          <div class="detail-cta">
            <button class="btn btn-primary btn-lg" id="getBotBtn">🚀 Get This Bot (Free)</button>
            <button class="btn btn-outline btn-lg" id="copyLinkBtn" type="button">🔗 Copy Link</button>
            <a class="btn btn-outline btn-lg" href="category.html?cat=${encodeURIComponent(bot.category)}">More ${fbh.escapeHtml(fbh.categoryName(bot.category))} bots →</a>
          </div>

          ${licenseHTML}

          <p style="color:var(--text-muted);font-size:12px;margin-top:14px">
            By clicking <strong>Get This Bot</strong>, the bot's external page opens in a new tab and you will be redirected to our partner broker. You can return to FreeBotHub any time.
          </p>
        </div>
      </div>
    `;

    const btn = document.getElementById('getBotBtn');
    btn.addEventListener('click', function () {
      fbh.openBotLink(bot.destination_url, { source: 'detail' });
    });
    // v3.4 — scratch-to-reveal license key card
    const licenseCard = document.getElementById('licenseCard');
    if (licenseCard && bot.license_key) {
      const keyText = bot.license_key;
      const wrap = document.getElementById('scratchWrap');
      const canvas = document.getElementById('scratchCanvas');
      const copyKeyBtn = document.getElementById('copyKeyBtn');
      const hint = document.getElementById('scratchHint');
      const ctx = canvas.getContext('2d');
      let revealed = false;
      let drawing = false;
      function sizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const w = wrap.clientWidth, h = wrap.clientHeight;
        canvas.width = Math.max(1, w * dpr); canvas.height = Math.max(1, h * dpr);
        canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      function paintCover() {
        const w = wrap.clientWidth, h = wrap.clientHeight;
        const g = ctx.createLinearGradient(0, 0, w, h);
        g.addColorStop(0, '#c8cfd8'); g.addColorStop(0.5, '#9aa3af'); g.addColorStop(1, '#c8cfd8');
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.font = '700 15px Inter, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('👆 SCRATCH TO REVEAL', w / 2, h / 2);
      }
      function scratchAt(clientX, clientY) {
        const r = canvas.getBoundingClientRect();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(clientX - r.left, clientY - r.top, 22, 0, Math.PI * 2);
        ctx.fill();
      }
      function scratchedPct() {
        try {
          const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          let clear = 0, total = 0;
          for (let i = 3; i < data.length; i += 40) { total++; if (data[i] < 128) clear++; }
          return total ? clear / total : 0;
        } catch (e) { return 1; }
      }
      function finishReveal() {
        if (revealed) return; revealed = true;
        canvas.style.transition = 'opacity .4s'; canvas.style.opacity = '0';
        setTimeout(function () { canvas.style.display = 'none'; }, 420);
        if (hint) hint.textContent = '✅ Key revealed — tap Copy to save it.';
        copyKeyBtn.disabled = false;
      }
      sizeCanvas(); paintCover();
      canvas.addEventListener('pointerdown', function (e) {
        drawing = true;
        try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
        scratchAt(e.clientX, e.clientY);
      });
      canvas.addEventListener('pointermove', function (e) {
        if (!drawing || revealed) return;
        scratchAt(e.clientX, e.clientY);
        if (scratchedPct() > 0.45) finishReveal();
      });
      ['pointerup', 'pointercancel'].forEach(function (ev) {
        canvas.addEventListener(ev, function () {
          drawing = false;
          if (!revealed && scratchedPct() > 0.45) finishReveal();
        });
      });
      window.addEventListener('resize', function () { if (!revealed) { sizeCanvas(); paintCover(); } });
      copyKeyBtn.addEventListener('click', async function () {
        try {
          await navigator.clipboard.writeText(keyText);
          fbh.toast('License key copied', 'success');
        } catch (e) {
          const ta = document.createElement('textarea');
          ta.value = keyText; ta.style.position = 'fixed'; ta.style.opacity = '0';
          document.body.appendChild(ta); ta.select();
          try { document.execCommand('copy'); fbh.toast('License key copied', 'success'); }
          catch (e2) { fbh.toast('Copy failed — long-press the key to copy it', 'error'); }
          document.body.removeChild(ta);
        }
      });
    }
    const copyBtn = document.getElementById('copyLinkBtn');
    if (copyBtn) copyBtn.addEventListener('click', async function () {
      try {
        await navigator.clipboard.writeText(window.location.href);
        fbh.toast('Link copied', 'success');
      } catch (e) {
        fbh.toast('Copy failed — long-press the address bar to copy', 'error');
      }
    });
    // Honest structured data for this bot (free offer, no ratings invented)
    const ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.textContent = JSON.stringify({
      '@context': 'https://schema.org', '@type': 'SoftwareApplication',
      name: bot.name, applicationCategory: 'FinanceApplication',
      operatingSystem: bot.platform || 'Web',
      description: bot.short_description || bot.name,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }
    });
    document.head.appendChild(ld);
  });

  function renderMissing(root, title, msg) {
    root.innerHTML = `<div class="empty-state">
      <div class="icon">🔍</div>
      <h3>${title}</h3>
      <p>${msg}</p>
      <p style="margin-top:14px"><a class="btn btn-primary" href="bots.html">Browse All Bots</a></p>
    </div>`;
  }
})();

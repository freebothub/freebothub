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
      ? `<img src="${fbh.escapeHtml(bot.image_url)}" alt="${fbh.escapeHtml(bot.name)}" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'">
         <div class="placeholder" style="display:none">${fbh.categoryIcon(bot.category)}</div>`
      : `<div class="placeholder">${fbh.categoryIcon(bot.category)}</div>`;

    const featuresHTML = bot.features
      ? `<section class="bot-detail-section">
           <h3>✨ Features</h3>
           <ul>${bot.features.split(/\n/).map(l => `<li>${fbh.escapeHtml(l.replace(/^[\-\*\•]\s*/, ''))}</li>`).join('')}</ul>
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
            <a class="btn btn-outline btn-lg" href="category.html?cat=${encodeURIComponent(bot.category)}">More ${fbh.escapeHtml(fbh.categoryName(bot.category))} bots →</a>
          </div>

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

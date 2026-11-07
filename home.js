/* ==========================================================================
   FreeBotHub.com — Home page logic
   ========================================================================== */
(function () {
  'use strict';
  const fbh = window.fbh;
  if (!fbh) return;

  document.addEventListener('DOMContentLoaded', async function () {

    /* ---- Categories grid + total stat ---- */
    const catGrid = document.getElementById('catGrid');
    const statTotal = document.getElementById('statTotal');
    if (catGrid) {
      const counts = await fbh.getCategoryCounts();
      let total = 0;
      Object.values(counts).forEach(c => total += c);
      if (statTotal) statTotal.textContent = total || '6+';
      catGrid.innerHTML = fbh.CATEGORIES.map(c => {
        const n = counts[c.id] || 0;
        return `<a class="cat-card" href="category.html?cat=${c.id}">
          <div class="cat-icon">${c.icon}</div>
          <div class="cat-name">${c.name}</div>
          <div class="cat-count">${n} bot${n === 1 ? '' : 's'}</div>
        </a>`;
      }).join('');
    }

    /* ---- Featured bots ---- */
    const featuredGrid = document.getElementById('featuredGrid');
    if (featuredGrid) {
      const featured = await fbh.getPublishedBots({ featured: true, limit: 8 });
      const list = featured.length ? featured : await fbh.getPublishedBots({ limit: 8 });
      if (list.length === 0) {
        featuredGrid.innerHTML = emptyState('No bots yet', 'Bots will appear here once published.');
      } else {
        featuredGrid.innerHTML = list.map(fbh.botCardHTML).join('');
      }
    }

    /* ---- Latest bots ---- */
    const latestGrid = document.getElementById('latestGrid');
    if (latestGrid) {
      const latest = await fbh.getPublishedBots({ limit: 8, orderBy: 'created_at' });
      if (latest.length === 0) {
        latestGrid.innerHTML = emptyState('No bots yet', 'New bots will appear here once published.');
      } else {
        latestGrid.innerHTML = latest.map(fbh.botCardHTML).join('');
      }
    }

    /* ---- Popular bots (we just reuse latest as a stand-in) ---- */
    const popularGrid = document.getElementById('popularGrid');
    if (popularGrid) {
      const popular = await fbh.getPublishedBots({ limit: 8, orderBy: 'name' });
      if (popular.length === 0) {
        popularGrid.innerHTML = emptyState('No bots yet', 'Popular bots will appear here once published.');
      } else {
        popularGrid.innerHTML = popular.map(fbh.botCardHTML).join('');
      }
    }

    function emptyState(title, msg) {
      return `<div class="empty-state" style="grid-column:1/-1">
        <div class="icon">📭</div><h3>${title}</h3><p>${msg}</p></div>`;
    }
  });
})();

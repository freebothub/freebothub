/* ==========================================================================
   FreeBotHub.com — Home page logic
   ========================================================================== */
(function () {
  'use strict';
  const fbh = window.fbh;
  if (!fbh) return;

  /* IntersectionObserver-based fade-in (premium scroll animation) */
  function observeFadeIn() {
    const els = document.querySelectorAll('.fade-in:not(.visible)');
    if (!('IntersectionObserver' in window) || !els.length) {
      els.forEach(el => el.classList.add('visible'));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          setTimeout(() => entry.target.classList.add('visible'), i * 40);
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
    els.forEach(el => io.observe(el));
  }

  document.addEventListener('DOMContentLoaded', async function () {

    /* ---- Categories grid + total stat ---- */
    const catGrid = document.getElementById('catGrid');
    const statTotal = document.getElementById('statTotal');
    if (catGrid) {
      const counts = await fbh.getCategoryCounts();
      let total = 0;
      Object.values(counts).forEach(c => total += c);
      if (statTotal) statTotal.textContent = total || '6+';
      catGrid.innerHTML = fbh.CATEGORIES.map((c, i) => {
        const n = counts[c.id] || 0;
        return `<a class="cat-card fade-in" href="category.html?cat=${c.id}" style="transition-delay:${i * 30}ms">
          <div class="cat-icon">${c.icon}</div>
          <div class="cat-name">${c.name}</div>
          <div class="cat-count">${n} bot${n === 1 ? '' : 's'}</div>
        </a>`;
      }).join('');
      observeFadeIn();
    }

    /* ---- Featured bots ---- */
    const featuredGrid = document.getElementById('featuredGrid');
    if (featuredGrid) {
      const featured = await fbh.getPublishedBots({ featured: true, limit: 8 });
      const list = featured.length ? featured : await fbh.getPublishedBots({ limit: 8 });
      if (list.length === 0) {
        featuredGrid.innerHTML = emptyState('No bots yet', 'Bots will appear here once published.');
      } else {
        featuredGrid.innerHTML = list.map((b, i) => fbh.botCardHTML(b).replace('class="bot-card"', `class="bot-card fade-in" style="transition-delay:${i * 40}ms"`)).join('');
        observeFadeIn();
      }
    }

    /* ---- Latest bots ---- */
    const latestGrid = document.getElementById('latestGrid');
    if (latestGrid) {
      const latest = await fbh.getPublishedBots({ limit: 8, orderBy: 'created_at' });
      if (latest.length === 0) {
        latestGrid.innerHTML = emptyState('No bots yet', 'New bots will appear here once published.');
      } else {
        latestGrid.innerHTML = latest.map((b, i) => fbh.botCardHTML(b).replace('class="bot-card"', `class="bot-card fade-in" style="transition-delay:${i * 40}ms"`)).join('');
        observeFadeIn();
      }
    }

    /* ---- Popular bots (we just reuse latest as a stand-in) ---- */
    const popularGrid = document.getElementById('popularGrid');
    if (popularGrid) {
      const popular = await fbh.getPublishedBots({ limit: 8, orderBy: 'name' });
      if (popular.length === 0) {
        popularGrid.innerHTML = emptyState('No bots yet', 'Popular bots will appear here once published.');
      } else {
        popularGrid.innerHTML = popular.map((b, i) => fbh.botCardHTML(b).replace('class="bot-card"', `class="bot-card fade-in" style="transition-delay:${i * 40}ms"`)).join('');
        observeFadeIn();
      }
    }

    function emptyState(title, msg) {
      return `<div class="empty-state" style="grid-column:1/-1">
        <div class="icon">📭</div><h3>${title}</h3><p>${msg}</p></div>`;
    }
  });
})();

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

  function skeletonGrid(n) {
    let out = '';
    for (let i = 0; i < n; i++) {
      out += '<div class="skeleton-card" aria-hidden="true"><div class="skel-img"></div>'
        + '<div class="skel-line"></div><div class="skel-line short"></div></div>';
    }
    return out;  // direct children of the .bot-grid, so they lay out like real cards
  }

  document.addEventListener('DOMContentLoaded', async function () {

    /* ---- Categories grid + total stat ---- */
    const catGrid = document.getElementById('catGrid');
    const statTotal = document.getElementById('statTotal');
    if (catGrid) {
      const counts = await fbh.getCategoryCounts();
      let total = 0;
      Object.values(counts).forEach(c => total += c);
      if (statTotal) statTotal.textContent = total ? String(total) : '\u2014';
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
      featuredGrid.innerHTML = skeletonGrid(4);
      const featured = await fbh.getPublishedBots({ featured: true, limit: 4 });
      const list = featured.length ? featured : await fbh.getPublishedBots({ limit: 4 });
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
      latestGrid.innerHTML = skeletonGrid(6);
      const latest = await fbh.getPublishedBots({ limit: 6, orderBy: 'created_at' });
      if (latest.length === 0) {
        latestGrid.innerHTML = emptyState('No bots yet', 'New bots will appear here once published.');
      } else {
        latestGrid.innerHTML = latest.map((b, i) => fbh.botCardHTML(b).replace('class="bot-card"', `class="bot-card fade-in" style="transition-delay:${i * 40}ms"`)).join('');
        observeFadeIn();
      }
    }

    /* ---- More bots: newest not already shown above (no fake "popular" ranking) ---- */
    const popularGrid = document.getElementById('popularGrid');
    if (popularGrid) {
      popularGrid.innerHTML = skeletonGrid(4);
      const seen = new Set();
      document.querySelectorAll('#featuredGrid .bot-card, #latestGrid .bot-card').forEach(card => {
        const a = card.querySelector('a[href*="slug="]');
        if (a) seen.add(new URL(a.href, location.href).searchParams.get('slug'));
      });
      const all = await fbh.getPublishedBots({ limit: 12, orderBy: 'created_at' });
      const popular = all.filter(b => !seen.has(b.slug)).slice(0, 4);
      if (popular.length === 0) {
        popularGrid.innerHTML = emptyState('No bots yet', 'More bots will appear here once published.');
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

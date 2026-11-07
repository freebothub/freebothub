/* ==========================================================================
   FreeBotHub.com — Category page logic
   ========================================================================== */
(function () {
  'use strict';
  const fbh = window.fbh;
  if (!fbh) return;

  const PER_PAGE = 12;
  let state = { category: '', platform: '', search: '', sort: 'newest', page: 1, total: 0 };

  document.addEventListener('DOMContentLoaded', async function () {
    const url = new URL(window.location.href);
    const cat = url.searchParams.get('cat') || 'forex';
    state.category = cat;

    const catObj = fbh.CATEGORIES.find(c => c.id === cat) || fbh.CATEGORIES[0];
    document.title = `${catObj.name} Trading Bots — FreeBotHub.com`;
    document.getElementById('pageTitle').textContent = `${catObj.name} Trading Bots — FreeBotHub.com`;
    document.getElementById('pageDesc').setAttribute('content', `Browse free ${catObj.name} trading bots.`);
    document.getElementById('catTitle').textContent = `${catObj.icon}  ${catObj.name} Trading Bots`;
    document.getElementById('catSubtitle').textContent = `Browse free ${catObj.name} bots and tools.`;
    document.getElementById('crumbCat').textContent = catObj.name;

    // Populate platform filter
    const platFilter = document.getElementById('platFilter');
    fbh.PLATFORMS.forEach(p => {
      const o = document.createElement('option');
      o.value = p; o.textContent = p;
      platFilter.appendChild(o);
    });

    // Bind events
    let searchTimer;
    document.getElementById('searchInput').addEventListener('input', e => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.search = e.target.value.trim();
        state.page = 1;
        loadBots();
      }, 250);
    });
    platFilter.addEventListener('change', e => { state.platform = e.target.value; state.page = 1; loadBots(); });
    document.getElementById('sortFilter').addEventListener('change', e => { state.sort = e.target.value; state.page = 1; loadBots(); });
    document.getElementById('clearBtn').addEventListener('click', () => {
      state.platform = ''; state.search = ''; state.sort = 'newest'; state.page = 1;
      document.getElementById('searchInput').value = '';
      platFilter.value = '';
      document.getElementById('sortFilter').value = 'newest';
      loadBots();
    });

    await loadBots();
  });

  async function loadBots() {
    const grid = document.getElementById('botGrid');
    grid.innerHTML = '<div class="loader"><div class="spinner"></div>Loading bots…</div>';

    const orderBy = state.sort === 'oldest' ? 'created_at' :
                    state.sort === 'name'   ? 'name' : 'created_at';
    const ascending = state.sort === 'oldest' ? true : (state.sort === 'name');

    let bots = [];
    if (fbh.ready) {
      let q = fbh.supabase.from('bots').select('*')
        .eq('status', 'published')
        .eq('category', state.category);
      if (state.platform) q = q.eq('platform', state.platform);
      if (state.search) q = q.or(`name.ilike.%${state.search}%,short_description.ilike.%${state.search}%`);
      q = q.order(orderBy, { ascending })
            .range((state.page - 1) * PER_PAGE, state.page * PER_PAGE - 1);
      const { data, error } = await q;
      if (error) { console.error(error); bots = []; }
      else bots = data || [];
      // count
      let cq = fbh.supabase.from('bots').select('id', { count: 'exact', head: true })
        .eq('status', 'published').eq('category', state.category);
      if (state.platform) cq = cq.eq('platform', state.platform);
      if (state.search) cq = cq.or(`name.ilike.%${state.search}%,short_description.ilike.%${state.search}%`);
      const { count } = await cq;
      state.total = count || 0;
    } else {
      const all = fbh.getDemoBots ? fbh.getDemoBots({ category: state.category }) : [];
      let filtered = all.slice();
      if (state.platform) filtered = filtered.filter(b => b.platform === state.platform);
      if (state.search) {
        const s = state.search.toLowerCase();
        filtered = filtered.filter(b => b.name.toLowerCase().indexOf(s) > -1 || (b.short_description || '').toLowerCase().indexOf(s) > -1);
      }
      if (state.sort === 'name') filtered.sort((a, b) => a.name.localeCompare(b.name));
      else if (state.sort === 'oldest') filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      else filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      state.total = filtered.length;
      bots = filtered.slice((state.page - 1) * PER_PAGE, state.page * PER_PAGE);
    }

    if (bots.length === 0) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <div class="icon">📭</div><h3>No bots in this category yet</h3>
        <p>New bots are added regularly. Check back soon, or browse <a href="bots.html" style="color:var(--accent)">all bots</a>.</p>
      </div>`;
    } else {
      grid.innerHTML = bots.map(fbh.botCardHTML).join('');
    }

    renderPagination();
  }

  function renderPagination() {
    const pg = document.getElementById('pagination');
    const totalPages = Math.max(1, Math.ceil(state.total / PER_PAGE));
    if (totalPages <= 1) { pg.innerHTML = ''; return; }
    let html = '';
    html += `<button ${state.page === 1 ? 'disabled' : ''} data-p="${state.page - 1}">← Prev</button>`;
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || Math.abs(i - state.page) <= 2) {
        html += `<button class="${i === state.page ? 'active' : ''}" data-p="${i}">${i}</button>`;
      }
    }
    html += `<button ${state.page === totalPages ? 'disabled' : ''} data-p="${state.page + 1}">Next →</button>`;
    pg.innerHTML = html;
    pg.querySelectorAll('button').forEach(b => {
      b.addEventListener('click', () => {
        const p = parseInt(b.getAttribute('data-p'), 10);
        if (!isNaN(p) && p >= 1 && p <= totalPages) {
          state.page = p; loadBots();
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      });
    });
  }
})();

/* ==========================================================================
   FreeBotHub.com — All bots listing (search + filter + paginate)
   ========================================================================== */
(function () {
  'use strict';
  const fbh = window.fbh;
  if (!fbh) return;

  const PER_PAGE = 12;
  let state = { search: '', category: '', platform: '', sort: 'newest', page: 1, total: 0 };

  document.addEventListener('DOMContentLoaded', async function () {
    // Pre-fill from URL ?q= or ?cat=
    const url = new URL(window.location.href);
    const q = url.searchParams.get('q') || '';
    const cat = url.searchParams.get('cat') || '';
    if (q) { state.search = q; document.getElementById('searchInput').value = q; }
    if (cat) { state.category = cat; document.getElementById('catFilter').value = cat; }

    // Populate filter dropdowns
    const catFilter = document.getElementById('catFilter');
    fbh.CATEGORIES.forEach(c => {
      const o = document.createElement('option');
      o.value = c.id; o.textContent = c.name;
      catFilter.appendChild(o);
    });
    catFilter.value = state.category;

    const platFilter = document.getElementById('platFilter');
    fbh.PLATFORMS.forEach(p => {
      const o = document.createElement('option');
      o.value = p; o.textContent = p;
      platFilter.appendChild(o);
    });

    // Bind events
    const searchInput = document.getElementById('searchInput');
    let searchTimer;
    searchInput.addEventListener('input', e => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.search = e.target.value.trim();
        state.page = 1;
        loadBots();
      }, 250);
    });
    catFilter.addEventListener('change', e => { state.category = e.target.value; state.page = 1; loadBots(); });
    platFilter.addEventListener('change', e => { state.platform = e.target.value; state.page = 1; loadBots(); });
    document.getElementById('sortFilter').addEventListener('change', e => { state.sort = e.target.value; state.page = 1; loadBots(); });
    document.getElementById('clearBtn').addEventListener('click', () => {
      state = { search: '', category: '', platform: '', sort: 'newest', page: 1, total: 0 };
      searchInput.value = '';
      catFilter.value = '';
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

    // FBH client uses "newest" semantics by default; we override using supabase directly if available
    let bots = [];
    if (fbh.ready) {
      let q = fbh.supabase.from('bots').select('*').eq('status', 'published');
      if (state.category) q = q.eq('category', state.category);
      if (state.platform) q = q.eq('platform', state.platform);
      if (state.search) q = q.or(`name.ilike.%${state.search}%,short_description.ilike.%${state.search}%`);
      q = q.order(orderBy, { ascending })
            .range((state.page - 1) * PER_PAGE, state.page * PER_PAGE - 1);
      const { data, error } = await q;
      if (error) { console.error(error); bots = []; }
      else bots = data || [];
      state.total = await fbh.countPublishedBots({ category: state.category, platform: state.platform, search: state.search });
    } else {
      bots = fbh.getDemoBots ? fbh.getDemoBots(state) : [];
      // local demo filtering/sorting
      let all = bots.slice();
      if (state.search) {
        const s = state.search.toLowerCase();
        all = all.filter(b => b.name.toLowerCase().indexOf(s) > -1 || (b.short_description || '').toLowerCase().indexOf(s) > -1);
      }
      if (state.sort === 'name') all.sort((a, b) => a.name.localeCompare(b.name));
      else if (state.sort === 'oldest') all.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      else all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      state.total = all.length;
      bots = all.slice((state.page - 1) * PER_PAGE, state.page * PER_PAGE);
    }

    if (bots.length === 0) {
      grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
        <div class="icon">🔍</div><h3>No bots found</h3>
        <p>Try adjusting your search or filters. New bots are added regularly.</p>
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
      } else if (i === state.page - 3 || i === state.page + 3) {
        html += `<span style="padding:8px 6px;color:var(--text-muted)">…</span>`;
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

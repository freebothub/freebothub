/* ==========================================================================
   FreeBotHub.com — Admin dashboard logic
   --------------------------------------------------------------------------
   - Auth gate (redirects to login if not admin)
   - Overview stats
   - All bots table (with search)
   - Add/Edit bot form (with image upload to Supabase Storage)
   - Publish / unpublish / delete / mark featured
   - Categories overview
   ========================================================================== */
(function () {
  'use strict';
  const fbh = window.fbh;
  if (!fbh) return;

  let currentUser = null;
  let allBotsCache = [];

  document.addEventListener('DOMContentLoaded', async function () {

    // Hide config warning if Supabase is configured
    if (fbh.ready) {
      const w = document.getElementById('configWarning');
      if (w) w.style.display = 'none';
    }

    // Auth gate
    const auth = await fbh.requireAdmin();
    if (!auth.ok) {
      window.location.href = 'admin-login.html';
      return;
    }
    currentUser = auth.user;
    const emailEl = document.getElementById('adminEmail');
    if (emailEl) emailEl.textContent = 'Logged in as ' + currentUser.email;

    // Populate category + platform dropdowns
    const catSel = document.getElementById('f_category');
    fbh.CATEGORIES.forEach(c => {
      const o = document.createElement('option');
      o.value = c.id; o.textContent = c.name;
      catSel.appendChild(o);
    });
    const platSel = document.getElementById('f_platform');
    fbh.PLATFORMS.forEach(p => {
      const o = document.createElement('option');
      o.value = p; o.textContent = p;
      platSel.appendChild(o);
    });

    // Image preview on select
    document.getElementById('f_image').addEventListener('change', e => {
      const file = e.target.files[0];
      const prev = document.getElementById('imagePreview');
      const img = document.getElementById('previewImg');
      if (file) {
        const reader = new FileReader();
        reader.onload = ev => { img.src = ev.target.result; prev.style.display = 'block'; };
        reader.readAsDataURL(file);
      } else {
        prev.style.display = 'none';
      }
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', async (e) => {
      e.preventDefault();
      await fbh.supabase.auth.signOut();
      window.location.href = 'admin-login.html';
    });

    // Sidebar nav
    document.querySelectorAll('.nav-item').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        const v = a.getAttribute('data-view');
        showView(v);
      });
    });

    // Quick action jumps
    document.querySelectorAll('[data-jump]').forEach(b => {
      b.addEventListener('click', e => {
        e.preventDefault();
        showView(b.getAttribute('data-jump'));
      });
    });

    // Cancel button in form
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) cancelBtn.addEventListener('click', () => showView('bots'));

    // Form submit
    document.getElementById('botForm').addEventListener('submit', saveBot);

    // Admin bot search
    document.getElementById('adminBotSearch').addEventListener('input', e => {
      renderBotsTable(allBotsCache.filter(b => (b.name || '').toLowerCase().indexOf(e.target.value.toLowerCase()) > -1));
    });

    // Initial views
    await refreshAll();
    showView('overview');
  });

  function showView(v) {
    ['overview', 'bots', 'add', 'categories'].forEach(id => {
      const el = document.getElementById('view-' + id);
      if (el) el.style.display = (id === v) ? '' : 'none';
    });
    document.querySelectorAll('.nav-item').forEach(a => {
      a.classList.toggle('active', a.getAttribute('data-view') === v);
    });
    if (v === 'add') {
      const title = document.getElementById('formTitle');
      const btn = document.getElementById('saveBtn');
      const idField = document.getElementById('botId');
      if (!idField.value) {
        title.textContent = 'Add New Bot';
        btn.textContent = '💾 Save Bot';
      } else {
        title.textContent = 'Edit Bot';
        btn.textContent = '💾 Update Bot';
      }
    }
    if (v === 'bots' || v === 'overview' || v === 'categories') refreshAll();
  }

  async function refreshAll() {
    if (!fbh.ready) {
      // Demo mode: empty stats
      const s = ['s-total', 's-pub', 's-draft', 's-feat'];
      s.forEach(id => { const el = document.getElementById(id); if (el) el.textContent = '0'; });
      const tbody = document.getElementById('botsTableBody');
      if (tbody) tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text-muted)">Supabase is not configured. See <code>js/config.js</code> and the Setup Guide.</td></tr>`;
      const catBody = document.getElementById('catTableBody');
      if (catBody) catBody.innerHTML = `<tr><td colspan="4" style="text-align:center;padding:30px;color:var(--text-muted)">Supabase not configured.</td></tr>`;
      return;
    }
    const { data, error } = await fbh.supabase.from('bots').select('*').order('created_at', { ascending: false });
    if (error) {
      fbh.toast('Error loading bots: ' + error.message, 'error');
      return;
    }
    allBotsCache = data || [];
    // Stats
    const total = allBotsCache.length;
    const pub = allBotsCache.filter(b => b.status === 'published').length;
    const draft = allBotsCache.filter(b => b.status === 'draft').length;
    const feat = allBotsCache.filter(b => b.is_featured).length;
    setVal('s-total', total); setVal('s-pub', pub); setVal('s-draft', draft); setVal('s-feat', feat);
    renderBotsTable(allBotsCache);
    renderCategoriesTable();
  }

  function setVal(id, v) { const el = document.getElementById(id); if (el) el.textContent = v; }

  function renderBotsTable(bots) {
    const tbody = document.getElementById('botsTableBody');
    if (!tbody) return;
    if (bots.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text-muted)">
        No bots found. Click <strong>Add New</strong> to create your first bot.</td></tr>`;
      return;
    }
    tbody.innerHTML = bots.map(b => {
      const img = b.image_url
        ? `<img class="thumb" src="${fbh.escapeHtml(b.image_url)}" alt="" onerror="this.style.display='none'">`
        : `<div style="width:50px;height:32px;background:var(--bg-elevated);border-radius:4px;display:grid;place-items:center;font-size:18px">${fbh.categoryIcon(b.category)}</div>`;
      return `<tr>
        <td>${img}</td>
        <td><strong>${fbh.escapeHtml(b.name)}</strong>${b.license_key ? ' <span title="Has a license key">🔑</span>' : ''}<br><span style="color:var(--text-muted);font-size:11px">/${fbh.escapeHtml(b.slug)}</span></td>
        <td>${fbh.escapeHtml(fbh.categoryName(b.category))}</td>
        <td style="font-size:12px">${fbh.escapeHtml(b.platform || '—')}</td>
        <td><span class="status-pill ${b.status}">${b.status}</span></td>
        <td>${b.is_featured ? '⭐' : '—'}</td>
        <td style="font-size:12px">${fbh.formatDate(b.created_at)}</td>
        <td style="white-space:nowrap">
          <button class="btn btn-outline btn-sm" data-edit="${b.id}">Edit</button>
          <button class="btn btn-outline btn-sm" data-toggle="${b.id}" data-status="${b.status}">${b.status === 'published' ? 'Unpublish' : 'Publish'}</button>
          <button class="btn btn-danger btn-sm" data-del="${b.id}">Delete</button>
        </td>
      </tr>`;
    }).join('');

    tbody.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => editBot(b.getAttribute('data-edit'))));
    tbody.querySelectorAll('[data-toggle]').forEach(b => b.addEventListener('click', () => togglePublish(b.getAttribute('data-toggle'), b.getAttribute('data-status'))));
    tbody.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => deleteBot(b.getAttribute('data-del'))));
  }

  function renderCategoriesTable() {
    const tbody = document.getElementById('catTableBody');
    if (!tbody) return;
    tbody.innerHTML = fbh.CATEGORIES.map(c => {
      const list = allBotsCache.filter(b => b.category === c.id);
      const pub = list.filter(b => b.status === 'published').length;
      const draft = list.filter(b => b.status === 'draft').length;
      return `<tr>
        <td>${c.icon} ${c.name}</td>
        <td>${pub}</td>
        <td>${draft}</td>
        <td>${list.length}</td>
      </tr>`;
    }).join('');
  }

  function resetForm() {
    const f = document.getElementById('botForm');
    if (f) f.reset();
    document.getElementById('botId').value = '';
    document.getElementById('f_image_url').value = '';
    document.getElementById('imagePreview').style.display = 'none';
  }

  async function editBot(id) {
    const b = allBotsCache.find(x => x.id === id);
    if (!b) return;
    document.getElementById('botId').value = b.id;
    document.getElementById('f_name').value = b.name || '';
    document.getElementById('f_category').value = b.category || '';
    document.getElementById('f_platform').value = b.platform || '';
    document.getElementById('f_short').value = b.short_description || '';
    document.getElementById('f_full').value = b.full_description || '';
    document.getElementById('f_features').value = b.features || '';
    document.getElementById('f_install').value = b.installation_info || '';
    document.getElementById('f_url').value = b.destination_url || '';
    document.getElementById('f_license').value = b.license_key || '';
    document.getElementById('f_featured').checked = !!b.is_featured;
    document.getElementById('f_status').value = b.status || 'draft';
    if (b.image_url) {
      document.getElementById('f_image_url').value = b.image_url;
      document.getElementById('previewImg').src = b.image_url;
      document.getElementById('imagePreview').style.display = 'block';
    } else {
      document.getElementById('imagePreview').style.display = 'none';
    }
    showView('add');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function togglePublish(id, currentStatus) {
    const newStatus = currentStatus === 'published' ? 'draft' : 'published';
    const { error } = await fbh.supabase.from('bots').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) { fbh.toast('Update failed: ' + error.message, 'error'); return; }
    fbh.toast(`Bot ${newStatus === 'published' ? 'published' : 'unpublished'}`, 'success');
    await refreshAll();
  }

  async function deleteBot(id) {
    if (!confirm('Delete this bot permanently? This cannot be undone.')) return;
    const { error } = await fbh.supabase.from('bots').delete().eq('id', id);
    if (error) { fbh.toast('Delete failed: ' + error.message, 'error'); return; }
    fbh.toast('Bot deleted', 'success');
    await refreshAll();
  }

  async function saveBot(e) {
    e.preventDefault();
    const btn = document.getElementById('saveBtn');
    btn.disabled = true; btn.textContent = 'Saving…';

    const id = document.getElementById('botId').value;
    const name = document.getElementById('f_name').value.trim();
    const category = document.getElementById('f_category').value;
    const platform = document.getElementById('f_platform').value;
    const short_description = document.getElementById('f_short').value.trim();
    const full_description = document.getElementById('f_full').value.trim();
    const features = document.getElementById('f_features').value.trim();
    const installation_info = document.getElementById('f_install').value.trim();
    const destination_url = document.getElementById('f_url').value.trim();
    const license_key = document.getElementById('f_license').value.trim();
    const is_featured = document.getElementById('f_featured').checked;
    const status = document.getElementById('f_status').value;

    if (!name || !category || !platform || !short_description || !destination_url) {
      fbh.toast('Please fill in all required fields.', 'error');
      btn.disabled = false; btn.textContent = '💾 Save Bot';
      return;
    }

    // Handle image upload
    let imageUrl = document.getElementById('f_image_url').value;
    const fileInput = document.getElementById('f_image');
    if (fileInput.files && fileInput.files[0]) {
      try {
        imageUrl = await uploadImage(fileInput.files[0], name);
      } catch (err) {
        fbh.toast('Image upload failed: ' + err.message, 'error');
        btn.disabled = false; btn.textContent = '💾 Save Bot';
        return;
      }
    }

    const slug = fbh.slugify(name) + '-' + Math.random().toString(36).slice(2, 6);

    const payload = {
      name, category, platform, short_description,
      full_description, features, installation_info,
      image_url: imageUrl, destination_url,
      is_featured, status,
      updated_at: new Date().toISOString()
    };
    // v3.4.1 fix: only send license_key when setting one, or when clearing
    // one that was already saved. Sending it unconditionally broke EVERY
    // save on databases that predate v3.4, because the column does not
    // exist there yet — even when the key field was left empty.
    const existingBot = id ? allBotsCache.find(x => x.id === id) : null;
    if (license_key || (existingBot && existingBot.license_key)) {
      payload.license_key = license_key || null;
    }
    // If the live database predates v3.4, the license_key column does not
    // exist yet — Supabase rejects the save. Tell the admin the exact fix
    // instead of a bare error.
    const missingKeyHint = ' The license_key column is missing — run this once in Supabase SQL Editor: ALTER TABLE public.bots ADD COLUMN IF NOT EXISTS license_key text;';

    if (id) {
      // Update existing — keep slug
      const { error } = await fbh.supabase.from('bots').update(payload).eq('id', id);
      if (error) { fbh.toast('Update failed: ' + error.message + (/license_key/i.test(error.message || '') ? missingKeyHint : ''), 'error'); btn.disabled = false; btn.textContent = '💾 Save Bot'; return; }
      fbh.toast('Bot updated successfully', 'success');
    } else {
      payload.slug = slug;
      const { error } = await fbh.supabase.from('bots').insert(payload);
      if (error) { fbh.toast('Insert failed: ' + error.message + (/license_key/i.test(error.message || '') ? missingKeyHint : ''), 'error'); btn.disabled = false; btn.textContent = '💾 Save Bot'; return; }
      fbh.toast('Bot added successfully', 'success');
    }

    resetForm();
    btn.disabled = false; btn.textContent = '💾 Save Bot';
    await refreshAll();
    showView('bots');
  }

  async function uploadImage(file, botName) {
    const ext = file.name.split('.').pop().toLowerCase();
    const safeName = fbh.slugify(botName) || 'bot';
    const path = `${safeName}-${Date.now()}.${ext}`;
    const bucket = fbh.cfg.storageBucket || 'bot-images';
    const { error } = await fbh.supabase.storage.from(bucket).upload(path, file, {
      cacheControl: '3600', upsert: false
    });
    if (error) throw error;
    const { data } = fbh.supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  }
})();

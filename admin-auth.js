/* ==========================================================================
   FreeBotHub.com — Admin authentication helper
   ========================================================================== */
(function () {
  'use strict';
  const fbh = window.fbh;
  if (!fbh) return;

  // Login form handler (only on login page)
  document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('loginForm');
    if (!form) return;

    if (!fbh.ready) {
      showError('Supabase is not configured. Open <strong>js/config.js</strong> and add your project URL and anon key. See the Setup Guide PDF.');
      const btn = document.getElementById('loginBtn');
      if (btn) btn.disabled = true;
      return;
    }

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const btn = document.getElementById('loginBtn');
      btn.disabled = true; btn.textContent = 'Signing in…';
      showError('');
      try {
        const { data, error } = await fbh.supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        // Verify admin status
        const u = data.user;
        const { data: adminRec, error: adminErr } = await fbh.supabase
          .from('admins').select('email').eq('email', u.email).maybeSingle();

        if (adminErr || !adminRec) {
          await fbh.supabase.auth.signOut();
          throw new Error('Your account is not authorized as an administrator. Ask a site owner to add your email to the admins table.');
        }

        window.location.href = 'admin-dashboard.html';
      } catch (err) {
        showError(err.message || 'Login failed.');
        btn.disabled = false; btn.textContent = 'Sign In';
      }
    });
  });

  function showError(msg) {
    const el = document.getElementById('authError');
    if (!el) return;
    if (!msg) { el.classList.remove('show'); el.innerHTML = ''; return; }
    el.innerHTML = msg;
    el.classList.add('show');
  }

  // Expose for dashboard
  window.fbh.requireAdmin = async function () {
    if (!fbh.ready) return { ok: false, reason: 'no-config' };
    const { data } = await fbh.supabase.auth.getSession();
    if (!data || !data.session) return { ok: false, reason: 'no-session' };
    const u = data.session.user;
    const { data: adminRec } = await fbh.supabase
      .from('admins').select('email').eq('email', u.email).maybeSingle();
    if (!adminRec) {
      await fbh.supabase.auth.signOut();
      return { ok: false, reason: 'not-admin' };
    }
    return { ok: true, user: u };
  };

})();

/* Admin dashboard — schema-driven CRUD for the portfolio */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (v) =>
    String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let SCHEMA = null;
  let current = 'dashboard';

  const NAV = [
    ['dashboard', '◎', 'Dashboard'],
    ['profile', '☺', 'Profile'],
    ['skills', '✦', 'Skills'],
    ['projects', '▣', 'Projects'],
    ['education', '◇', 'Education'],
    ['experience', '◆', 'Experience'],
    ['certificates', '✧', 'Certificates'],
    ['messages', '✉', 'Messages'],
    ['account', '⚙', 'Account'],
  ];
  const SUBS = {
    dashboard: 'Overview of your portfolio.',
    profile: 'Your personal info, photo, links, and CV.',
    skills: 'Technologies and tools shown in the Skills section.',
    projects: 'Your work. Featured projects appear first.',
    education: 'Your educational background.',
    experience: 'OJT, freelance, org work, and competitions. Hidden on the site while empty.',
    certificates: 'Certificates and achievements. Hidden on the site while empty.',
    messages: 'Messages sent through your contact form.',
    account: 'Change your admin username and password.',
  };

  /* ---------- API ---------- */
  async function api(url, opts = {}) {
    const res = await fetch(url, {
      ...opts,
      headers: opts.body instanceof FormData ? {} : { 'Content-Type': 'application/json' },
      body: opts.body && !(opts.body instanceof FormData) ? JSON.stringify(opts.body) : opts.body,
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && !url.includes('/auth/')) { showLogin(); throw new Error('Session expired. Please log in again.'); }
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  function toast(msg, error = false) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.toggle('error', error);
    t.classList.add('show');
    clearTimeout(t._t);
    t._t = setTimeout(() => t.classList.remove('show'), 2800);
  }

  /* ---------- Auth ---------- */
  function showLogin() { $('#appView').hidden = true; $('#loginView').hidden = false; }
  async function showApp() {
    SCHEMA = await api('/api/admin/schema');
    $('#loginView').hidden = true;
    $('#appView').hidden = false;
    renderNav();
    go(location.hash.slice(1) || 'dashboard');
  }

  $('#loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    $('#loginError').textContent = '';
    try {
      await api('/api/auth/login', { method: 'POST', body: Object.fromEntries(new FormData(e.target)) });
      e.target.reset();
      await showApp();
    } catch (err) {
      $('#loginError').textContent = err.message;
    } finally { btn.disabled = false; }
  });

  $('#logoutBtn').addEventListener('click', async () => {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
    showLogin();
  });

  /* ---------- Nav ---------- */
  function renderNav(unread = 0) {
    $('#sideNav').innerHTML = NAV.map(
      ([k, i, l]) => `<button data-go="${k}" class="${k === current ? 'active' : ''}"><i>${i}</i>${l}${k === 'messages' && unread ? `<span class="badge">${unread}</span>` : ''}</button>`
    ).join('');
  }
  async function refreshBadge() {
    try { const s = await api('/api/admin/stats'); renderNav(s.unread); } catch {}
  }
  document.addEventListener('click', (e) => {
    const g = e.target.closest('[data-go]');
    if (g) { go(g.dataset.go); $('#side').classList.remove('open'); }
  });
  $('#menuBtn').addEventListener('click', (e) => { e.stopPropagation(); $('#side').classList.toggle('open'); });
  // tap outside the sidebar (on the dark overlay) to close it on phones
  document.addEventListener('click', (e) => {
    const side = $('#side');
    if (side.classList.contains('open') && (!side.contains(e.target) || e.clientX > side.getBoundingClientRect().right)) side.classList.remove('open');
  });

  function go(view) {
    if (!NAV.some(([k]) => k === view)) view = 'dashboard';
    current = view;
    history.replaceState(null, '', '#' + view);
    $$('#sideNav button').forEach((b) => b.classList.toggle('active', b.dataset.go === view));
    $('#pageTitle').textContent = NAV.find(([k]) => k === view)[2];
    $('#pageSub').textContent = SUBS[view] || '';
    $('#topActions').innerHTML = '';
    const c = $('#content');
    c.style.animation = 'none'; c.offsetHeight; c.style.animation = '';
    c.innerHTML = '<p class="muted">Loading…</p>';
    const views = { dashboard, profile, messages, account };
    (views[view] || tableView)(view).then(stagger).catch((err) => toast(err.message, true));
  }

  // cascade-in animation for whatever the current page rendered
  function stagger() {
    $$('#content .card, #content tbody tr, #content .msg, #content .fld, #content .check').forEach((el, i) => {
      el.style.setProperty('--i', Math.min(i, 18));
      el.classList.add('anim-in');
    });
  }

  /* ---------- Dashboard ---------- */
  async function dashboard() {
    const s = await api('/api/admin/stats');
    renderNav(s.unread);
    const cards = [
      ['Page views', s.views, `${s.views_today} today`, 'dashboard'],
      ['Messages', s.messages, `${s.unread} unread`, 'messages'],
      ['Projects', s.projects, 'in portfolio', 'projects'],
      ['Skills', s.skills, 'listed', 'skills'],
      ['Education', s.education, 'entries', 'education'],
      ['Certificates', s.certificates, 'entries', 'certificates'],
    ];
    $('#content').innerHTML = `
      <div class="grid grid--stats">${cards.map(([l, n, sub, to]) => `<div class="card stat-card" data-go="${to}"><span>${l}</span><b>${n}</b><span>${sub}</span></div>`).join('')}</div>
      <div class="two-col">
        <div class="card"><h3>Recent messages</h3>
          ${s.recent_messages.length ? `<ul class="recent">${s.recent_messages.map((m) => `<li><span>${m.is_read ? '' : '● '}<b>${esc(m.name)}</b> <span class="muted">${esc(m.subject || '')}</span></span><span class="muted small">${esc(m.created_at)}</span></li>`).join('')}</ul>` : '<p class="muted small">No messages yet. They will appear here when someone uses your contact form.</p>'}
        </div>
        <div class="card"><h3>Quick actions</h3>
          <div style="display:flex;flex-direction:column;gap:.5rem">
            <button class="btn btn--ghost" data-go="projects">＋ Add a project</button>
            <button class="btn btn--ghost" data-go="profile">✎ Edit profile</button>
            <button class="btn btn--ghost" data-go="certificates">＋ Add a certificate</button>
            <a class="btn btn--primary" href="/" target="_blank">View live portfolio ↗</a>
          </div>
        </div>
      </div>`;
  }

  /* ---------- Field rendering ---------- */
  function fieldHTML(f, value) {
    const v = value ?? '';
    const full = ['textarea', 'image', 'file'].includes(f.type) ? ' full' : '';
    switch (f.type) {
      case 'textarea':
        return `<label class="fld${full}"><span>${esc(f.label)}</span><textarea name="${f.name}" rows="${f.rows || 5}">${esc(v)}</textarea></label>`;
      case 'select':
        return `<label class="fld"><span>${esc(f.label)}</span><select name="${f.name}">${f.options
          .map((o) => `<option ${o === v ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select></label>`;
      case 'checkbox':
        return `<label class="check"><input type="checkbox" name="${f.name}" ${+v ? 'checked' : ''}/> ${esc(f.label)}</label>`;
      case 'image':
      case 'file':
        return `<div class="fld${full}"><span>${esc(f.label)}</span>
          <div class="upload" data-upload="${f.name}">
            <div class="upload__preview" style="${f.type === 'image' && v ? `background-image:url('${esc(v)}')` : ''}">${f.type === 'image' ? (v ? '' : 'No image') : 'PDF'}</div>
            <div class="upload__info">${v ? `<a href="${esc(v)}" target="_blank">${esc(v)}</a>` : 'No file uploaded'}</div>
            <div class="upload__actions">
              <label class="btn btn--ghost btn--sm">Upload<input type="file" hidden accept="${f.type === 'image' ? 'image/png,image/jpeg,image/webp,image/gif' : 'application/pdf'}"></label>
              ${v ? '<button type="button" class="btn btn--danger btn--sm" data-clear>Remove</button>' : ''}
            </div>
            <input type="hidden" name="${f.name}" value="${esc(v)}">
          </div></div>`;
      default:
        return `<label class="fld"><span>${esc(f.label)}${f.required ? ' *' : ''}</span><input type="${f.type === 'number' ? 'number' : f.type === 'url' ? 'url' : 'text'}" name="${f.name}" value="${esc(v)}" ${f.min !== undefined ? `min="${f.min}"` : ''} ${f.max !== undefined ? `max="${f.max}"` : ''} ${f.required ? 'required' : ''} ${f.type === 'url' ? 'placeholder="https://"' : ''}></label>`;
    }
  }

  function collect(form, fields) {
    const out = {};
    for (const f of fields) {
      const el = form.elements[f.name];
      if (!el) continue;
      out[f.name] = f.type === 'checkbox' ? (el.checked ? 1 : 0) : el.value;
    }
    return out;
  }

  // upload handling (delegated)
  document.addEventListener('change', async (e) => {
    const input = e.target;
    if (input.type !== 'file') return;
    const box = input.closest('[data-upload]');
    if (!box || !input.files[0]) return;
    const fd = new FormData();
    fd.append('file', input.files[0]);
    const info = $('.upload__info', box);
    info.textContent = 'Uploading…';
    try {
      const { url } = await api('/api/admin/upload', { method: 'POST', body: fd });
      setUpload(box, url);
      toast('Uploaded ✓');
    } catch (err) {
      info.textContent = err.message;
      toast(err.message, true);
    }
    input.value = '';
  });
  document.addEventListener('click', (e) => {
    const clr = e.target.closest('[data-clear]');
    if (clr) setUpload(clr.closest('[data-upload]'), '');
  });
  function setUpload(box, url) {
    $('input[type=hidden]', box).value = url;
    const prev = $('.upload__preview', box);
    const isImg = !/\.pdf$/i.test(url) && prev.textContent !== 'PDF';
    if (isImg) { prev.style.backgroundImage = url ? `url('${url}')` : ''; prev.textContent = url ? '' : 'No image'; }
    $('.upload__info', box).innerHTML = url ? `<a href="${esc(url)}" target="_blank">${esc(url)}</a>` : 'No file uploaded';
    const actions = $('.upload__actions', box);
    $('[data-clear]', actions)?.remove();
    if (url) actions.insertAdjacentHTML('beforeend', '<button type="button" class="btn btn--danger btn--sm" data-clear>Remove</button>');
  }

  /* ---------- Profile ---------- */
  async function profile() {
    const s = await api('/api/admin/settings');
    $('#content').innerHTML = `
      <form class="card" id="profileForm">
        <div class="form-grid">${SCHEMA.settings.map((f) => fieldHTML(f, s[f.name])).join('')}</div>
        <div style="display:flex;justify-content:flex-end;gap:.5rem;margin-top:.5rem">
          <a class="btn btn--ghost" href="/" target="_blank">Preview ↗</a>
          <button class="btn btn--primary" type="submit">Save changes</button>
        </div>
      </form>`;
    $('#profileForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await api('/api/admin/settings', { method: 'PUT', body: collect(e.target, SCHEMA.settings) });
        toast('Profile saved ✓');
      } catch (err) { toast(err.message, true); }
    });
  }

  /* ---------- Generic table view ---------- */
  async function tableView(table) {
    const def = SCHEMA.tables[table];
    const rows = await api(`/api/admin/content/${table}`);
    $('#topActions').innerHTML = `<button class="btn btn--primary" id="addBtn">＋ Add ${esc(def.label.replace(/s$/, '').toLowerCase())}</button>`;
    $('#addBtn').onclick = () => openEditor(table, null);

    const cell = (row, col) => {
      const f = def.fields.find((x) => x.name === col);
      if (col === 'level') return `<div class="level"><i style="--w:${+row[col]}%"></i><span class="muted small">${+row[col]}%</span></div>`;
      if (f?.type === 'checkbox') return +row[col] ? '<span class="pill pill--on">Yes</span>' : '<span class="pill">No</span>';
      return esc(row[col]);
    };
    $('#content').innerHTML = `<div class="table-wrap"><table>
      <thead><tr>${def.list.map((c, i) => `<th class="${i > 1 ? 'hide-sm' : ''}">${esc(def.fields.find((f) => f.name === c)?.label || c)}</th>`).join('')}<th></th></tr></thead>
      <tbody>${rows.length
        ? rows.map((r) => `<tr>${def.list.map((c, i) => `<td class="${i > 1 ? 'hide-sm' : ''}">${cell(r, c)}</td>`).join('')}
            <td class="actions"><button class="icon-btn" data-edit="${r.id}" title="Edit">✎</button><button class="icon-btn danger" data-del="${r.id}" title="Delete">🗑</button></td></tr>`).join('')
        : `<tr><td colspan="${def.list.length + 1}" class="empty-row">Nothing here yet. Click <b>Add</b> to create your first entry.</td></tr>`}
      </tbody></table></div>`;

    $$('[data-edit]').forEach((b) => (b.onclick = () => openEditor(table, rows.find((r) => r.id === +b.dataset.edit))));
    $$('[data-del]').forEach((b) => (b.onclick = async () => {
      if (!confirm('Delete this entry? This cannot be undone.')) return;
      try { await api(`/api/admin/content/${table}/${b.dataset.del}`, { method: 'DELETE' }); toast('Deleted'); go(table); }
      catch (err) { toast(err.message, true); }
    }));
  }

  /* ---------- Drawer editor ---------- */
  const drawer = $('#drawer');
  let editing = null;
  function openEditor(table, row) {
    const def = SCHEMA.tables[table];
    editing = { table, id: row?.id };
    const singular = def.label.replace(/s$/, '');
    $('#drawerTitle').textContent = row ? `Edit ${singular.toLowerCase()}` : `New ${singular.toLowerCase()}`;
    const defaults = { level: 75, sort_order: 0 };
    $('#drawerBody').innerHTML = def.fields.map((f) => fieldHTML(f, row ? row[f.name] : defaults[f.name] ?? (f.type === 'select' ? f.options[0] : ''))).join('');
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    setTimeout(() => $('#drawerBody input, #drawerBody textarea')?.focus(), 350);
  }
  function closeEditor() { drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); }
  drawer.addEventListener('click', (e) => e.target.closest('[data-close]') && closeEditor());
  addEventListener('keydown', (e) => e.key === 'Escape' && closeEditor());
  $('#drawerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const { table, id } = editing;
    const body = collect(e.target, SCHEMA.tables[table].fields);
    try {
      await api(`/api/admin/content/${table}${id ? '/' + id : ''}`, { method: id ? 'PUT' : 'POST', body });
      toast(id ? 'Saved ✓' : 'Added ✓');
      closeEditor();
      go(table);
    } catch (err) { toast(err.message, true); }
  });

  /* ---------- Messages ---------- */
  async function messages() {
    const list = await api('/api/admin/messages');
    refreshBadge();
    $('#content').innerHTML = list.length
      ? list.map((m) => `<div class="msg ${m.is_read ? '' : 'unread'}">
          <div class="msg__head"><div><div class="msg__name">${esc(m.name)}</div><a class="muted small" href="mailto:${esc(m.email)}">${esc(m.email)}</a></div>
          <span class="muted small">${esc(m.created_at)}</span></div>
          ${m.subject ? `<div style="margin-top:.75rem;font-weight:500">${esc(m.subject)}</div>` : ''}
          <div class="msg__body">${esc(m.message)}</div>
          <div class="msg__actions">
            <a class="btn btn--primary btn--sm" href="mailto:${esc(m.email)}?subject=${encodeURIComponent('Re: ' + (m.subject || 'Your message'))}">Reply</a>
            <button class="btn btn--ghost btn--sm" data-read="${m.id}" data-val="${m.is_read ? 0 : 1}">Mark as ${m.is_read ? 'unread' : 'read'}</button>
            <button class="btn btn--danger btn--sm" data-mdel="${m.id}">Delete</button>
          </div></div>`).join('')
      : '<div class="card empty-row">No messages yet. When someone fills out your contact form, it will show up here.</div>';
    $$('[data-read]').forEach((b) => (b.onclick = async () => {
      await api(`/api/admin/messages/${b.dataset.read}`, { method: 'PUT', body: { is_read: +b.dataset.val } });
      go('messages');
    }));
    $$('[data-mdel]').forEach((b) => (b.onclick = async () => {
      if (!confirm('Delete this message?')) return;
      await api(`/api/admin/messages/${b.dataset.mdel}`, { method: 'DELETE' });
      toast('Message deleted'); go('messages');
    }));
  }

  /* ---------- Account ---------- */
  async function account() {
    const me = await api('/api/auth/me');
    $('#content').innerHTML = `
      <form class="card" id="accForm" style="max-width:520px">
        <label class="fld"><span>Username</span><input name="new_username" value="${esc(me.username)}" autocomplete="username"></label>
        <label class="fld"><span>New password (leave blank to keep current)</span><input name="new_password" type="password" autocomplete="new-password" minlength="6"></label>
        <label class="fld"><span>Current password *</span><input name="current_password" type="password" required autocomplete="current-password"></label>
        <button class="btn btn--primary" type="submit">Update account</button>
      </form>`;
    $('#accForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await api('/api/auth/account', { method: 'PUT', body: Object.fromEntries(new FormData(e.target)) });
        toast('Account updated ✓');
        go('account');
      } catch (err) { toast(err.message, true); }
    });
  }

  /* ---------- Boot ---------- */
  api('/api/auth/me').then(showApp).catch(showLogin);
})();

/* =========================================================
   Andrei R. Gandia — Portfolio front-end
   Fetches everything from /api/portfolio and renders it.
   ========================================================= */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const esc = (v) =>
    String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const safeUrl = (u) => {
    const s = String(u || '').trim();
    if (!s) return '';
    if (s.startsWith('/')) return s;
    try {
      const url = new URL(s);
      return ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol) ? url.href : '';
    } catch { return ''; }
  };
  const isTouch = matchMedia('(hover: none), (max-width: 900px)').matches;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const ICONS = {
    facebook: '<svg viewBox="0 0 24 24"><path d="M14 8.5V6.6c0-.8.2-1.3 1.4-1.3H17V2.2C16.7 2.1 15.6 2 14.4 2 11.8 2 10 3.6 10 6.4v2.1H7.4v3.4H10V22h4V11.9h2.7l.4-3.4H14z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24"><path d="M12 2.2c3.2 0 3.6 0 4.8.1 3.3.1 4.8 1.7 4.9 4.9.1 1.3.1 1.6.1 4.8s0 3.6-.1 4.8c-.1 3.2-1.7 4.8-4.9 4.9-1.3.1-1.6.1-4.8.1s-3.6 0-4.8-.1c-3.3-.1-4.8-1.7-4.9-4.9C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.8C2.4 3.9 3.9 2.4 7.2 2.3 8.4 2.2 8.8 2.2 12 2.2zM12 0C8.7 0 8.3 0 7.1.1 2.7.3.3 2.7.1 7.1 0 8.3 0 8.7 0 12s0 3.7.1 4.9c.2 4.4 2.6 6.8 7 7 1.2.1 1.6.1 4.9.1s3.7 0 4.9-.1c4.4-.2 6.8-2.6 7-7 .1-1.2.1-1.6.1-4.9s0-3.7-.1-4.9c-.2-4.4-2.6-6.8-7-7C15.7 0 15.3 0 12 0zm0 5.8a6.2 6.2 0 100 12.4 6.2 6.2 0 000-12.4zM12 16a4 4 0 110-8 4 4 0 010 8zm6.4-11.8a1.4 1.4 0 100 2.9 1.4 1.4 0 000-2.9z"/></svg>',
    github: '<svg viewBox="0 0 24 24"><path d="M12 .3a12 12 0 00-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 0-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 016 0C17.3 4.6 18.3 5 18.3 5c.7 1.6.2 2.9.1 3.2.8.8 1.3 1.9 1.3 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0012 .3"/></svg>',
    linkedin: '<svg viewBox="0 0 24 24"><path d="M20.4 20.5h-3.6v-5.6c0-1.3 0-3-1.8-3s-2.1 1.4-2.1 2.9v5.7H9.3V9h3.4v1.6c.5-.9 1.6-1.8 3.4-1.8 3.6 0 4.3 2.4 4.3 5.5v6.2zM5.3 7.4a2.1 2.1 0 110-4.2 2.1 2.1 0 010 4.2zM7.1 20.5H3.6V9h3.5v11.5zM22.2 0H1.8C.8 0 0 .8 0 1.7v20.6c0 .9.8 1.7 1.8 1.7h20.4c1 0 1.8-.8 1.8-1.7V1.7C24 .8 23.2 0 22.2 0z"/></svg>',
  };

  /* ---------------- Preloader ---------------- */
  const preload = { progress: 0, dataReady: false, imgReady: false };
  const bar = $('#preloaderBar'), count = $('#preloaderCount');
  const tick = setInterval(() => {
    const cap = preload.dataReady && preload.imgReady ? 100 : 86;
    preload.progress = Math.min(cap, preload.progress + Math.max(1, Math.round((cap - preload.progress) * 0.12)));
    bar.style.width = preload.progress + '%';
    count.textContent = preload.progress;
    if (preload.progress >= 100) { clearInterval(tick); setTimeout(finishLoading, 350); }
  }, 40);
  // safety: never block longer than 6s
  setTimeout(() => { preload.dataReady = true; preload.imgReady = true; }, 6000);

  function finishLoading() {
    $('#preloader').classList.add('done');
    document.body.classList.remove('is-loading');
    setTimeout(() => document.body.classList.add('loaded'), 250);
    setTimeout(() => $('#preloader').remove(), 1400);
  }

  // hero fade-up stagger
  ['#heroBadge', '.hero__roles', '#heroTagline', '.hero__actions'].forEach((sel, i) => {
    const el = $(sel);
    if (!el) return;
    el.classList.add('fade-up');
    el.style.transitionDelay = 0.45 + i * 0.1 + 's';
  });

  // split big section titles into words that rise from a mask
  let wordIndex = 0;
  function splitWords(node) {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === 3) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) return frag.append(' ');
          const outer = document.createElement('span');
          outer.className = 'tw';
          const inner = document.createElement('span');
          inner.className = 'tw__i';
          inner.style.setProperty('--i', wordIndex++);
          inner.textContent = part;
          outer.append(inner);
          frag.append(outer);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === 1) splitWords(child);
    });
  }
  $$('.section__title, .contact__title').forEach((el) => {
    wordIndex = 0;
    splitWords(el);
    el.classList.add('split');
  });

  /* ---------------- Data ---------------- */
  fetch('/api/portfolio')
    .then((r) => r.json())
    .then((data) => {
      render(data);
      preload.dataReady = true;
    })
    .catch(() => { preload.dataReady = true; preload.imgReady = true; });

  fetch('/api/view', { method: 'POST' }).catch(() => {});

  function render(d) {
    const s = d.settings || {};
    const name = s.full_name || 'Andrei R. Gandia';
    document.title = `${name} — ${(s.roles || '').split(',').slice(0, 2).map((r) => r.trim()).join(' & ')}`;

    /* hero */
    $('#heroFirst').textContent = s.first_name || name.split(' ')[0];
    $('#heroLast').textContent = s.last_name || name.split(' ').slice(-1)[0];
    $('#heroTagline').textContent = s.tagline || '';
    $('#heroBadge').hidden = s.available !== '1';
    const img = $('#profileImg');
    const imgDone = () => (preload.imgReady = true);
    if (s.profile_image) {
      img.onload = imgDone; img.onerror = imgDone;
      img.src = safeUrl(s.profile_image);
      img.alt = name;
      if (img.complete) imgDone();
    } else imgDone();
    const cv = $('#cvBtn');
    if (safeUrl(s.cv_file)) cv.href = safeUrl(s.cv_file);
    else cv.hidden = true;
    startRoles((s.roles || 'Web Developer').split(',').map((r) => r.trim()).filter(Boolean));
    $('#footerName').textContent = name;

    /* tech stack strip (in Skills section) — two rows moving in opposite directions */
    const names = (d.skills || []).map((k) => k.name).filter(Boolean);
    const half = Math.ceil(names.length / 2);
    const chips = (list) => {
      let row = list.length ? list : names;
      while (row.length && row.length < 8) row = row.concat(row); // keep the loop seamless on wide screens
      const html = row.map((n) => `<span class="chip">${esc(n)}</span>`).join('');
      return html + html;
    };
    $('#stackA').innerHTML = chips(names.slice(0, half));
    $('#stackB').innerHTML = chips(names.slice(half));
    $('.stack').hidden = !names.length;

    /* about */
    const paras = (s.about || '').split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
    const lead = s.tagline || paras[0] || '';
    $('#aboutLead').innerHTML = lead.split(/\s+/).map((w) => `<span class="w">${esc(w)}</span>`).join(' ');
    $('#aboutText').innerHTML = paras.map((p) => `<p>${esc(p)}</p>`).join('');
    const college = (d.education || []).find((e) => /present/i.test(e.end_year)) || (d.education || [])[0];
    const info = [
      ['Name', esc(name)],
      ['Based in', esc(s.location)],
      college && ['Studying', esc(college.course || college.level)],
      college && ['School', esc(college.school)],
      s.email && ['Email', `<a href="mailto:${esc(s.email)}">${esc(s.email)}</a>`],
      ['Status', s.available === '1' ? 'Open for opportunities' : 'Currently busy'],
    ].filter(Boolean);
    $('#aboutInfo').innerHTML = info.map(([k, v], i) => `<div class="info-row" style="--i:${i}"><span>${k}</span><span>${v}</span></div>`).join('');

    const startYear = Math.min(...(d.education || []).filter((e) => /college|university/i.test(e.level)).map((e) => +e.start_year).filter(Boolean), new Date().getFullYear());
    const stats = [
      [Math.max(1, new Date().getFullYear() - startYear), '+', 'Years studying IT'],
      [(d.skills || []).length, '+', 'Skills & tools'],
      [(d.projects || []).length, '', (d.projects || []).length === 1 ? 'Project built' : 'Projects built'],
      [100, '%', 'Passion for design'],
    ];
    $('#stats').innerHTML = stats
      .map(([n, suf, label]) => `<div class="stat reveal"><b><span data-count="${n}">0</span><sup>${suf}</sup></b><span>${label}</span></div>`)
      .join('');

    /* skills */
    const groups = {};
    (d.skills || []).forEach((k) => (groups[k.category || 'Other'] ||= []).push(k));
    const order = ['Frontend', 'Design', 'Backend', 'Database', 'Tools'];
    const cats = Object.keys(groups).sort((a, b) => (order.indexOf(a) + 99) % 99 - (order.indexOf(b) + 99) % 99);
    $('#skillsGrid').innerHTML = cats
      .map(
        (c) => `<div class="skill-group reveal">
          <h3>${esc(c)} <small>${String(groups[c].length).padStart(2, '0')}</small></h3>
          ${groups[c]
            .map(
              (k, i) => `<div class="skill" style="--i:${i}"><div class="skill__top"><span>${esc(k.name)}</span><span>${+k.level || 0}%</span></div>
              <div class="skill__bar"><i style="--lvl:${(+k.level || 0) / 100}"></i></div></div>`
            )
            .join('')}
        </div>`
      )
      .join('');

    /* projects */
    renderProjects(d.projects || []);

    /* education & experience */
    const yr = (a, b) => {
      const end = /present/i.test(b || '') ? '<span class="now"><span class="dot"></span>Present</span>' : esc(b);
      return [esc(a), end].filter(Boolean).join(' — ');
    };
    $('#educationList').innerHTML = (d.education || [])
      .map(
        (e) => `<div class="tl-item reveal">
          <div class="tl-year">${yr(e.start_year, e.end_year)}</div>
          <div><div class="tl-level">${esc(e.level)}</div><div class="tl-title">${esc(e.school)}</div>
          ${e.course ? `<div class="tl-sub">${esc(e.course)}</div>` : ''}
          ${e.description ? `<p class="tl-desc">${esc(e.description)}</p>` : ''}</div></div>`
      )
      .join('');
    if ((d.experience || []).length) {
      $('#experienceCol').hidden = false;
      $('#experienceList').innerHTML = d.experience
        .map(
          (e) => `<div class="tl-item reveal">
          <div class="tl-year">${yr(e.start_date, e.end_date)}</div>
          <div><div class="tl-level">${esc(e.type)}</div><div class="tl-title">${esc(e.role)}</div>
          <div class="tl-sub">${esc(e.organization)}</div>
          ${e.description ? `<p class="tl-desc">${esc(e.description)}</p>` : ''}</div></div>`
        )
        .join('');
    }
    if ((d.certificates || []).length) {
      $('#certsWrap').hidden = false;
      $('#certsList').innerHTML = d.certificates
        .map(
          (c) => `<div class="cert reveal">
          ${safeUrl(c.image) ? `<img src="${esc(safeUrl(c.image))}" alt="${esc(c.title)}" loading="lazy">` : ''}
          <h4>${esc(c.title)}</h4><p>${[c.issuer, c.date].filter(Boolean).map(esc).join(' · ')}</p>
          ${safeUrl(c.url) ? `<a href="${esc(safeUrl(c.url))}" target="_blank" rel="noopener">View credential ↗</a>` : ''}</div>`
        )
        .join('');
    }

    /* contact */
    const email = $('#contactEmail');
    email.textContent = s.email || '';
    email.href = s.email ? `mailto:${s.email}` : '#';
    $('#contactList').innerHTML = [
      s.phone && ['Phone', `<a href="tel:${esc(s.phone.replace(/\s/g, ''))}">${esc(s.phone)}</a>`],
      s.location && ['Location', esc(s.location)],
    ]
      .filter(Boolean)
      .map(([k, v], i) => `<div class="info-row" style="--i:${i}"><span>${k}</span><span>${v}</span></div>`)
      .join('');
    const socials = ['facebook', 'instagram', 'github', 'linkedin']
      .filter((k) => safeUrl(s[k]))
      .map((k, i) => `<a class="social" style="--i:${i + 2}" href="${esc(safeUrl(s[k]))}" target="_blank" rel="noopener">${ICONS[k]}${k[0].toUpperCase() + k.slice(1)}</a>`)
      .join('');
    $('#socials').innerHTML = socials;
    $('#menuSocials').innerHTML = ['facebook', 'instagram', 'github', 'linkedin']
      .filter((k) => safeUrl(s[k]))
      .map((k) => `<a href="${esc(safeUrl(s[k]))}" target="_blank" rel="noopener">${k[0].toUpperCase() + k.slice(1)}</a>`)
      .join('');

    initInteractions();
  }

  /* ---------------- Projects ---------------- */
  let PROJECTS = [];
  function renderProjects(list) {
    PROJECTS = list;
    const grid = $('#projectsGrid');
    if (!list.length) {
      grid.innerHTML = `<div class="empty reveal"><b>Exciting projects coming soon.</b>I'm currently building things — check back shortly.</div>`;
      $('#filters').innerHTML = '';
      return;
    }
    const cats = ['All', ...new Set(list.map((p) => p.category).filter(Boolean))];
    $('#filters').innerHTML = cats.length > 2
      ? cats.map((c, i) => `<button class="filter${i ? '' : ' active'}" data-filter="${esc(c)}">${esc(c)}</button>`).join('')
      : '';
    grid.innerHTML = list
      .map((p, i) => {
        const img = safeUrl(p.image);
        const initials = (p.title || '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
        const tags = (p.tech || '').split(',').map((t) => t.trim()).filter(Boolean).slice(0, 5);
        return `<article class="project reveal" data-index="${i}" data-cat="${esc(p.category)}" data-cursor="View">
          <div class="project__media">
            ${img ? `<img src="${esc(img)}" alt="${esc(p.title)}" loading="lazy">` : `<div class="project__placeholder"><span>${esc(initials)}</span></div>`}
            ${p.featured ? '<span class="project__badge">★ Featured</span>' : ''}
            <span class="project__arrow">↗</span>
          </div>
          <div class="project__info">
            <div><h3>${esc(p.title)}</h3><p>${esc(p.category)}</p>
              <div class="tags">${tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div></div>
            <time>${esc(p.year)}</time>
          </div></article>`;
      })
      .join('');
  }

  $('#filters').addEventListener('click', (e) => {
    const btn = e.target.closest('.filter');
    if (!btn) return;
    $$('.filter').forEach((b) => b.classList.toggle('active', b === btn));
    const f = btn.dataset.filter;
    $$('.project').forEach((p) => {
      const show = f === 'All' || p.dataset.cat === f;
      p.classList.toggle('hide', !show);
      if (show) { p.classList.remove('in'); requestAnimationFrame(() => requestAnimationFrame(() => p.classList.add('in'))); }
    });
  });

  $('#projectsGrid').addEventListener('click', (e) => {
    const card = e.target.closest('.project');
    if (card) openProject(PROJECTS[+card.dataset.index]);
  });

  /* ---------------- Modal ---------------- */
  const modal = $('#modal');
  function openProject(p) {
    if (!p) return;
    const img = safeUrl(p.image);
    const tags = (p.tech || '').split(',').map((t) => t.trim()).filter(Boolean);
    const links = [
      safeUrl(p.live_url) && `<a class="btn btn--light" href="${esc(safeUrl(p.live_url))}" target="_blank" rel="noopener"><span>Live demo</span><i>↗</i></a>`,
      safeUrl(p.github_url) && `<a class="btn btn--ghost" href="${esc(safeUrl(p.github_url))}" target="_blank" rel="noopener"><span>Source code</span><i>↗</i></a>`,
    ].filter(Boolean).join('');
    $('#modalBody').innerHTML = `
      <div class="modal__media">${img ? `<img src="${esc(img)}" alt="${esc(p.title)}">` : `<div class="project__placeholder"><span>${esc((p.title || '').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase())}</span></div>`}</div>
      <div class="modal__content">
        <div class="tl-level">${[p.category, p.year].filter(Boolean).map(esc).join(' · ')}</div>
        <h3>${esc(p.title)}</h3>
        <p>${esc(p.description)}</p>
        <div class="tags">${tags.map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div>
        ${links ? `<div class="modal__links">${links}</div>` : ''}
      </div>`;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
  modal.addEventListener('click', (e) => e.target.closest('[data-close]') && closeModal());
  addEventListener('keydown', (e) => e.key === 'Escape' && (closeModal(), document.body.classList.remove('menu-open')));

  /* ---------------- Typing roles ---------------- */
  let roleTimer;
  function startRoles(roles) {
    const el = $('#roleText');
    clearTimeout(roleTimer);
    if (!roles.length) return;
    let r = 0, c = roles[0].length, deleting = true;
    el.textContent = roles[0];
    const step = () => {
      const word = roles[r];
      if (deleting) {
        c--;
        el.textContent = word.slice(0, c);
        if (c === 0) { deleting = false; r = (r + 1) % roles.length; }
        roleTimer = setTimeout(step, 40);
      } else {
        c++;
        el.textContent = roles[r].slice(0, c);
        if (c === roles[r].length) { deleting = true; roleTimer = setTimeout(step, 2200); }
        else roleTimer = setTimeout(step, 75);
      }
    };
    roleTimer = setTimeout(step, 3500);
  }

  /* ---------------- Interactions ---------------- */
  function initInteractions() {
    // reveal on scroll
    const io = new IntersectionObserver(
      (entries) => entries.forEach((en) => {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        io.unobserve(en.target);
        setTimeout(() => (en.target.style.transitionDelay = ''), 1700);
        en.target.querySelectorAll?.('[data-count]').forEach(countUp);
      }),
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    $$('.reveal').forEach((el) => {
      // stagger siblings
      const sibs = [...el.parentElement.children].filter((x) => x.classList.contains('reveal'));
      el.style.transitionDelay = Math.min(sibs.indexOf(el), 6) * 0.08 + 's';
      io.observe(el);
    });

    // skill card spotlight
    $$('.skill-group').forEach((card) =>
      card.addEventListener('pointermove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', e.clientX - r.left + 'px');
        card.style.setProperty('--my', e.clientY - r.top + 'px');
      })
    );

    initMagnetic();
    initCursorTargets();
  }

  function countUp(el) {
    const target = +el.dataset.count;
    if (reduced) return (el.textContent = target);
    const start = performance.now(), dur = 1800;
    const frame = (t) => {
      const p = Math.min(1, (t - start) / dur);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 4)));
      if (p < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }

  // word-by-word lead reveal tied to scroll
  function updateLead() {
    const lead = $('#aboutLead');
    if (!lead) return;
    const words = lead.querySelectorAll('.w');
    if (!words.length) return;
    const r = lead.getBoundingClientRect();
    const vh = innerHeight;
    const p = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
    const n = Math.round(p * words.length);
    words.forEach((w, i) => w.classList.toggle('on', i < n));
  }

  /* ---------------- Scroll: nav, progress, active link ---------------- */
  const nav = $('#nav'), progress = $('#scrollProgress');
  const heroContent = $('.hero__content'), heroVisual = $('.hero__visual');
  let lastY = 0;
  function onScroll() {
    const y = scrollY;
    nav.classList.toggle('scrolled', y > 40);
    nav.classList.toggle('hidden', y > lastY && y > 400 && !document.body.classList.contains('menu-open'));
    lastY = y;
    const h = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${h > 0 ? y / h : 0})`;
    updateLead();
    // hero parallax: content drifts up & fades, photo moves slower
    if (!reduced && document.body.classList.contains('loaded') && y < innerHeight * 1.2) {
      heroContent.style.transform = `translateY(${y * 0.22}px)`;
      heroContent.style.opacity = Math.max(0, 1 - y / (innerHeight * 0.75));
      heroVisual.style.transform = `translateY(${y * 0.1}px)`;
    }
    let current = '';
    $$('main section[id]').forEach((sec) => { if (sec.getBoundingClientRect().top < innerHeight * 0.4) current = sec.id; });
    $$('[data-link]').forEach((a) => a.classList.toggle('active', a.getAttribute('href') === '#' + current));
  }
  addEventListener('scroll', () => requestAnimationFrame(onScroll), { passive: true });
  onScroll();

  /* ---------------- Mobile menu ---------------- */
  $('#navToggle').addEventListener('click', () => document.body.classList.toggle('menu-open'));
  $$('[data-menu-link]').forEach((a) => a.addEventListener('click', () => document.body.classList.remove('menu-open')));

  /* ---------------- Cursor ---------------- */
  const cursor = $('#cursor'), ring = $('#cursorRing'), label = $('#cursorLabel');
  if (!isTouch) {
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    addEventListener('pointermove', (e) => {
      mx = e.clientX; my = e.clientY;
      cursor.style.transform = `translate(${mx}px, ${my}px)`;
    });
    const loop = () => {
      rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16;
      ring.style.transform = `translate(${rx}px, ${ry}px)`;
      requestAnimationFrame(loop);
    };
    loop();
    document.addEventListener('mouseleave', () => { cursor.style.opacity = ring.style.opacity = 0; });
    document.addEventListener('mouseenter', () => { cursor.style.opacity = ring.style.opacity = 1; });
  }
  function initCursorTargets() {
    if (isTouch) return;
    document.addEventListener('pointerover', (e) => {
      const lab = e.target.closest('[data-cursor]');
      const link = e.target.closest('a, button, input, textarea, .filter');
      ring.classList.toggle('label', !!lab);
      label.textContent = lab ? lab.dataset.cursor : '';
      ring.classList.toggle('hover', !lab && !!link);
    });
  }

  /* ---------------- Magnetic buttons ---------------- */
  function initMagnetic() {
    if (isTouch || reduced) return;
    $$('[data-magnetic]').forEach((el) => {
      if (el.dataset.magInit) return;
      el.dataset.magInit = 1;
      el.style.transition = (getComputedStyle(el).transition || '') + ', transform 0.6s cubic-bezier(0.22,1,0.36,1)';
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.3;
        const y = (e.clientY - r.top - r.height / 2) * 0.4;
        el.style.transform = `translate(${x}px, ${y}px)`;
      });
      el.addEventListener('pointerleave', () => (el.style.transform = ''));
    });
  }

  /* ---------------- Contact form ---------------- */
  const form = $('#contactForm'), status = $('#formStatus');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    let bad = false;
    ['name', 'email', 'message'].forEach((k) => {
      const field = form.elements[k].closest('.field');
      const invalid = !data[k].trim() || (k === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data[k]));
      field.classList.toggle('error', invalid);
      bad ||= invalid;
    });
    if (bad) { status.className = 'form__status err'; status.textContent = 'Please fill in your name, a valid email, and a message.'; return; }
    const btn = form.querySelector('button');
    btn.disabled = true; btn.querySelector('span').textContent = 'Sending…';
    try {
      const res = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const out = await res.json();
      if (!res.ok) {
        if (out.field && form.elements[out.field]) {
          form.elements[out.field].closest('.field').classList.add('error');
          form.elements[out.field].focus();
        }
        throw new Error(out.error || 'Something went wrong.');
      }
      form.reset();
      status.className = 'form__status ok';
      status.textContent = "Thank you! Your message has been sent — I'll get back to you soon.";
      toast('Message sent ✓');
    } catch (err) {
      status.className = 'form__status err';
      status.textContent = err.message;
    } finally {
      btn.disabled = false; btn.querySelector('span').textContent = 'Send message';
    }
  });
  form.addEventListener('input', (e) => e.target.closest('.field')?.classList.remove('error'));

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
  }

  /* ---------------- Footer ---------------- */
  $('#year').textContent = new Date().getFullYear();
  const clock = () =>
    ($('#localTime').textContent = new Date().toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila', hour: '2-digit', minute: '2-digit' }));
  clock(); setInterval(clock, 15000);
})();

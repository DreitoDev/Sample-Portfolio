/**
 * Andrei R. Gandia — Dynamic Portfolio
 * Node.js + Express + SQLite/libSQL
 *
 *  Local:   database = data/portfolio.db, uploads = public/uploads
 *  Vercel:  database = Turso (TURSO_DATABASE_URL + TURSO_AUTH_TOKEN),
 *           uploads  = Vercel Blob (BLOB_READ_WRITE_TOKEN)
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { createClient } = require('@libsql/client');

const PORT = process.env.PORT || 3000;
const IS_VERCEL = !!process.env.VERCEL;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const UPLOAD_DIR = path.join(ROOT, 'public', 'uploads');
if (!IS_VERCEL) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/* ------------------------------------------------------------------ */
/*  Content schema — drives the DB tables AND the admin forms          */
/* ------------------------------------------------------------------ */
const TABLES = {
  skills: {
    label: 'Skills',
    order: 'sort_order ASC, id ASC',
    list: ['name', 'category', 'level'],
    fields: [
      { name: 'name', label: 'Skill name', type: 'text', required: true },
      { name: 'category', label: 'Category', type: 'select', options: ['Frontend', 'Backend', 'Database', 'Design', 'Tools'] },
      { name: 'level', label: 'Proficiency (0–100)', type: 'number', min: 0, max: 100 },
      { name: 'sort_order', label: 'Display order', type: 'number' },
    ],
  },
  projects: {
    label: 'Projects',
    order: 'featured DESC, sort_order ASC, id DESC',
    list: ['title', 'category', 'featured'],
    fields: [
      { name: 'title', label: 'Project title', type: 'text', required: true },
      { name: 'category', label: 'Category', type: 'select', options: ['Web App', 'Website', 'UI/UX Design', 'Mobile', 'Other'] },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'tech', label: 'Tech used (comma separated)', type: 'text' },
      { name: 'image', label: 'Screenshot / cover', type: 'image' },
      { name: 'github_url', label: 'GitHub URL', type: 'url' },
      { name: 'live_url', label: 'Live demo URL', type: 'url' },
      { name: 'year', label: 'Year', type: 'text' },
      { name: 'featured', label: 'Featured project', type: 'checkbox' },
      { name: 'sort_order', label: 'Display order', type: 'number' },
    ],
  },
  education: {
    label: 'Education',
    order: 'sort_order ASC, id ASC',
    list: ['level', 'school', 'start_year', 'end_year'],
    fields: [
      { name: 'level', label: 'Level', type: 'text', required: true },
      { name: 'school', label: 'School', type: 'text', required: true },
      { name: 'course', label: 'Course / Strand', type: 'text' },
      { name: 'start_year', label: 'Start year', type: 'text' },
      { name: 'end_year', label: 'End year (or "Present")', type: 'text' },
      { name: 'description', label: 'Description / Honors', type: 'textarea' },
      { name: 'sort_order', label: 'Display order', type: 'number' },
    ],
  },
  experience: {
    label: 'Experience',
    order: 'sort_order ASC, id DESC',
    list: ['role', 'organization', 'start_date', 'end_date'],
    fields: [
      { name: 'role', label: 'Role / Position', type: 'text', required: true },
      { name: 'organization', label: 'Company / Organization', type: 'text', required: true },
      { name: 'type', label: 'Type', type: 'select', options: ['Internship / OJT', 'Freelance', 'Part-time', 'Full-time', 'Organization', 'Competition'] },
      { name: 'start_date', label: 'Start', type: 'text' },
      { name: 'end_date', label: 'End (or "Present")', type: 'text' },
      { name: 'description', label: 'What you did', type: 'textarea' },
      { name: 'sort_order', label: 'Display order', type: 'number' },
    ],
  },
  certificates: {
    label: 'Certificates',
    order: 'sort_order ASC, id DESC',
    list: ['title', 'issuer', 'date'],
    fields: [
      { name: 'title', label: 'Certificate / Achievement', type: 'text', required: true },
      { name: 'issuer', label: 'Issued by', type: 'text' },
      { name: 'date', label: 'Date', type: 'text' },
      { name: 'url', label: 'Credential URL', type: 'url' },
      { name: 'image', label: 'Image', type: 'image' },
      { name: 'sort_order', label: 'Display order', type: 'number' },
    ],
  },
};

const SETTINGS_FIELDS = [
  { name: 'full_name', label: 'Full name', type: 'text' },
  { name: 'first_name', label: 'First name (hero)', type: 'text' },
  { name: 'last_name', label: 'Last name (hero)', type: 'text' },
  { name: 'roles', label: 'Roles (comma separated)', type: 'text' },
  { name: 'tagline', label: 'Tagline', type: 'textarea' },
  { name: 'about', label: 'About me (blank line = new paragraph)', type: 'textarea', rows: 8 },
  { name: 'location', label: 'Location', type: 'text' },
  { name: 'email', label: 'Email', type: 'text' },
  { name: 'phone', label: 'Phone', type: 'text' },
  { name: 'facebook', label: 'Facebook URL', type: 'url' },
  { name: 'instagram', label: 'Instagram URL', type: 'url' },
  { name: 'github', label: 'GitHub URL', type: 'url' },
  { name: 'linkedin', label: 'LinkedIn URL', type: 'url' },
  { name: 'profile_image', label: 'Profile photo', type: 'image' },
  { name: 'cv_file', label: 'CV / Resume (PDF)', type: 'file' },
  { name: 'available', label: 'Open for opportunities', type: 'checkbox' },
];

/* ------------------------------------------------------------------ */
/*  Database (libSQL: local file or Turso)                             */
/* ------------------------------------------------------------------ */
const DB_URL =
  process.env.TURSO_DATABASE_URL ||
  process.env.LIBSQL_URL ||
  (IS_VERCEL ? 'file:/tmp/portfolio.db' : 'file:' + path.relative(process.cwd(), path.join(DATA_DIR, 'portfolio.db')).replace(/\\/g, '/'));
if (IS_VERCEL && DB_URL.startsWith('file:')) {
  console.warn('⚠ No TURSO_DATABASE_URL set — using a temporary database. Changes will NOT be saved. Connect Turso in Vercel → Storage.');
}
const db = createClient({ url: DB_URL, authToken: process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN });

const toObjects = (rs) =>
  rs.rows.map((r) => Object.fromEntries(rs.columns.map((c, i) => [c, typeof r[i] === 'bigint' ? Number(r[i]) : r[i]])));
const all = async (sql, args = []) => toObjects(await db.execute({ sql, args }));
const get = async (sql, args = []) => (await all(sql, args))[0];
const run = (sql, args = []) => db.execute({ sql, args });

const colType = (f) => (['number', 'checkbox'].includes(f.type) ? 'INTEGER DEFAULT 0' : 'TEXT');

function normalize(field, value) {
  if (field.type === 'checkbox') return value === true || value === 1 || value === '1' || value === 'on' || value === 'true' ? 1 : 0;
  if (field.type === 'number') {
    let n = parseInt(value, 10);
    if (Number.isNaN(n)) n = 0;
    if (field.min !== undefined) n = Math.max(field.min, n);
    if (field.max !== undefined) n = Math.min(field.max, n);
    return n;
  }
  if (value === undefined || value === null) return '';
  return String(value).trim().slice(0, 10000);
}

async function getSettings() {
  const rows = await all('SELECT key, value FROM settings');
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}
const setSetting = (k, v) =>
  run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value', [k, v]);

async function insertRow(table, data) {
  const fields = TABLES[table].fields;
  const names = fields.map((f) => f.name);
  const res = await run(
    `INSERT INTO ${table} (${names.join(',')}) VALUES (${names.map(() => '?').join(',')})`,
    fields.map((f) => normalize(f, data[f.name]))
  );
  return Number(res.lastInsertRowid);
}

async function createSchema() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL, email TEXT NOT NULL, subject TEXT, message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
    CREATE TABLE IF NOT EXISTS page_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    );
  `);
  for (const [table, def] of Object.entries(TABLES)) {
    await run(`CREATE TABLE IF NOT EXISTS ${table} (id INTEGER PRIMARY KEY AUTOINCREMENT,
      ${def.fields.map((f) => `${f.name} ${colType(f)}`).join(', ')},
      created_at TEXT DEFAULT (datetime('now','localtime')))`);
    const existing = (await all(`PRAGMA table_info(${table})`)).map((c) => c.name);
    for (const f of def.fields) {
      if (!existing.includes(f.name)) await run(`ALTER TABLE ${table} ADD COLUMN ${f.name} ${colType(f)}`);
    }
  }
}

/* ---------- Seed (first run only) ---------- */
async function seed() {
  if ((await get('SELECT COUNT(*) AS c FROM admins')).c === 0) {
    await run('INSERT INTO admins (username, password_hash) VALUES (?, ?)', [
      process.env.ADMIN_USERNAME || 'Andrei0950',
      bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'admin123', 10),
    ]);
  }
  if ((await get('SELECT COUNT(*) AS c FROM settings')).c > 0) return;

  const s = {
    full_name: 'Andrei R. Gandia',
    first_name: 'Andrei',
    last_name: 'Gandia',
    roles: 'Web Developer, UI/UX Designer, BS Information Technology',
    tagline: 'I design and build clean, minimal, and user-friendly web experiences — where every pixel has a purpose.',
    about:
      "I'm Andrei, a Bachelor of Science in Information Technology student at Camarines Sur Polytechnic Colleges, based in Polangui, Albay. I love turning ideas into clean, responsive, and intuitive interfaces that look good and feel effortless to use.\n\n" +
      "My strength is front-end development and UI/UX design — I care about the details: spacing, typography, motion, and how every interaction feels. I'm also steadily growing my back-end skills with PHP, Node.js, and MySQL so I can bring complete ideas to life, from the design all the way to the database.\n\n" +
      "Right now I'm focused on learning, building real projects, and finding opportunities where I can grow as a developer and contribute to a team.",
    location: 'Polangui, Albay, Philippines',
    email: 'gandiaandrei5@gmail.com',
    phone: '0991283422',
    facebook: 'https://www.facebook.com/share/1YbVdme7Yy/?mibextid=wwXIfr',
    instagram: 'https://www.instagram.com/wrld.of_drei',
    github: '',
    linkedin: '',
    profile_image: '/uploads/profile.png',
    cv_file: '',
    available: '1',
  };
  for (const [k, v] of Object.entries(s)) await setSetting(k, v);

  const skills = [
    ['HTML5', 'Frontend', 95], ['CSS3', 'Frontend', 92], ['JavaScript', 'Frontend', 82],
    ['Responsive Design', 'Frontend', 90], ['Bootstrap', 'Frontend', 85], ['Tailwind CSS', 'Frontend', 78],
    ['React', 'Frontend', 65],
    ['Figma', 'Design', 85], ['UI/UX Design', 'Design', 85], ['Canva', 'Design', 88],
    ['PHP', 'Backend', 55], ['Node.js / Express', 'Backend', 50],
    ['MySQL', 'Database', 65],
    ['Git & GitHub', 'Tools', 70], ['VS Code', 'Tools', 90],
  ];
  for (const [i, [name, category, level]] of skills.entries()) {
    await insertRow('skills', { name, category, level, sort_order: i + 1 });
  }

  const edu = [
    ['College', 'Camarines Sur Polytechnic Colleges', 'Bachelor of Science in Information Technology', '2023', 'Present',
      'Building a strong foundation in web development, UI/UX design, programming, and database management.'],
    ['Senior High School', 'Polangui General Comprehensive High School', '', '2020', '2022', ''],
    ['Junior High School', 'Polangui General Comprehensive High School', '', '2016', '2020', ''],
    ['Elementary', 'Polangui North Elementary School', '', '2010', '2016', ''],
  ];
  for (const [i, [level, school, course, start_year, end_year, description]] of edu.entries()) {
    await insertRow('education', { level, school, course, start_year, end_year, description, sort_order: i + 1 });
  }

  await insertRow('projects', {
    title: 'Personal Portfolio',
    category: 'Web App',
    description:
      'A dynamic, minimalist portfolio with smooth animations and a full admin dashboard. All content — skills, projects, education, and messages — is stored in a database and managed without touching code.',
    tech: 'HTML, CSS, JavaScript, Node.js, Express, SQLite',
    image: '/uploads/project-portfolio.jpg',
    github_url: 'https://github.com/DreitoDev/Sample-Portfolio',
    live_url: '',
    year: '2026',
    featured: 1,
    sort_order: 1,
  });
}

let SESSION_SECRET = process.env.SESSION_SECRET || '';
async function init() {
  await createSchema();
  await seed();
  if (!SESSION_SECRET) {
    const row = await get("SELECT value FROM meta WHERE key = 'session_secret'");
    SESSION_SECRET = row?.value || crypto.randomBytes(48).toString('hex');
    if (!row) await run("INSERT OR IGNORE INTO meta (key, value) VALUES ('session_secret', ?)", [SESSION_SECRET]);
    SESSION_SECRET = (await get("SELECT value FROM meta WHERE key = 'session_secret'")).value;
  }
}
const ready = init();
ready.catch((err) => console.error('Database init failed:', err));

/* ------------------------------------------------------------------ */
/*  Auth — signed, stateless cookie (works on serverless)              */
/* ------------------------------------------------------------------ */
const COOKIE = 'ag_admin';
const MAX_AGE = 1000 * 60 * 60 * 8;
// signing key includes the password hash, so changing the password logs out other sessions
const sign = (value, pwHash) => crypto.createHmac('sha256', SESSION_SECRET + pwHash).update(value).digest('base64url');

function setAuthCookie(req, res, admin) {
  const value = `${admin.id}.${Date.now() + MAX_AGE}`;
  res.cookie(COOKIE, `${value}.${sign(value, admin.password_hash)}`, {
    httpOnly: true,
    sameSite: 'lax',
    secure: IS_VERCEL || req.secure,
    maxAge: MAX_AGE,
    path: '/',
  });
}

async function currentAdmin(req) {
  const raw = (req.headers.cookie || '').split(';').map((s) => s.trim()).find((s) => s.startsWith(COOKIE + '='));
  if (!raw) return null;
  const [id, exp, sig] = decodeURIComponent(raw.slice(COOKIE.length + 1)).split('.');
  if (!id || !exp || !sig || Date.now() > Number(exp)) return null;
  const admin = await get('SELECT id, username, password_hash FROM admins WHERE id = ?', [Number(id)]);
  if (!admin) return null;
  const expected = sign(`${id}.${exp}`, admin.password_hash);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  return admin;
}

const requireAuth = async (req, res, next) => {
  const admin = await currentAdmin(req);
  if (!admin) return res.status(401).json({ error: 'Unauthorized' });
  req.admin = admin;
  next();
};

/* ------------------------------------------------------------------ */
/*  App                                                                */
/* ------------------------------------------------------------------ */
const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(express.json({ limit: '1mb' }));

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// On Vercel, files in /public are served by the CDN; locally Express serves them.
app.use(express.static(path.join(ROOT, 'public'), { extensions: ['html'] }));

// make sure the database is ready before any API call
app.use('/api', async (req, res, next) => {
  try { await ready; next(); } catch (err) { next(err); }
});

/* ---------- simple in-memory rate limiter ---------- */
function rateLimit(max, windowMs) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip;
    const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (arr.length >= max) return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    arr.push(now);
    hits.set(key, arr);
    next();
  };
}

/* ---------- Public API ---------- */
app.get('/api/portfolio', async (req, res) => {
  const data = { settings: await getSettings() };
  for (const [table, def] of Object.entries(TABLES)) {
    data[table] = await all(`SELECT * FROM ${table} ORDER BY ${def.order}`);
  }
  res.json(data);
});

app.post('/api/view', rateLimit(30, 60_000), async (req, res) => {
  await run('INSERT INTO page_views DEFAULT VALUES');
  res.json({ ok: true });
});

app.post('/api/contact', rateLimit(5, 10 * 60_000), async (req, res) => {
  const { name = '', email = '', subject = '', message = '', website = '' } = req.body || {};
  if (website) return res.json({ ok: true }); // honeypot for bots
  const n = String(name).trim(), e = String(email).trim(), m = String(message).trim();
  if (!n || !e || !m) return res.status(400).json({ error: 'Please fill in your name, email, and message.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  if (m.length > 5000) return res.status(400).json({ error: 'Message is too long.' });
  await run('INSERT INTO messages (name, email, subject, message) VALUES (?, ?, ?, ?)', [
    n.slice(0, 120), e.slice(0, 200), String(subject).trim().slice(0, 200), m,
  ]);
  res.json({ ok: true });
});

/* ---------- Auth ---------- */
app.post('/api/auth/login', rateLimit(10, 15 * 60_000), async (req, res) => {
  const { username = '', password = '' } = req.body || {};
  const admin = await get('SELECT * FROM admins WHERE username = ?', [String(username)]);
  if (!admin || !bcrypt.compareSync(String(password), admin.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }
  setAuthCookie(req, res, admin);
  res.json({ ok: true, username: admin.username });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie(COOKIE, { path: '/' });
  res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => res.json({ id: req.admin.id, username: req.admin.username }));

app.put('/api/auth/account', requireAuth, async (req, res) => {
  const { current_password = '', new_username = '', new_password = '' } = req.body || {};
  const admin = req.admin;
  if (!bcrypt.compareSync(String(current_password), admin.password_hash)) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }
  const uname = String(new_username).trim() || admin.username;
  if (String(new_password) && String(new_password).length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }
  const hash = new_password ? bcrypt.hashSync(String(new_password), 10) : admin.password_hash;
  try {
    await run('UPDATE admins SET username = ?, password_hash = ? WHERE id = ?', [uname, hash, admin.id]);
  } catch {
    return res.status(400).json({ error: 'Username already taken.' });
  }
  setAuthCookie(req, res, { ...admin, password_hash: hash }); // keep this session logged in
  res.json({ ok: true, username: uname });
});

/* ---------- Admin API ---------- */
app.get('/api/admin/schema', requireAuth, (req, res) => res.json({ tables: TABLES, settings: SETTINGS_FIELDS }));

app.get('/api/admin/stats', requireAuth, async (req, res) => {
  const count = async (t, where = '') => (await get(`SELECT COUNT(*) AS c FROM ${t} ${where}`)).c;
  res.json({
    projects: await count('projects'),
    skills: await count('skills'),
    education: await count('education'),
    experience: await count('experience'),
    certificates: await count('certificates'),
    messages: await count('messages'),
    unread: await count('messages', 'WHERE is_read = 0'),
    views: await count('page_views'),
    views_today: await count('page_views', "WHERE date(created_at) = date('now','localtime')"),
    recent_messages: await all('SELECT id, name, subject, created_at, is_read FROM messages ORDER BY id DESC LIMIT 5'),
  });
});

app.get('/api/admin/settings', requireAuth, async (req, res) => res.json(await getSettings()));
app.put('/api/admin/settings', requireAuth, async (req, res) => {
  const body = req.body || {};
  for (const f of SETTINGS_FIELDS) {
    if (f.name in body) await setSetting(f.name, String(normalize(f, body[f.name])));
  }
  res.json(await getSettings());
});

const validTable = (req, res, next) => (TABLES[req.params.table] ? next() : res.status(404).json({ error: 'Unknown section' }));

app.get('/api/admin/content/:table', requireAuth, validTable, async (req, res) => {
  const { table } = req.params;
  res.json(await all(`SELECT * FROM ${table} ORDER BY ${TABLES[table].order}`));
});

app.post('/api/admin/content/:table', requireAuth, validTable, async (req, res) => {
  const { table } = req.params;
  for (const f of TABLES[table].fields) {
    if (f.required && !String(req.body?.[f.name] ?? '').trim()) return res.status(400).json({ error: `${f.label} is required.` });
  }
  const id = await insertRow(table, req.body || {});
  res.json(await get(`SELECT * FROM ${table} WHERE id = ?`, [id]));
});

app.put('/api/admin/content/:table/:id', requireAuth, validTable, async (req, res) => {
  const { table, id } = req.params;
  const body = req.body || {};
  const fields = TABLES[table].fields.filter((f) => f.name in body);
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update.' });
  for (const f of fields) {
    if (f.required && !String(body[f.name] ?? '').trim()) return res.status(400).json({ error: `${f.label} is required.` });
  }
  await run(
    `UPDATE ${table} SET ${fields.map((f) => `${f.name} = ?`).join(', ')} WHERE id = ?`,
    [...fields.map((f) => normalize(f, body[f.name])), Number(id)]
  );
  res.json(await get(`SELECT * FROM ${table} WHERE id = ?`, [Number(id)]));
});

app.delete('/api/admin/content/:table/:id', requireAuth, validTable, async (req, res) => {
  await run(`DELETE FROM ${req.params.table} WHERE id = ?`, [Number(req.params.id)]);
  res.json({ ok: true });
});

/* ---------- Messages ---------- */
app.get('/api/admin/messages', requireAuth, async (req, res) => res.json(await all('SELECT * FROM messages ORDER BY id DESC')));
app.put('/api/admin/messages/:id', requireAuth, async (req, res) => {
  await run('UPDATE messages SET is_read = ? WHERE id = ?', [req.body?.is_read ? 1 : 0, Number(req.params.id)]);
  res.json({ ok: true });
});
app.delete('/api/admin/messages/:id', requireAuth, async (req, res) => {
  await run('DELETE FROM messages WHERE id = ?', [Number(req.params.id)]);
  res.json({ ok: true });
});

/* ---------- Uploads (local disk, or Vercel Blob when deployed) ---------- */
const ALLOWED = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.pdf': 'application/pdf' };
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 }, // Vercel functions accept up to ~4.5MB per request
  fileFilter: (req, file, cb) => cb(null, !!ALLOWED[path.extname(file.originalname).toLowerCase()]),
});

app.post('/api/admin/upload', requireAuth, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Only PNG, JPG, WEBP, GIF, or PDF files (max 4MB) are allowed.' });
  const ext = path.extname(req.file.originalname).toLowerCase();
  const name = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = require('@vercel/blob');
    const blob = await put(`uploads/${name}`, req.file.buffer, { access: 'public', contentType: ALLOWED[ext] });
    return res.json({ url: blob.url });
  }
  if (IS_VERCEL) {
    return res.status(500).json({ error: 'Uploads need Vercel Blob. In Vercel, open your project → Storage → create a Blob store, then redeploy.' });
  }
  fs.writeFileSync(path.join(UPLOAD_DIR, name), req.file.buffer);
  res.json({ url: `/uploads/${name}` });
});

/* ---------- Errors ---------- */
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 4MB).' : 'Server error' });
});

module.exports = app;

if (require.main === module) {
  ready.then(() => {
    app.listen(PORT, () => {
      console.log(`\n  ✦ Portfolio running →  http://localhost:${PORT}`);
      console.log(`  ✦ Admin dashboard   →  http://localhost:${PORT}/admin\n`);
    });
  });
}

/**
 * Andrei R. Gandia — Dynamic Portfolio
 * Node.js + Express + SQLite (built-in node:sqlite)
 */
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { DatabaseSync } = require('node:sqlite');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const UPLOAD_DIR = path.join(ROOT, 'public', 'uploads');
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

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
/*  Database                                                           */
/* ------------------------------------------------------------------ */
const db = new DatabaseSync(path.join(DATA_DIR, 'portfolio.db'));
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

db.exec(`
  CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
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
  const cols = def.fields
    .map((f) => `${f.name} ${['number', 'checkbox'].includes(f.type) ? 'INTEGER DEFAULT 0' : 'TEXT'}`)
    .join(', ');
  db.exec(`CREATE TABLE IF NOT EXISTS ${table} (id INTEGER PRIMARY KEY AUTOINCREMENT, ${cols},
           created_at TEXT DEFAULT (datetime('now','localtime')))`);
  // add any columns added to the schema later
  const existing = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  for (const f of def.fields) {
    if (!existing.includes(f.name)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${f.name} ${['number', 'checkbox'].includes(f.type) ? 'INTEGER DEFAULT 0' : 'TEXT'}`);
    }
  }
}

const getSettings = () =>
  Object.fromEntries(db.prepare('SELECT key, value FROM settings').all().map((r) => [r.key, r.value]));
const setSetting = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');

function insertRow(table, data) {
  const fields = TABLES[table].fields;
  const names = fields.map((f) => f.name);
  const values = fields.map((f) => normalize(f, data[f.name]));
  const res = db
    .prepare(`INSERT INTO ${table} (${names.join(',')}) VALUES (${names.map(() => '?').join(',')})`)
    .run(...values);
  return Number(res.lastInsertRowid);
}

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

/* ---------- Seed (first run only) ---------- */
function seed() {
  if (db.prepare('SELECT COUNT(*) AS c FROM admins').get().c === 0) {
    db.prepare('INSERT INTO admins (username, password_hash) VALUES (?, ?)').run('Andrei0950', bcrypt.hashSync('admin123', 10));
  }
  if (db.prepare('SELECT COUNT(*) AS c FROM settings').get().c > 0) return;

  const s = {
    full_name: 'Andrei R. Gandia',
    first_name: 'Andrei',
    last_name: 'Gandia',
    roles: 'Web Developer, UI/UX Designer, BS Information Technology',
    tagline: 'I design and build clean, minimal, and user-friendly web experiences — where every pixel has a purpose.',
    about:
      "I'm Andrei, a Bachelor of Science in Information Technology student at Camarines Sur Polytechnic Colleges, based in Polangui, Albay. I love turning ideas into clean, responsive, and intuitive interfaces that look good and feel effortless to use.\n\n" +
      'My strength is front-end development and UI/UX design — I care about the details: spacing, typography, motion, and how every interaction feels. I\'m also steadily growing my back-end skills with PHP, Node.js, and MySQL so I can bring complete ideas to life, from the design all the way to the database.\n\n' +
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
  for (const [k, v] of Object.entries(s)) setSetting.run(k, v);

  const skills = [
    ['HTML5', 'Frontend', 95], ['CSS3', 'Frontend', 92], ['JavaScript', 'Frontend', 82],
    ['Responsive Design', 'Frontend', 90], ['Bootstrap', 'Frontend', 85], ['Tailwind CSS', 'Frontend', 78],
    ['React', 'Frontend', 65],
    ['Figma', 'Design', 85], ['UI/UX Design', 'Design', 85], ['Canva', 'Design', 88],
    ['PHP', 'Backend', 55], ['Node.js / Express', 'Backend', 50],
    ['MySQL', 'Database', 65],
    ['Git & GitHub', 'Tools', 70], ['VS Code', 'Tools', 90],
  ];
  skills.forEach(([name, category, level], i) => insertRow('skills', { name, category, level, sort_order: i + 1 }));

  const edu = [
    ['College', 'Camarines Sur Polytechnic Colleges', 'Bachelor of Science in Information Technology', '2023', 'Present',
      'Building a strong foundation in web development, UI/UX design, programming, and database management.'],
    ['Senior High School', 'Polangui General Comprehensive High School', '', '2020', '2022', ''],
    ['Junior High School', 'Polangui General Comprehensive High School', '', '2016', '2020', ''],
    ['Elementary', 'Polangui North Elementary School', '', '2010', '2016', ''],
  ];
  edu.forEach(([level, school, course, start_year, end_year, description], i) =>
    insertRow('education', { level, school, course, start_year, end_year, description, sort_order: i + 1 }));

  insertRow('projects', {
    title: 'Personal Portfolio',
    category: 'Web App',
    description:
      'A dynamic, minimalist portfolio with smooth animations and a full admin dashboard. All content — skills, projects, education, and messages — is stored in a database and managed without touching code.',
    tech: 'HTML, CSS, JavaScript, Node.js, Express, SQLite',
    image: '',
    github_url: '',
    live_url: '',
    year: '2026',
    featured: 1,
    sort_order: 1,
  });
}
seed();

/* ------------------------------------------------------------------ */
/*  App                                                                */
/* ------------------------------------------------------------------ */
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

const secretFile = path.join(DATA_DIR, '.session-secret');
if (!fs.existsSync(secretFile)) fs.writeFileSync(secretFile, crypto.randomBytes(48).toString('hex'));
app.use(
  session({
    secret: fs.readFileSync(secretFile, 'utf8'),
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, sameSite: 'lax', maxAge: 1000 * 60 * 60 * 8 },
  })
);

app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(express.static(path.join(ROOT, 'public'), { extensions: ['html'] }));

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
app.get('/api/portfolio', (req, res) => {
  const settings = getSettings();
  const data = { settings };
  for (const [table, def] of Object.entries(TABLES)) {
    data[table] = db.prepare(`SELECT * FROM ${table} ORDER BY ${def.order}`).all();
  }
  res.json(data);
});

app.post('/api/view', rateLimit(30, 60_000), (req, res) => {
  db.prepare('INSERT INTO page_views DEFAULT VALUES').run();
  res.json({ ok: true });
});

app.post('/api/contact', rateLimit(5, 10 * 60_000), (req, res) => {
  const { name = '', email = '', subject = '', message = '', website = '' } = req.body || {};
  if (website) return res.json({ ok: true }); // honeypot for bots
  const n = String(name).trim(), e = String(email).trim(), m = String(message).trim();
  if (!n || !e || !m) return res.status(400).json({ error: 'Please fill in your name, email, and message.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  if (m.length > 5000) return res.status(400).json({ error: 'Message is too long.' });
  db.prepare('INSERT INTO messages (name, email, subject, message) VALUES (?, ?, ?, ?)')
    .run(n.slice(0, 120), e.slice(0, 200), String(subject).trim().slice(0, 200), m);
  res.json({ ok: true });
});

/* ---------- Auth ---------- */
const requireAuth = (req, res, next) => (req.session.adminId ? next() : res.status(401).json({ error: 'Unauthorized' }));

app.post('/api/auth/login', rateLimit(10, 15 * 60_000), (req, res) => {
  const { username = '', password = '' } = req.body || {};
  const admin = db.prepare('SELECT * FROM admins WHERE username = ?').get(String(username));
  if (!admin || !bcrypt.compareSync(String(password), admin.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: 'Session error' });
    req.session.adminId = admin.id;
    res.json({ ok: true, username: admin.username });
  });
});

app.post('/api/auth/logout', (req, res) => req.session.destroy(() => res.json({ ok: true })));

app.get('/api/auth/me', (req, res) => {
  if (!req.session.adminId) return res.status(401).json({ error: 'Unauthorized' });
  const admin = db.prepare('SELECT id, username FROM admins WHERE id = ?').get(req.session.adminId);
  res.json(admin || {});
});

app.put('/api/auth/account', requireAuth, (req, res) => {
  const { current_password = '', new_username = '', new_password = '' } = req.body || {};
  const admin = db.prepare('SELECT * FROM admins WHERE id = ?').get(req.session.adminId);
  if (!bcrypt.compareSync(String(current_password), admin.password_hash)) {
    return res.status(400).json({ error: 'Current password is incorrect.' });
  }
  const uname = String(new_username).trim() || admin.username;
  if (String(new_password) && String(new_password).length < 6) {
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  }
  const hash = new_password ? bcrypt.hashSync(String(new_password), 10) : admin.password_hash;
  try {
    db.prepare('UPDATE admins SET username = ?, password_hash = ? WHERE id = ?').run(uname, hash, admin.id);
  } catch {
    return res.status(400).json({ error: 'Username already taken.' });
  }
  res.json({ ok: true, username: uname });
});

/* ---------- Admin API ---------- */
app.get('/api/admin/schema', requireAuth, (req, res) => res.json({ tables: TABLES, settings: SETTINGS_FIELDS }));

app.get('/api/admin/stats', requireAuth, (req, res) => {
  const count = (t, where = '') => db.prepare(`SELECT COUNT(*) AS c FROM ${t} ${where}`).get().c;
  res.json({
    projects: count('projects'),
    skills: count('skills'),
    education: count('education'),
    experience: count('experience'),
    certificates: count('certificates'),
    messages: count('messages'),
    unread: count('messages', 'WHERE is_read = 0'),
    views: count('page_views'),
    views_today: count('page_views', "WHERE date(created_at) = date('now','localtime')"),
    recent_messages: db.prepare('SELECT id, name, subject, created_at, is_read FROM messages ORDER BY id DESC LIMIT 5').all(),
  });
});

app.get('/api/admin/settings', requireAuth, (req, res) => res.json(getSettings()));
app.put('/api/admin/settings', requireAuth, (req, res) => {
  const body = req.body || {};
  for (const f of SETTINGS_FIELDS) {
    if (f.name in body) setSetting.run(f.name, String(normalize(f, body[f.name])));
  }
  res.json(getSettings());
});

const validTable = (req, res, next) => (TABLES[req.params.table] ? next() : res.status(404).json({ error: 'Unknown section' }));

app.get('/api/admin/content/:table', requireAuth, validTable, (req, res) => {
  const { table } = req.params;
  res.json(db.prepare(`SELECT * FROM ${table} ORDER BY ${TABLES[table].order}`).all());
});

app.post('/api/admin/content/:table', requireAuth, validTable, (req, res) => {
  const { table } = req.params;
  const def = TABLES[table];
  for (const f of def.fields) {
    if (f.required && !String(req.body?.[f.name] ?? '').trim()) return res.status(400).json({ error: `${f.label} is required.` });
  }
  const id = insertRow(table, req.body || {});
  res.json(db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id));
});

app.put('/api/admin/content/:table/:id', requireAuth, validTable, (req, res) => {
  const { table, id } = req.params;
  const def = TABLES[table];
  const body = req.body || {};
  const fields = def.fields.filter((f) => f.name in body);
  if (!fields.length) return res.status(400).json({ error: 'Nothing to update.' });
  for (const f of fields) {
    if (f.required && !String(body[f.name] ?? '').trim()) return res.status(400).json({ error: `${f.label} is required.` });
  }
  db.prepare(`UPDATE ${table} SET ${fields.map((f) => `${f.name} = ?`).join(', ')} WHERE id = ?`)
    .run(...fields.map((f) => normalize(f, body[f.name])), Number(id));
  res.json(db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(Number(id)));
});

app.delete('/api/admin/content/:table/:id', requireAuth, validTable, (req, res) => {
  db.prepare(`DELETE FROM ${req.params.table} WHERE id = ?`).run(Number(req.params.id));
  res.json({ ok: true });
});

/* ---------- Messages ---------- */
app.get('/api/admin/messages', requireAuth, (req, res) =>
  res.json(db.prepare('SELECT * FROM messages ORDER BY id DESC').all()));
app.put('/api/admin/messages/:id', requireAuth, (req, res) => {
  db.prepare('UPDATE messages SET is_read = ? WHERE id = ?').run(req.body?.is_read ? 1 : 0, Number(req.params.id));
  res.json({ ok: true });
});
app.delete('/api/admin/messages/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM messages WHERE id = ?').run(Number(req.params.id));
  res.json({ ok: true });
});

/* ---------- Uploads ---------- */
const ALLOWED = { '.png': 1, '.jpg': 1, '.jpeg': 1, '.webp': 1, '.gif': 1, '.svg': 0, '.pdf': 1 };
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
    },
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, !!ALLOWED[path.extname(file.originalname).toLowerCase()]),
});

app.post('/api/admin/upload', requireAuth, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Only PNG, JPG, WEBP, GIF, or PDF files (max 8MB) are allowed.' });
  res.json({ url: `/uploads/${req.file.filename}` });
});

/* ---------- Errors ---------- */
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'File too large (max 8MB).' : 'Server error' });
});

app.listen(PORT, () => {
  console.log(`\n  ✦ Portfolio running →  http://localhost:${PORT}`);
  console.log(`  ✦ Admin dashboard   →  http://localhost:${PORT}/admin\n`);
});

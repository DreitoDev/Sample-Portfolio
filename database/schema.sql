-- =========================================================
-- Andrei R. Gandia Portfolio - SQLite database schema + content
-- The live database (data/portfolio.db) is created automatically
-- by server.js on first run. This file is a readable reference.
-- Private data (messages, admin password, page views) is NOT included.
-- =========================================================

-- ---------- Tables ----------
CREATE TABLE settings (key TEXT PRIMARY KEY,
  value TEXT);

CREATE TABLE admins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL );

CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now','localtime')) );

CREATE TABLE page_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT DEFAULT (datetime('now','localtime')) );

CREATE TABLE skills (id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  category TEXT,
  level INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now','localtime')));

CREATE TABLE projects (id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  category TEXT,
  description TEXT,
  tech TEXT,
  image TEXT,
  github_url TEXT,
  live_url TEXT,
  year TEXT,
  featured INTEGER DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now','localtime')));

CREATE TABLE education (id INTEGER PRIMARY KEY AUTOINCREMENT,
  level TEXT,
  school TEXT,
  course TEXT,
  start_year TEXT,
  end_year TEXT,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now','localtime')));

CREATE TABLE experience (id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT,
  organization TEXT,
  type TEXT,
  start_date TEXT,
  end_date TEXT,
  description TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now','localtime')));

CREATE TABLE certificates (id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  issuer TEXT,
  date TEXT,
  url TEXT,
  image TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now','localtime')));

-- ---------- settings ----------
INSERT INTO settings (key, value) VALUES ('full_name', 'Andrei R. Gandia');
INSERT INTO settings (key, value) VALUES ('first_name', 'Andrei');
INSERT INTO settings (key, value) VALUES ('last_name', 'Gandia');
INSERT INTO settings (key, value) VALUES ('roles', 'Web Developer, UI/UX Designer, BS Information Technology');
INSERT INTO settings (key, value) VALUES ('tagline', 'I design and build clean, minimal, and user-friendly web experiences — where every pixel has a purpose.');
INSERT INTO settings (key, value) VALUES ('about', 'I''m Andrei, a Bachelor of Science in Information Technology student at Camarines Sur Polytechnic Colleges, based in Polangui, Albay. I love turning ideas into clean, responsive, and intuitive interfaces that look good and feel effortless to use.

My strength is front-end development and UI/UX design — I care about the details: spacing, typography, motion, and how every interaction feels. I''m also steadily growing my back-end skills with PHP, Node.js, and MySQL so I can bring complete ideas to life, from the design all the way to the database.

Right now I''m focused on learning, building real projects, and finding opportunities where I can grow as a developer and contribute to a team.');
INSERT INTO settings (key, value) VALUES ('location', 'Polangui, Albay, Philippines');
INSERT INTO settings (key, value) VALUES ('email', 'gandiaandrei5@gmail.com');
INSERT INTO settings (key, value) VALUES ('phone', '0991283422');
INSERT INTO settings (key, value) VALUES ('facebook', 'https://www.facebook.com/share/1YbVdme7Yy/?mibextid=wwXIfr');
INSERT INTO settings (key, value) VALUES ('instagram', 'https://www.instagram.com/wrld.of_drei');
INSERT INTO settings (key, value) VALUES ('github', 'https://github.com/DreitoDev');
INSERT INTO settings (key, value) VALUES ('linkedin', '');
INSERT INTO settings (key, value) VALUES ('profile_image', '/uploads/profile.png');
INSERT INTO settings (key, value) VALUES ('cv_file', '');
INSERT INTO settings (key, value) VALUES ('available', '1');

-- ---------- skills ----------
INSERT INTO skills (id, name, category, level, sort_order, created_at) VALUES (1, 'HTML5', 'Frontend', 95, 1, '2026-11-15 14:00:37');
INSERT INTO skills (id, name, category, level, sort_order, created_at) VALUES (2, 'CSS3', 'Frontend', 92, 2, '2026-11-15 14:00:37');
INSERT INTO skills (id, name, category, level, sort_order, created_at) VALUES (3, 'JavaScript', 'Frontend', 82, 3, '2026-11-15 14:00:37');
INSERT INTO skills (id, name, category, level, sort_order, created_at) VALUES (4, 'Responsive Design', 'Frontend', 90, 4, '2026-11-15 14:00:37');
INSERT INTO skills (id, name, category, level, sort_order, created_at) VALUES (5, 'Bootstrap', 'Frontend', 85, 5, '2026-11-15 14:00:37');
INSERT INTO skills (id, name, category, level, sort_order, created_at) VALUES (6, 'Tailwind CSS', 'Frontend', 78, 6, '2026-11-15 14:00:37');
INSERT INTO skills (id, name, category, level, sort_order, created_at) VALUES (7, 'React', 'Frontend', 65, 7, '2026-11-15 14:00:37');
INSERT INTO skills (id, name, category, level, sort_order, created_at) VALUES (8, 'Figma', 'Design', 85, 8, '2026-11-15 14:00:37');
INSERT INTO skills (id, name, category, level, sort_order, created_at) VALUES (9, 'UI/UX Design', 'Design', 85, 9, '2026-11-15 14:00:37');
INSERT INTO skills (id, name, category, level, sort_order, created_at) VALUES (10, 'Canva', 'Design', 88, 10, '2026-11-15 14:00:37');
INSERT INTO skills (id, name, category, level, sort_order, created_at) VALUES (11, 'PHP', 'Backend', 55, 11, '2026-11-15 14:00:37');
INSERT INTO skills (id, name, category, level, sort_order, created_at) VALUES (12, 'Node.js / Express', 'Backend', 50, 12, '2026-11-15 14:00:37');
INSERT INTO skills (id, name, category, level, sort_order, created_at) VALUES (13, 'MySQL', 'Database', 65, 13, '2026-11-15 14:00:37');
INSERT INTO skills (id, name, category, level, sort_order, created_at) VALUES (14, 'Git & GitHub', 'Tools', 70, 14, '2026-11-15 14:00:37');
INSERT INTO skills (id, name, category, level, sort_order, created_at) VALUES (15, 'VS Code', 'Tools', 90, 15, '2026-11-15 14:00:37');

-- ---------- education ----------
INSERT INTO education (id, level, school, course, start_year, end_year, description, sort_order, created_at) VALUES (1, 'College', 'Camarines Sur Polytechnic Colleges', 'Bachelor of Science in Information Technology', '2023', 'Present', 'Building a strong foundation in web development, UI/UX design, programming, and database management.', 1, '2026-11-15 14:00:37');
INSERT INTO education (id, level, school, course, start_year, end_year, description, sort_order, created_at) VALUES (2, 'Senior High School', 'Polangui General Comprehensive High School', '', '2020', '2022', '', 2, '2026-11-15 14:00:37');
INSERT INTO education (id, level, school, course, start_year, end_year, description, sort_order, created_at) VALUES (3, 'Junior High School', 'Polangui General Comprehensive High School', '', '2016', '2020', '', 3, '2026-11-15 14:00:37');
INSERT INTO education (id, level, school, course, start_year, end_year, description, sort_order, created_at) VALUES (4, 'Elementary', 'Polangui North Elementary School', '', '2010', '2016', '', 4, '2026-11-15 14:00:37');

-- experience: (empty)

-- certificates: (empty)

-- ---------- projects ----------
INSERT INTO projects (id, title, category, description, tech, image, github_url, live_url, year, featured, sort_order, created_at) VALUES (1, 'Personal Portfolio', 'Web App', 'A dynamic, minimalist portfolio with smooth animations and a full admin dashboard. All content — skills, projects, education, and messages — is stored in a database and managed without touching code.', 'HTML, CSS, JavaScript, Node.js, Express, SQLite', '/uploads/project-portfolio.jpg', '', '', '2026', 1, 1, '2026-11-15 14:00:37');


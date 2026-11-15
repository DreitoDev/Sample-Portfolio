# Andrei R. Gandia — Portfolio

Dynamic portfolio na gawa sa **Node.js + Express + SQLite**. Minimalist black ang design at may smooth animations.

## Paano patakbuhin

```bash
npm install      # isang beses lang
npm start
```

- Portfolio: http://localhost:3000
- Admin: http://localhost:3000/admin (username `Andrei0950`)

> Kailangan ng Node.js 22.13 o mas bago (gumagamit ng built-in `node:sqlite`).

## Folder structure

```
server.js            → API, database, login, uploads
data/portfolio.db    → SQLite database (auto-created sa unang takbo)
public/index.html    → Portfolio page
public/css, js       → Design at animations
public/admin/        → Admin dashboard
public/uploads/      → Mga in-upload na larawan at CV
```

## Database

Gumagamit ito ng **SQLite**, ang database na naka-save bilang iisang file.

- **`data/portfolio.db`**: ang totoong database. Awtomatiko itong nagagawa sa unang `npm start` at may laman na agad na default content. Hindi ito kasama sa GitHub (`.gitignore`) dahil may laman itong pribadong data, gaya ng mga message ng bisita at session secret.
- **[`database/schema.sql`](database/schema.sql)**: kopya ng lahat ng table at ng public content (profile, skills, education, projects), para makita ang istruktura ng database. Hindi kasama rito ang messages, ang password, at ang page views.

| Table | Laman |
|---|---|
| `settings` | Profile info (pangalan, about, email, social links, photo, CV) |
| `skills` | Mga skill, ang category nito, at ang level (%) |
| `projects` | Mga project, kasama ang larawan, tech, at mga link |
| `education` | Educational background |
| `experience` | OJT, freelance, at org work |
| `certificates` | Mga certificate at achievement |
| `messages` | Mga message galing sa contact form |
| `admins` | Admin login (naka-hash ang password gamit ang bcrypt) |
| `page_views` | Bilang ng bisita |

Para buksan ang `portfolio.db`, puwede mong gamitin ang [DB Browser for SQLite](https://sqlitebrowser.org/) o ang "SQLite Viewer" extension sa VS Code.

## Admin features

- **Profile**: pangalan, tagline, about, contact, social links, photo, at CV
- **Skills / Projects / Education / Experience / Certificates**: add, edit, at delete
- **Messages**: inbox ng contact form (may unread badge)
- **Dashboard**: page views at mga bilang
- **Account**: palitan ang username o password

Kapag walang laman ang Experience o Certificates, kusa itong nakatago sa site at lalabas lang kapag may idinagdag ka na.

## Pag-reset

I-delete ang `data/portfolio.db` at patakbuhin ulit. Babalik sa default ang lahat ng content.

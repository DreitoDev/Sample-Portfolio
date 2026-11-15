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

## Admin features

- **Profile**: pangalan, tagline, about, contact, social links, photo, at CV
- **Skills / Projects / Education / Experience / Certificates**: add, edit, at delete
- **Messages**: inbox ng contact form (may unread badge)
- **Dashboard**: page views at mga bilang
- **Account**: palitan ang username o password

Kapag walang laman ang Experience o Certificates, kusa itong nakatago sa site at lalabas lang kapag may idinagdag ka na.

## Pag-reset

I-delete ang `data/portfolio.db` at patakbuhin ulit. Babalik sa default ang lahat ng content.

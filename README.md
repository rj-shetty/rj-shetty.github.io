# Ranjan’s Space

> A desktop-inspired personal portfolio for selected work, practical tools, and ways to connect.

## Run locally

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000). The site also works when you open `index.html` directly. It uses browser-native HTML, CSS, and JavaScript with no package installation, build step, or runtime dependencies.

Run the JavaScript syntax check with:

```bash
npm run check
```

## What’s inside

- **About Me** — profile, education, and current focus. This is the window shown on startup.
- **Projects** — selected work, project highlights, technologies, and available links.
- **Skills & Tools** — searchable skill groups.
- **Contact** — email, copy-to-clipboard action, social links, and location.
- **Terminal** — a local portfolio command prompt. It can open apps and change the theme; it does not run system commands.
- **Sticky Notes** — editable notes saved in this browser, with color choices and a short undo window after deletion.

The Projects, Skills & Tools, and Contact icons begin highlighted in the dock as startup indicators; their windows open only when selected. Other app windows are opened from the desktop shortcuts or Start menu. Windows can be moved, resized, minimized, maximized, and closed on desktop-sized screens. On smaller screens, windows use the available workspace as a full-screen app view.

## Update portfolio content

Profile details, social links, skills, and projects live in [`js/portfolio-data.js`](js/portfolio-data.js). The animated cat artwork used in About Me is in `assets/ranjanshetty.gif`. Project source and demo links are shown only when a URL is provided. App markup and content templates are in [`index.html`](index.html); layout, themes, and responsive styles are in [`os.css`](os.css); app behavior and window controls are in [`portfolio.js`](portfolio.js).

Theme choice is remembered on this device. Sound effects start enabled each time the page loads. Sticky notes are stored locally in the current browser and are not sent to a server.

## Deploy

GitHub Actions publishes the static site from the root of `main`. In GitHub, set **Settings → Pages → Build and deployment → Source** to **GitHub Actions**. The `CNAME` file configures [ranjanshetty.me](https://ranjanshetty.me).

## Main files

- `index.html` — desktop shell, dock, Start menu, and app templates
- `os.css` — shared design tokens, themes, app layouts, and responsive styles
- `portfolio.js` — app behavior, window manager, theme, sound, and local interactions
- `js/portfolio-data.js` — profile, skills, social links, and projects
- `server.js` — dependency-free local server
- `.github/workflows/` — static site deployment workflow

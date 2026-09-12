# تتریــنو (Tetherino)

Live USDT and USD rates in Iranian Toman, with a 15-day tether trend and a two-way converter.

## Demo

<!-- Add your live demo link here -->
**Live demo:** [Here](https://condev-dev.github.io/Tetherino/)

## Features

- Live USDT/Toman rate from the Nobitex public market API
- Free-market USD rate and daily range from the tgju public API
- 15-day tether trend chart drawn as inline SVG
- Two-way USDT ↔ Toman converter with quick amounts
- Offline app shell, honest cached-data timestamps, installable PWA
- Persian RTL UI with custom icon set and local fonts

## Tech

Vanilla HTML, CSS, JavaScript · GSAP 3.12.5 · PWA (offline + installable)

## Run locally

Serve this folder with any local static HTTP server, then open its localhost URL. A service worker will not run on `file://`. No build step or app dependency installation is required.

## Deploy

Upload all files together to any static HTTPS host (GitHub Pages, Netlify, Vercel). Keep the folder structure intact.

## License

MIT

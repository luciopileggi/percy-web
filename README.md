# Percy Bysshe Shelley Atlas

A chronological, data-driven web atlas of places connected to Percy Bysshe Shelley's life and his public memory.

Open `index.html` in a browser (served over HTTP — see below) to explore an interactive map, a chronological timeline of his journey, a searchable list of places, and detail cards for each presence, residence, travel, and commemorative site.

## Scope

The atlas covers Shelley's presences, travels, and residences, plus his death and public memory (plaques, monuments, museums). It spans roughly **1810–1822** and includes places across Italy, England, France, Switzerland, Germany, the Netherlands, Ireland, Scotland, and Wales.

## What's inside

This repository is a **static, published build** of the atlas — there is no build step here. The files are:

| File | Purpose |
|---|---|
| `index.html` | Page shell: panels, filters, map, timeline (its element IDs must match `app.js`). |
| `app.js` | All frontend logic — a single vanilla-JS IIFE (no framework, no modules). |
| `styles.css` | Plain CSS only — no inline styles, no frameworks. |
| `site-data.js` | **Generated** payload (`window.SHELLEY_ATLAS_DATA`) — never edit by hand. |
| `favicon.svg` | Site icon. |

## Published

Live atlas: **https://percy-atlas.vercel.app/**

Deployed on Vercel and synced from this repository — every `git push` to `main` produces a new production deployment automatically.

## Viewing locally

The map uses MapLibre GL, which will not load from a `file://` URL. **Serve over HTTP:**

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

The map style is a bare OpenStreetMap raster, so **internet access is required** to see map tiles.

# Percy Bysshe Shelley Atlas

A chronological, data-driven web atlas of places connected to Percy Bysshe Shelley's life and his public memory.

Open `index.html` in a browser (served over HTTP — see below) to explore an interactive map, a chronological timeline of his journey, a searchable list of places, and detail cards for each presence, residence, travel, and commemorative site.

## What's inside

This repository is a **static, published build** of the atlas — there is no build step here. The files are:

| File | Purpose |
|---|---|
| `index.html` | Page shell: panels, filters, map, timeline (its element IDs must match `app.js`). |
| `app.js` | All frontend logic — a single vanilla-JS IIFE (no framework, no modules). |
| `styles.css` | Plain CSS only — no inline styles, no frameworks. |
| `site-data.js` | **Generated** payload (`window.SHELLEY_ATLAS_DATA`) — never edit by hand. |
| `favicon.svg` | Site icon. |

## Viewing

The map uses MapLibre GL, which will not load from a `file://` URL. **Serve over HTTP:**

```sh
python3 -m http.server 8000
# then open http://localhost:8000
```

The map style is a bare OpenStreetMap raster, so **internet access is required** to see map tiles.

## Data flow

The intellectual content lives in curated YAML datasets, not in this directory. `scripts/build.rb` (in the source repository) joins and enriches those datasets and emits `site-data.js`, which the frontend renders.

```
data/passages.yaml ─┐
data/sources.yaml  ─┤
data/place_coordinates.yaml ─┤
data/people.yaml   ─┤
data/media_assets.yaml ─┐    scripts/build.rb       site-data.js ─┐
data/presence_metadata.yaml ──┘      (Ruby)                    ──┤
app.js (vanilla JS, single IIFE)  <───────────────────────────────┘
```

The authoritative source of truth for the atlas is the **source repository** (`percy/`), not this published copy:

- `percy/AGENTS.md` — working guidance for the source repository
- `percy/REPOSITORY_GUIDE.md` — how to add and edit records
- `percy/data/schema.md` — field-level record schema and valid enum values

If you are adding or editing records, work in the source repository, rebuild with `ruby percy/scripts/build.rb`, then run `node --check percy/site-data.js` before republishing these static assets.

## Scope

The atlas covers Shelley's presences, travels, and residences, plus his death and public memory (plaques, monuments, museums). It spans roughly **1810–1822** and includes places across Italy, England, France, Switzerland, Germany, the Netherlands, Ireland, Scotland, and Wales.

## License

Curated biographical content is documented in the source repository (`percy/`). See there for provenance, sources, and licensing notes.

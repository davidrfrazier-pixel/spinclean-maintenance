# Washboard Maintenance App — Claude Code Notes

## Repo structure

```
index.html          — the entire app (HTML + CSS + JS, ~420 KB)
manifest.json       — PWA manifest (file-based icons, not base64)
sw.js               — service worker (caching, offline support)
vercel.json         — Vercel header config (sw.js no-cache, icon immutable cache)
team-manifest.json  — alternate manifest (unused in current deploy)
icons/
  icon-192.png      — 192×192 icon
  icon-512.png      — 512×512 icon
  icon-maskable-512.png — 512×512 maskable icon (navy safe-zone background)
docs/
  app-architecture.md
  known-issues.md
```

## Single-file constraint

All app logic, styles, and markup live in `index.html`. This is intentional. Do not split it into separate JS/CSS files unless explicitly asked. Always make targeted edits — never full rewrites.

## Editing rules

- Edit `index.html` with targeted find-replace only
- After any JS edit, validate syntax (use `esprima` or acorn if node is unavailable)
- Do not touch authentication logic or unrelated features
- Watch `docs/known-issues.md` before adding functions or variables

## Deployment

GitHub → Vercel auto-deploy. No build step — Vercel serves `index.html` as a static file.

## Service worker

`sw.js` is at the repo root. It is the required exception to the single-file pattern — browsers require the SW to be a separate file. When bumping the cache version (e.g. after a deploy that changes cached assets), increment the `v1` suffix in the `CACHE_SHELL` and `CACHE_DATA` constants in `sw.js`.

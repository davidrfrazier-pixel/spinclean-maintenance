# App Architecture

## Overview

The Washboard Team App is a single-page application served as a single `index.html` file (~420 KB). There is no build step, no bundler, and no framework. All HTML, CSS, and JavaScript are in one file.

## State management

A single global `state` object holds all runtime data:

```js
state = {
  user,           // logged-in user record
  locations,      // all Supabase locations
  myLocations,    // locations accessible to this user
  activeLocId,    // currently selected location
  allMachines,    // { [locId]: machineArray }
  log,            // maintenance log for active location
  messages,       // messages for active location
  supplyRequests,
  checklists,
  shifts,
  tab,            // active bottom-nav/sidebar tab
  selectedMachineId,
  loginError,
  ...
}
```

The `render()` function is the single source of truth for the UI — it reads `state` and writes `document.getElementById('root').innerHTML`. No virtual DOM, no diffing.

## Data layer (Supabase)

All database access goes through the Supabase JS client (`db`), initialized at the top of the script block:

```js
const db = supabase.createClient(SUPA_URL, SUPA_KEY);
```

**Read functions** (prefixed `load*` or `dbGet*`) — return data directly, called on page load or tab switch.

**Write functions** — all guarded with an offline check (see below). Return `{ data, error }` or `error` directly:
- `insertMachine`, `insertMachines`, `insertLog`, `updateMachineFlag`
- `dbSendMessage`
- `dbClockIn`, `dbClockOut`
- `dbCreateShift`, `dbDeleteShift`
- `dbUpsertEmployee`
- `dbSubmitSupplyRequest`, `dbUpdateSupplyStatus`

## Roles

- `admin` — full access, desktop sidebar layout
- `manager` — full access, desktop sidebar layout
- `attendant` — mobile-only, limited tabs (Home, Schedule, Messages, Supplies, Profile)
- `maintenance` — mobile-only, limited tabs (Home, Machines, Log, Supplies, Profile)

## PWA / Service Worker

`sw.js` (repo root) is the service worker. It was added as a required exception to the single-file pattern — browsers require the SW to be a separate file served from the scope root.

### Caching strategy

| Content | Strategy |
|---|---|
| App shell (`/`, manifest, icons, Supabase CDN) | Cache-first, precached on SW install |
| Supabase API reads (GET to `*.supabase.co`) | Stale-while-revalidate — cached immediately, updated in background |
| Supabase API writes (non-GET) | Network-only — failures surface to the offline guard |
| Navigation requests | Cache-first (`/` from shell cache) — enables offline SPA load |
| Google Fonts / other CDN | Stale-while-revalidate at runtime |

### Offline write handling

`showOfflineBanner()` and two helpers (`offlineResult()`, `offlineError()`) are defined just after the Supabase utility functions. Every write function calls `if (!navigator.onLine) return offlineResult/offlineError()` as its first statement.

The banner is a fixed-position navy strip that auto-dismisses on the `online` event.

### Cache versioning

Two versioned caches: `washboard-shell-v1` and `washboard-data-v1`. To invalidate caches on deploy, bump the `v1` suffix in `sw.js`. The activate handler deletes any cache whose name doesn't match the current versions.

### Update flow

The SW calls `self.skipWaiting()` on install, so new SWs activate immediately without waiting for all tabs to close. `self.clients.claim()` is called on activate. The registration script in `index.html` listens for `controllerchange` and reloads the page, delivering the new version transparently.

## Icons

Source icon: a wave/washboard PNG with transparency.

| File | Size | Purpose |
|---|---|---|
| `icons/icon-192.png` | 192×192 | Standard icon |
| `icons/icon-512.png` | 512×512 | Standard icon (required for PWA installability) |
| `icons/icon-maskable-512.png` | 512×512 | Maskable — navy background, icon at 73% of canvas |

## Session persistence

User session is stored in `localStorage` as `wb_user` (JSON). On init, the app checks for a saved session and re-authenticates via Supabase before showing the app shell.

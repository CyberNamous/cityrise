# CITYRISE

**Build a City. Shape a Future.**

A complete, local-first, single-player isometric browser city builder. The browser owns city simulation and local saves. A Cloudflare Worker serves the application and an optional D1-backed device-profile/leaderboard API. No frontend framework, bundler, external fonts, image CDN, paid API, game engine, separate production server, or Cloudflare Pages project is required.

## Quick start — no Cloudflare login needed locally

Install **Node.js 22 or newer** and npm. Extract the ZIP, then run:

```sh
cd cityrise
npm ci
npm run db:local
npm run dev
```

Open the URL printed by Wrangler, normally **http://localhost:8787**. Do not open `index.html` as a `file://` URL: the ES modules, secure-context device identity, and API need an HTTP origin. Localhost is treated as a secure context. Use HTTPS in production.

The explicit database ID placeholder in `wrangler.jsonc` works with local D1 emulation; it MUST be replaced for remote deployment. Local D1 initialization was verified with that placeholder. If Wrangler chooses another port, use the printed URL consistently: different origins have different browser saves.

First launch: choose a mayor display name, select a mode, enter a city name, and found the city. Existing valid saves resume automatically after reload. Use the city menu to make a new city or import a JSON save.

## Implemented features

- 40 × 40 logical grid with isometric Canvas 2D rendering and reverse tile picking.
- Original local SVG registration illustration and icons, procedurally drawn/cached buildings, roads, trees, parks, shadows, construction indicators, and small decorative vehicles.
- Drag panning, touch pinch zoom, mouse-wheel zoom, explicit zoom/center/grid controls, and keyboard construction.
- Eleven building types: small house, apartment block, local shop, commercial building, workshop, road, power station, water facility, park, clinic, and fire station.
- Placement previews, occupied-land/boundary/affordability checks, selection, upgrades, demolition, and road access from the regional gateway.
- Discrete monthly population, employment, tax income, upkeep, utilities, demand, environmental pressure, happiness, coverage, and milestones.
- Easy, Medium, Hard, and unranked Sandbox; common construction prices in all modes.
- Pause/1×/2×/4× speed controls, settings, monthly financial report, city menu, warnings, and financial recovery aid.
- Debounced local autosave, manual save, one previous valid backup, reset/new-city confirmations, JSON export/import with bounds/schema validation and device-identity preservation.
- Device-based anonymous profiles, deliberate name changes, optional per-mode best-score rankings, pagination, empty/loading/error/retry states.
- Worker request validation, parameterized SQL, durable submission cooldowns, database-backed registration cap, same-origin checks, safe errors, and server-side Sandbox mode rejection.
- Responsive portrait/landscape layout, safe-area spacing, scrollable construction menus, reduced-motion option, native dialogs, and keyboard-accessible HTML controls.

## Structure

```text
cityrise/
├── package.json
├── package-lock.json          # reproducible development-tool versions
├── wrangler.jsonc
├── README.md
├── schema.sql
├── validate.mjs              # dependency-free release checks
├── public/
│   ├── index.html
│   ├── styles/main.css
│   ├── scripts/
│   │   ├── main.js             # bootstrap, interface, dialogs, monthly clock
│   │   ├── game.js             # state and construction operations
│   │   ├── renderer.js         # projection, camera, scene/art caches, input
│   │   ├── economy.js          # single price catalog and simulation formulas
│   │   ├── modes.js            # difficulty and shared balance values
│   │   ├── storage.js          # validation, save, backup, import/export
│   │   ├── registration.js     # device profile and network helpers
│   │   ├── leaderboard.js      # rankings client and text-only rendering
│   │   └── scoring.js          # formula shared with the Worker
│   └── assets/
│       ├── icons/*.svg
│       └── buildings/skyline.svg
└── src/
    ├── index.js                # Worker routing, asset fallback, safe errors
    ├── http.js                 # bounded JSON, validation, token hashing
    └── api/
        ├── players.js
        └── leaderboard.js
```

The additional `scoring.js` prevents browser/server formula drift. `http.js` centralizes server input handling. The lockfile pins Wrangler's dependency tree. No `tests/`, migrations directory, `.gitignore`, generated runtime data, or installed dependencies are included.

## Controls and first-city guide

1. Start at the included junction. All modes receive the same **free starter grant**: 34 road tiles, one power station, one water facility, two houses, one shop, one workshop, and one park. This grant does not deduct from the mode's starting treasury.
2. Roads must form an orthogonal path back to tile **(0, 20)**, the regional gateway. The gateway road cannot be demolished. Other roads can be removed; disconnected buildings lose productive access but still incur upkeep.
3. A non-road building needs at least one footprint tile orthogonally adjacent to a gateway-connected road. Merely touching another building is not access.
4. Choose a category and building, then tap/click a free tile. A green/red footprint preview and text explain validity. Keep placing that building until you select **Done**. Dragging pans instead of constructing.
5. New construction takes the catalog's 0–2 monthly ticks. Construction consumes its full listed upkeep even while unfinished; capacity/output begin when complete. Roads complete immediately.
6. Build houses, keep enough jobs, and wait for the monthly simulation. Add shops/offices/workshops for employment. Extend connected utilities as demand grows. Parks, clinics, and fire coverage raise happiness.
7. Select a building by its ground footprint to inspect it. Eligible buildings upgrade to level 3, spend one month under construction, and scale capacity/jobs/output/demand/upkeep by level. Roads and parks do not upgrade.
8. Use the month/report button for the income and service breakdown. At low funds, the menu offers recovery aid. It does not automatically delete or reset a bankrupt city.

Canvas keyboard controls: focus the map, use arrow keys to move the tile cursor (initially 20,19), Enter to select/build, `+`/`-` to zoom, and Escape to leave construction mode. Normal keyboard tab order operates menus. The isometric scene is not a complete screen-reader representation of all map contents.

## Modes and fixed-price policy

The authoritative construction catalog, including every footprint, price, upkeep, job/resident capacity, and service radius, lives in **`public/scripts/economy.js` → `CATALOG`**. No mode-specific construction or upgrade price tables exist.

| Mode | Starting treasury | Upkeep factor | Growth factor | Shortage/service penalty factor | Recovery aid |
| --- | ---: | ---: | ---: | ---: | ---: |
| Easy | ₱100,000 | 0.65 | 1.30 | 0.65 | ₱20,000 |
| Medium | ₱95,000 | 1.00 | 1.00 | 1.00 | ₱15,000 |
| Hard | ₱90,000 | 1.40 | 0.75 | 1.40 | ₱10,000 |
| Sandbox | Unlimited | 0 | 1.00 | 0.70 | Not needed |

Sandbox displays the same catalog prices but does not deduct funds, has zero monetary upkeep, and is never ranked. It still simulates connectivity, jobs, utilities, construction time, population, services, and happiness.

- Upgrade price: `round(base construction price × 0.6 × current level)` in every mode.
- Demolition refund outside Sandbox: `round(base construction price × 0.25)`, irrespective of upgrade level. It does not refund prior upgrades. Sandbox does not accrue money from demolition.
- Recovery aid is available below ₱15,000, once per 12 game months. It clears negative debt to zero before applying the mode's grant; this is an intentional anti-deadlock rule.

## Simulation and balance

A game month is **10 foreground seconds at 1×**, 5 seconds at 2×, or 2.5 seconds at 4×. Opening a native dialog pauses simulation without changing the selected speed. Hidden tabs pause ticks and rendering; elapsed time is reset on visibility/dialog changes. Long suspensions do not produce unlimited catch-up updates. There is no offline-income catch-up.

Only monthly ticks and meaningful edits reevaluate the economy. Rendering does not run monthly simulation. Major formulas are deterministic:

- Completed, connected utility producers supply the road-connected city globally. Utility satisfaction is the minimum of power supply/demand and water supply/demand, capped at 1. A zero-demand utility is fully satisfied.
- Capacity and advertised jobs sum the completed, connected buildings' base capacities × levels. Effective jobs additionally scale with utility satisfaction.
- The workforce is `population × 0.5`. Employment is the proportion of that workforce covered by effective jobs, capped at 100%; an empty city reports 100% employment to avoid division by zero.
- Each service's coverage is the fraction of connected residential capacity whose footprint center falls within a completed, connected provider's Euclidean radius. Coverage uses capacity, not individually simulated citizens.
- Happiness starts at 78, gains up to 12 park / 8 clinic / 7 fire points, and loses points for utility shortages, missing clinic/fire coverage, unemployment, and pollution. Mode penalties apply where configured. Happiness is bounded to 5–100.
- Pollution is the sum of completed, connected producers' pollution × level. Its happiness deduction is capped at 30.
- Target population: `floor(min(residential capacity, advertised jobs × 2 + 8) × utility satisfaction × happiness / 100)`. Growth approaches this target at a mode-adjusted 22% of the remaining gap per month, with at least one resident. Decline approaches it by 25% of the gap. Population is bounded by current connected capacity.
- Monthly tax income: `round(population × 90 + employed workers × 110)` pesos.
- Monthly operating expenses: `round(sum(all building base upkeep × level) × mode upkeep factor)`, including unfinished/disconnected buildings.
- Residential and business demand are bounded 0–100 indicators derived from employment balance and happiness. They describe the same supply/demand pressures that determine population targets; they do not generate independent random events or auto-place buildings.
- Population milestones at 50, 150, 400, 1,000, and 2,500 award `₱5,000 × milestone ordinal` once each outside Sandbox. Already earned milestones remain earned after population declines.
- Treasury is bounded to -₱10,000,000 … ₱1,000,000,000. Financial reports show the latest tick's income/expenses; just after import/reload they start at zero until the next tick.

For precise coefficients see `evaluate()` and `tick()` in `economy.js`, and shared timing/price multipliers in `modes.js`. Utilities and service capacity are deliberately simplified; there are no separate pipe/wire networks, traffic pathfinding, disasters, or citizen agents.

## Local saves and privacy

The compact version-1 save fits comfortably in `localStorage` at this map size. One active city is stored at `cityrise.city.v1`, one previous valid snapshot at `cityrise.city.backup.v1`, and a separate device profile at `cityrise.profile.v1`. Edits and ticks trigger a 450 ms debounced save; `pagehide` and hiding the tab attempt an immediate save. Manual saving and export are available in the city menu.

Export files contain city state, the player ID and display-name snapshot, but **no device token or other credentials**. Derived reports/stats and camera/render state are not trusted or persisted; jobs, demand, utility state, happiness, etc. are recomputed from validated buildings. Imports retain the current device's profile rather than importing identity credentials.

Import validation rejects malformed JSON, unsupported versions, saves over 1 MB, unsupported/prototype-key modes/buildings, nonfinite or out-of-range balances, illegal levels/coordinates, overlapping footprints, duplicate building IDs, excess buildings, and invalid milestones. Accepted imports require deliberate confirmation before replacing the active city. One save supports up to 1,600 building records, a 40 × 40 grid, levels 1–3, construction states 0–2, and a month counter of 0–120,000.

A corrupt main save is not erased merely by opening the app. A valid backup can restore it; otherwise a warning and raw-data export are available before deliberate replacement. Browser storage failures allow in-memory play and show an export warning. **Export before closing when storage is blocked.** Browser storage clearing, private-session expiry, origin changes, and device loss can lose the city and identity. Export regularly. Concurrent play in multiple tabs is not coordinated; use one active tab per origin to avoid last-writer-wins saves.

D1 stores only profile records, registration anti-abuse metadata, and best leaderboard summaries—not city layouts, saves, coordinates, or tick histories. A SHA-256 digest of the connecting IP is stored with registration records for a basic creation cap; this digest is not a guarantee of anonymization. Consider retention/privacy requirements before a public launch.

Offline play means the already-loaded application continues to simulate, save, and export when API/network access fails. There is **no service worker or guaranteed offline cold-start/reload installation** in this release.

## Owner action: create D1 and deploy to Cloudflare

These remote steps require **your own Cloudflare account and access to Workers and D1**. No production database ID or credentials have been fabricated, and no remote deployment is included.

```sh
# In the cityrise directory, after npm ci:
npx wrangler login
npx wrangler d1 create cityrise-db
```

The create command prints a `database_id`. Replace only the explicit `REPLACE_WITH_YOUR_D1_DATABASE_ID` value in `wrangler.jsonc`, keeping binding `DB` and database name `cityrise-db`. The database ID is a resource identifier, not a password.

```sh
# Local and remote stores are separate. Initialize each where needed:
npm run db:local
npm run db:remote

# Optional deployment bundle validation, without publishing:
npx wrangler deploy --dry-run

# Publish Worker + static assets:
npm run deploy
```

Open the HTTPS Worker URL printed by Wrangler. Standard Cloudflare account quotas, plan limits, and pricing apply; no paid external API is integrated. Do not commit or distribute your Cloudflare authentication/session credentials. No `.env` file or application API secret is required.

Configuration: `name: cityrise`, entry `src/index.js`, assets directory `./public`, asset binding `ASSETS`, API-first routes `/api` and `/api/*`, D1 binding `DB`, and compatibility date 2026-10-29. Static assets are served directly by Workers Assets. Unknown ordinary paths use the configured HTML application fallback; unknown API paths return JSON 404, not HTML. There is no frontend build step. Wrangler bundles only the Worker module and its imports for deployment.

`schema.sql` is the single, idempotent initial schema. It uses `CREATE TABLE/INDEX IF NOT EXISTS`; it initializes a new installation but is not an upgrade/migration system for an already changed schema.

## API reference

All API requests are same-origin. Write requests require `Content-Type: application/json`; bodies are streamed with a **4 KB limit**, independent of the client-provided Content-Length. Errors have the shape:

```json
{"error":{"code":400,"message":"Human-readable explanation."}}
```

Device initialization generates a cryptographically random UUID v4 and a 32-byte random token in the browser. Authorized writes send `Authorization: Bearer <64 lowercase hexadecimal characters>`. Only SHA-256(token) is stored in D1. The token is not returned by the API and is never exported with a city. HTTPS is required outside localhost. This is possession-based device authorization, **not** a recoverable identity/account system.

### `POST /api/players`

Body: `{"id":"<uuid-v4>","displayName":"Mayor Name"}` plus the device-token header.

Creates a player (201) or idempotently returns the existing matching-token profile (200). A conflicting token receives 401. Concurrent initialization is handled without creating duplicate profiles. Names are trimmed, 3–20 UTF-16 code units, with control/format characters and angle brackets rejected on client and server. The response is `{"player":{"id":"...","displayName":"..."}}`. Initialization does not rename an existing server record; PATCH does.

A database-backed conditional insert limits new profiles to 20 per connecting-IP digest per rolling hour. It is not a global bot defense; NAT users share this cap. Existing matching-token identities can still reconnect. If Cloudflare's connecting IP is absent in local development, registrations share a local-development bucket.

### `PATCH /api/players/:id`

Body: `{"displayName":"Updated Name"}` and the matching device-token header. Only the name is updated. ID remains stable; joined leaderboard entries display the new name. Returns the same `player` object. Unknown or wrong-token profiles receive 401.

### `GET /api/leaderboard?mode=medium&limit=25&offset=0`

Modes: `easy`, `medium`, or `hard` only. Limit is 1–50 (default 25); offset is 0–10,000. Returns:

```json
{"mode":"medium","offset":0,"limit":25,"results":[]}
```

Each result has `displayName`, `playerId`, `score`, `population`, `happiness`, `mode`, and `submittedAt` (Unix seconds of the best achievement). Sorting: score descending, best-achievement time ascending, player ID ascending. One best record per player and mode. The UI offers 25-entry pages and displays an empty state where appropriate.

### `POST /api/leaderboard`

Body: `playerId`, `mode`, `score`, `population`, `happiness`, `treasury`, `employment`, and `milestones`; requires the matching device token. Summary values must be safe integers in server-defined ranges. Population additionally cannot exceed the gross map capacity of 38,400; treasury bounds match the simulation; happiness/employment are 0–100; milestones 0–5. Nonmatching formulas are rejected. The Worker independently refuses Sandbox/unknown mode labels, even if the UI is bypassed.

A conditional atomic D1 upsert allows at most one accepted submission per **player and mode per 60 real seconds**. Lower subsequent scores retain the prior best and its associated achievement stats/date, but still refresh the cooldown. A 429 explains when to retry. Success returns `{"accepted":true,"score":1234,"note":"..."}` where the score is the submitted, recomputed achievement, not necessarily a newly improved personal best.

### Scoring and integrity

Same formula in all competitive modes (separate rankings; no cross-mode normalization):

```text
floor(
  population × 10
  + happiness × 20
  + employment percentage × 10
  + min(100000, max(0, treasury)) / 100
  + earned milestone count × 1000
)
```

There is no time-played bonus. Treasury contributes at most 1,000 points, so simply idling to accumulate unlimited money does not create unbounded points.

**Scores remain client-reported.** The browser can be edited, imported saves can be tampered with, anonymous identities can be recreated, and mode provenance cannot be proven from a summary. Token possession prevents casual updates to another known profile without its credential, but does not make city achievements trustworthy. Range checks, parameterized SQL, a recomputed formula, per-profile cooldowns and IP-based creation caps are only proportionate initial anti-abuse controls. Do not use these rankings for prizes or claim cheat-proof play. Server-authoritative simulation and stronger accounts would be required for that level of integrity. Never insert untrusted names as HTML; this UI uses text nodes.

Cross-origin API requests are rejected (no wildcard CORS). API errors do not expose SQL or stack traces. Unsupported methods yield 405; malformed fields/modes/JSON 400; missing/wrong tokens 401; cross-origin access 403; unknown API routes 404; oversized bodies 413; wrong content type 415; throttling 429; and missing/failing D1 503. Unavailable online services never gate core play.

## Rendering, assets, and payload

All visuals are original local SVGs or Canvas geometry; no commercial game artwork or remote font/icon library is used. The `buildings/skyline.svg` is the registration illustration. All eleven playable building silhouettes, roads, road markings, park details, trees, selection/placement indicators, and construction progress are drawn in `renderer.js`; no corresponding nonexistent sprite files are referenced.

The renderer caches reusable building artwork, caps device pixel ratio at 2, culls against the viewport with a height margin, and caches the complete static viewport between changes. Decorative animation frames restore this viewport and draw small vehicles rather than recomputing the whole scene. Reduced-motion mode draws on changes only. Full-map economic calculations are separate monthly/edit operations, not frame work. Hidden tabs stop requestAnimationFrame, and repeated application transitions reuse one renderer and one set of event listeners.

The compressed initial-application target is below approximately 300 KB. See the measured package section below. Real Android 30–60 FPS, sustained memory behavior, battery use, hardware rasterization, and accessibility require device-based validation; headless timing is not a phone-performance guarantee. Canvas remains fully playable if optional registration artwork fails.

## Verification performed for this delivery

A dependency-free `validate.mjs` release helper is included; run **`npm run verify`** to repeat module/asset, gameplay, save-validation, score-formula, and safe-error checks. More extensive local Worker/D1 and Playwright browser checks were run outside the deliverable. No test folder or browser-testing dependency is shipped:

- Node syntax checks for every browser and Worker JavaScript module.
- Pure game-state checks in all four modes: common construction prices, placement rejection, ticking, upgrades, demolition, recovery, utility shortage, disconnected gateway access, and save round trips.
- Malformed, unsupported-version, duplicate/overlapping, nonfinite, and prototype-key import rejection.
- Real local Wrangler/Miniflare Worker runtime and D1 schema initialization; local API creation, idempotency/concurrent creation, profile rename and token checks, sorting, score formula/ranges, persistent cooldown, lower-score best retention, Sandbox rejection, unknown routes, cross-origin rejection, request-size limits, and content types.
- D1-failure/unbound-binding tests returned safe 503 responses without internal detail.
- Headless Chromium: registration → mode → city, rendered Canvas pixels, keyboard construction/selection/demolition, pan/wheel zoom, real timed monthly progression, reload, JSON download and valid/invalid file import.
- Offline API failure while the loaded city continued to simulate; unavailable localStorage while in-memory play and export guidance remained available.
- Corrupt-save preservation, valid-backup restoration, optional-artwork failure, and no uncaught page exceptions/missing static assets in the main browser path.
- Layout checks at 390×844, 360×640, and 844×390, plus desktop 1440×1000. CDP touch-event pan and two-finger pinch were exercised in mobile emulation without accidental placement.
- Synthetic 1,600-record rendering stress exercise; viewport cache operation verified. This was not real-device FPS testing.
- `wrangler deploy --dry-run` verified the Worker bundle and static-asset discovery. No publish occurred.
- Manual source review covered route/config agreement, state boundaries, DOM text handling, SQL parameterization, and archive hygiene. Screenshots were visually inspected for mobile layout and corrected building shading/clipping.

**Not verified:** real Cloudflare account provisioning/remote D1, public Worker deployment, actual Android hardware, mobile Safari/Firefox behavior, long-duration soak testing, multiplayer (not implemented), or cheat-resistant score authenticity. These are not represented as completed tests.

## Troubleshooting

| Symptom | Action |
| --- | --- |
| Local leaderboard says services unavailable | Run `npm run db:local`, check the `DB` binding, and restart `npm run dev`. The city is still playable. |
| Remote database ID error | Create `cityrise-db` in your account and replace the documented placeholder in `wrangler.jsonc`. |
| Remote API gives 503 / missing table | Run `npm run db:remote` against the correct account/database. Local schema execution does not initialize remote D1. |
| Browser cannot generate an identity | Use the printed localhost URL or HTTPS; secure-context crypto APIs are required. Update old browsers. Plain HTTP LAN addresses are not equivalent to localhost. |
| No residents move in | Unpause; wait a month; check completed houses, gateway-connected roads, utilities, jobs, and happiness. |
| Building is not productive | Inspect construction time and direct adjacency to a gateway-connected road. Disconnected buildings still cost upkeep. |
| Out of funds | Inspect expenses, wait for taxes if your city is solvent, demolish excess infrastructure, or use eligible recovery aid. |
| Save/export import rejected | Read the specific warning. Version 1 only, 1 MB maximum, legal values and nonoverlapping footprints. Never bypass validation to force an unknown format. |
| Storage unavailable | Export JSON before closing; unblock browser storage or use a normal non-private profile. |
| Lost city after changing port/domain/device | Storage is origin- and device-specific. Import your exported city into the new origin. Identity credentials do not travel in city exports. |
| 401 after editing/losing device credentials | Restore the original browser profile if available. No email/password recovery exists. A new local profile cannot take over the previous server identity. |
| 429 on score submit | Wait 60 seconds in that mode. For new-profile caps, wait for the rolling hour. Do not repeatedly create replacement profiles. |
| Controls cover the map | Collapse the construction dock with Hide; close the inspector or use landscape. Drag only on Canvas to avoid page-scroll conflicts. |
| Dependency/runtime problems | Use Node 22+, run `npm ci` from the directory containing the lockfile, then restart Wrangler. |

## Official platform references

- Workers static asset routing: https://developers.cloudflare.com/workers/static-assets/routing/worker-script/
- D1 Wrangler commands: https://developers.cloudflare.com/d1/wrangler-commands/

These are platform references; successful local/dry-run checks do not imply remote deployment.

## Measured package payload

All 22 public files combined: **78,684 bytes uncompressed**, **28,767 bytes as individually gzip-compressed files**. This counts the entire public directory, not only the initial category, and excludes development tooling and documentation. It is a reproducible file-size estimate, not a captured production network trace; real transport headers, compression negotiation, and caching vary.

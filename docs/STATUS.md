# TapMenu 3D — status

## Run
`npm run build && npm start` (needs `DATABASE_URL`). Tables are created with `npx drizzle-kit push`. Demo data is seeded
lazily on first visit (disable with `TAPMENU_SEED_DEMO=false`).
Demo logins (password `demo12345`): owner@ember.demo, kitchen@ember.demo, waiter@ember.demo · platform admin: admin@tapmenu.app / `admin12345`.
Demo menu: `/r/ember-crust?table=T04`.

## Implemented AND tested (API-level end-to-end against the production server, plus a real-Chromium run of the customer flow)
- Multi-tenant signup, workspaces, branding, tables, NFC cards (+QR, printable sheet, activate/deactivate/reassign)
- Menu CRUD, sizes, option groups (required/optional, min/max, quantities, per-size prices, conditional rules), schedules, translations
- Customisation engine shared by client and server; build-your-own pizza; server-side re-pricing (tamper test: client totals ignored)
- Cart persistence, coupons, tax, service charge, fixed fee, auto discount, cash / card-at-table payment, order snapshots
- Duplicate-order protection (idempotency key), order numbering under advisory lock
- Notifications to owner / kitchen stations / on-duty employees with delivery tracking, cursor-based reconnect-safe feed
- Kitchen display with station routing, station-level progress and a unified order status; employee panel (take order, served, requests)
- Speak order (Web Speech API, pause/resume/stop/replay), AI summary with validation + deterministic fallback
- Customer tracking, feedback, assistance requests
- Analytics, payment records, CSV export; platform admin (restaurants, plans, suspension, payments, support, config)
- Tenant isolation checks (cross-tenant PATCH/DELETE/read/order actions all rejected), role checks, plan limits, suspension

## Deviations from the brief (environment is Next.js + local PostgreSQL via Drizzle; no Supabase project available)
- Auth: signed httpOnly cookie sessions + scrypt passwords instead of Supabase Auth.
- Realtime: persisted `notifications` table + 2.5 s cursor polling with backoff/reconnect instead of Supabase Realtime websockets.
- Storage: images / GLB files are stored in Postgres (`food_assets`) and served from `/api/assets/:id`.
- RLS: tenant isolation is enforced in server code. `drizzle/rls.sql` contains Supabase-style RLS policies (not applied/tested here).
- No Vercel deploy was performed.

## Incomplete / needs credentials / known limitations
- Online payments: Stripe Checkout is coded (`STRIPE_SECRET_KEY`) but **not tested** without a key; no webhook (payment is confirmed by a server-side lookup when the customer returns).
- AI summaries with an LLM need `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` (not tested); rule-based summaries are tested.
- AR: uses `<model-viewer>` from Google's CDN. Real AR could only be launched on a phone with ARCore / Quick Look — NOT tested here. Without an uploaded GLB the procedural dish is exported to GLB on the fly (WebXR / Quick Look; Android Scene Viewer prefers an uploaded GLB).
- 3D food is procedural (pizza, burger, drink, dessert, pasta); realistic scanned models must be uploaded per dish as GLB.
- Background push (service worker / Web Push) is not implemented: alerts need the page open; in-page sound, title flash and `Notification` (when permitted) are used, with an explicit "Enable alerts" fallback prompt.
- Sound/notification behaviour, text-to-speech voices and the animation feel were not tested on real devices.
- Set `AUTH_SECRET` in production (a DATABASE_URL-derived fallback is used otherwise).
- Schema changes are applied with `drizzle-kit push` (no migration files).

# TapMenu — environment variables

Set these in Vercel → Project → Settings → Environment Variables (Production + Preview).

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | yes | Postgres connection string (Supabase: use the pooled/transaction URL) |
| `AUTH_SECRET` | yes | Long random string used to sign sessions (`openssl rand -base64 48`) |
| `INTEGRATION_WEBHOOK_SECRET` | for delivery apps | HMAC secret shared with your aggregator partner (UrbanPiper / Petpooja / Dyno). Without it `/api/integrations/*` returns 503 |
| `TAPMENU_SEED_DEMO` | optional | `false` hides the public demo launcher |
| `AI_PROVIDER` | optional | `openai` or `anthropic` — powers the guest assistant |
| `OPENAI_API_KEY` / `OPENAI_MODEL` | if `openai` | |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | if `anthropic` | |
| `STRIPE_SECRET_KEY` | optional | Enables card checkout |
| `INSECURE_COOKIES` | never in production | Local http testing only |

## Delivery-app webhook

`POST https://<your-domain>/api/integrations/<swiggy|zomato|ondc|magicpin|website>`

Header: `x-tapmenu-signature: <hex HMAC-SHA256 of the raw body using INTEGRATION_WEBHOOK_SECRET>`

```json
{ "restaurant": "your-slug", "externalId": "SW-48211", "customerName": "Aarav", "paid": true,
  "items": [{ "name": "Margherita", "qty": 2 }] }
```
Items match by exact dish name (or `itemId`). Repeats with the same `externalId` are de-duplicated.

## Owner colours
Dashboard → Settings → Branding. Presets or any custom colour; applies to the dashboard, kitchen, floor panel and guest menu.

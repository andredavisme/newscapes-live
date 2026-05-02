# Newscapes Live

Web application for the **Newscapes Live** show at [Newscapes Brewing](https://maps.google.com/?q=163+Washington+Ave+Portland+ME), Portland ME. Live every **Saturday at noon ET**.

## Stack
- **Frontend:** GitHub Pages (HTML/CSS/JS, ES modules)
- **Backend:** [Supabase](https://supabase.com) — auth, database, RLS, Edge Functions
- **Payments:** [PayPal](https://www.paypal.com/ncp/payment/SQ9X3PE9QF5WC) via webhook Edge Function

## Pages
| Path | Description |
|------|-------------|
| `/` | Show portal — stream player, countdown, next show info |
| `/community/` | Message board, polls, leaderboard |
| `/support/` | Donate via PayPal, recognition wall |
| `/admin/` | Admin dashboard (role-gated: admin / moderator) |

## JS Modules
| File | Purpose |
|------|---------|
| `js/supabase.js` | Supabase client config |
| `js/app.js` | Stream mode, countdown, show/branding load |
| `js/admin.js` | Admin CRUD — shows, guests, stream links, polls, branding, users, supporters |
| `js/community.js` | Auth, posts, likes, comments, polls, leaderboard, points |

## Database Tables (public schema)
`profiles` · `shows` · `guests` · `stream_links` · `polls` · `poll_votes` · `posts` · `likes` · `comments` · `branding` · `donations` · `contributors` · `recognition_wall` · `points_log`

## Stream Mode
The `shows.stream_mode` field controls the front-end player:
| Value | Behavior |
|-------|----------|
| `live` | Embeds the primary `stream_links` URL |
| `playlist` | Plays a random YouTube playlist |
| `off` | Hides the player entirely |

Admins toggle stream mode from the Shows panel in `/admin/`.

## Edge Functions
| Function | Purpose |
|----------|---------|
| `paypal-webhook` | Processes PayPal donations → writes donors, donations, recognition wall, points |

### PayPal Webhook Secrets
| Secret | Description |
|--------|-------------|
| `PAYPAL_ENV` | `sandbox` or `live` |
| `SKIP_VERIFY` | `true` for testing only |
| `PAYPAL_CLIENT_ID` | PayPal app client ID |
| `PAYPAL_SECRET` | PayPal app secret |
| `PAYPAL_WEBHOOK_ID` | Registered webhook ID |
| `DB_SERVICE_KEY` | Supabase service role key |
| `SUPABASE_URL` | Supabase project URL |

## Setup
1. Clone repo, enable GitHub Pages on `main` (root folder)
2. Set Supabase keys in `js/supabase.js`
3. Deploy Edge Functions via Supabase CLI
4. Register PayPal webhook pointing to your Edge Function URL

## Change Log
- **2026-05-02** — Deployed `paypal-webhook` v11 with dynamic `PAYPAL_ENV` support
- **2026-05-02** — Sandbox end-to-end test passed; `profiles.points_total` → 300

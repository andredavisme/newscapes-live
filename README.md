# Newscapes Live

Web application for the **Newscapes Live** show at [Newscapes Brewing](https://maps.google.com/?q=163+Washington+Ave+Portland+ME), Portland ME. Live every **Saturday at noon ET**.

> **Live site:** `https://andredavisme.github.io/newscapes-live/`

---

## Stack

| Layer | Technology |
|-------|------------|
| Hosting | GitHub Pages (static, `main` branch root) |
| Frontend | Vanilla HTML/CSS/JS — ES modules, no build step |
| Backend | [Supabase](https://supabase.com) — Postgres, Auth, RLS, Edge Functions |
| Payments | PayPal — webhook processed by Supabase Edge Function |

---

## Project Structure

```
newscapes-live/
├── index.html          # Homepage — stream player, countdown, show info
├── css/
│   └── styles.css      # Global styles, dark theme, design tokens
├── js/
│   ├── supabase.js     # Supabase client (URL + anon key)
│   ├── app.js          # Homepage logic — stream mode, countdown, branding
│   ├── admin.js        # Admin CRUD module (imported by admin/index.html)
│   └── community.js    # Community auth, posts, polls, leaderboard, points
├── admin/
│   └── index.html      # Admin dashboard (role-gated: admin / moderator)
├── community/
│   └── index.html      # Community board, polls, leaderboard
├── support/
│   └── index.html      # Donation page + recognition wall
└── sql/
    └── *.sql           # Schema migrations and seed scripts
```

---

## Pages

| Path | Description |
|------|-------------|
| `/` | Show portal — live/playlist player, next-show countdown, guests, notes, support tiers |
| `/community/` | Message board, likes, comments, polls, leaderboard, auth (sign up / sign in) |
| `/support/` | PayPal donation flow, recognition wall display |
| `/admin/` | Admin dashboard — role-gated, requires `admin` or `moderator` profile |

---

## JS Modules

| File | Purpose |
|------|---------|
| `js/supabase.js` | Initializes and exports the Supabase client |
| `js/app.js` | Reads `stream_mode` + `branding` from Supabase, drives homepage player and countdown |
| `js/admin.js` | All admin CRUD — `requireAdmin()` auth guard, shows, guests, stream links, polls, branding, users, supporters |
| `js/community.js` | Community auth flow, post/like/comment CRUD, poll voting, leaderboard, points |

---

## Database Tables

| Table | Description |
|-------|-------------|
| `profiles` | Supabase auth users + `username`, `show_role`, `points_total`, `full_name` |
| `shows` | Episodes — title, episode number, scheduled time, status, notes, `stream_mode` |
| `guests` | Per-show guest roster — name, bio, social handle, confirmed flag, appearance order |
| `stream_links` | Per-show platform URLs — YouTube, Twitch, etc.; `is_primary` flag |
| `polls` | Polls tied to shows or standalone — question, options (jsonb), status |
| `poll_votes` | Individual user votes per poll option |
| `posts` | Community board messages — content, author, timestamps |
| `likes` | Post likes (user × post) |
| `comments` | Post comments |
| `branding` | Show name, tagline, logo URL, media links (jsonb) — one active row |
| `donations` | PayPal donation records — amount, tier, `paypal_txn_id` |
| `contributors` | Donor profiles — display name, email, linked to `profiles` |
| `recognition_wall` | Public supporter wall — display name, tier, `is_visible`, `featured`, `sort_order` |
| `points_log` | Audit log for all point award events |

---

## Stream Mode

The `shows.stream_mode` field controls the homepage player. Admins toggle it from the **Shows** panel in `/admin/`.

| Value | Behavior |
|-------|----------|
| `live` | Embeds the show's primary `stream_links` URL in the iframe player |
| `playlist` | Plays a randomly ordered YouTube playlist embed |
| `off` | Hides the player entirely |

---

## Edge Functions

| Function | Trigger | Purpose |
|----------|---------|--------|
| `paypal-webhook` | PayPal IPN/webhook POST | Verifies PayPal signature, determines donation tier, writes `contributors`, `donations`, `recognition_wall`, and awards points to matched user |

### PayPal Webhook — Supabase Secrets

| Secret | Description |
|--------|-------------|
| `PAYPAL_ENV` | `sandbox` or `live` — dynamically selects PayPal API base URL |
| `SKIP_VERIFY` | `true` to bypass signature check (testing only) |
| `PAYPAL_CLIENT_ID` | PayPal app client ID |
| `PAYPAL_SECRET` | PayPal app secret |
| `PAYPAL_WEBHOOK_ID` | Registered webhook ID in PayPal developer dashboard |
| `DB_SERVICE_KEY` | Supabase service role key (bypasses RLS) |
| `SUPABASE_URL` | Supabase project URL |

---

## Auth & Roles

Auth is handled by Supabase Auth (email/password). On sign-up, a `profiles` row is created via database trigger with `show_role = 'viewer'`.

| Role | Access |
|------|--------|
| `viewer` | Read-only public content |
| `member` | Community board post/vote |
| `supporter` | Member access + recognition wall listing |
| `moderator` | Admin dashboard access |
| `admin` | Full admin dashboard access |

Admin sign-in: `/admin/` — email + password via Supabase Auth. On load, a **passive** session check auto-logs in returning admins without touching the login form.

---

## Setup

1. Clone repo; enable GitHub Pages on `main` branch (root folder)
2. Set Supabase project URL and anon key in `js/supabase.js`
3. Run SQL migrations from `sql/` against your Supabase project
4. Deploy Edge Functions via Supabase CLI: `supabase functions deploy paypal-webhook`
5. Set all Edge Function secrets in Supabase dashboard
6. Register a PayPal webhook pointing to your Edge Function URL
7. Seed a `branding` row in Supabase for homepage content

---

## Change Log

### 2026-05-02 (today)

| Time (ET) | Commit | Description |
|-----------|--------|-------------|
| 9:02 AM | [docs: full chronicle](https://github.com/andredavisme/newscapes-live/commit/main) | This README update |
| 9:01 AM | [fix: passive session check on admin load](https://github.com/andredavisme/newscapes-live/commit/87c62b2ee312eeef649d7de4d418b2ec4a93658f) | Replaced racing `init()` with passive `getSession()` — login form no longer disappears on input |
| 8:56 AM | [fix: home nav link relative path](https://github.com/andredavisme/newscapes-live/commit/9032a5bde9ce9997fba7f9276819d23c7d117194) | Changed `href="/"` → `href="./"` to prevent GitHub Pages 404 on Home nav click |
| 8:52 AM | [docs + feat: README + stream mode toggle card](https://github.com/andredavisme/newscapes-live/commit/521840080d73c7afb1b3459de98711dfc4681dca) | Added stream mode toggle card to admin Shows panel; initial README |
| ~12:00 PM | [feat: YouTube playlist fallback + stream mode helper](https://github.com/andredavisme/newscapes-live/commit/58f21318debbd430bb304e29f54c089dfa693be2) | Randomized playlist embed when `stream_mode = playlist` |
| ~11:55 AM | [fix: countdown timezone (America/New\_York)](https://github.com/andredavisme/newscapes-live/commit/3401ad700c2016f1f5b53b37f460d2cc3e9efa5e) | Countdown now correctly targets noon ET regardless of viewer timezone |
| ~1:57 AM | [feat: full admin panel](https://github.com/andredavisme/newscapes-live/commit/96b6b709e132b0531cdcad4c83de8cd2cf52126e) | Built complete admin dashboard — shows, guests, polls, branding, users, supporters/donations |
| ~1:53 AM | [feat: community board + auth](https://github.com/andredavisme/newscapes-live/commit/65583ca3b3db104ce1fc5add26df9551cc71628c) | Community board with posts, likes, comments, polls, leaderboard, and Supabase auth flow |
| ~1:47 AM | [feat: initial GitHub Pages scaffold](https://github.com/andredavisme/newscapes-live/commit/5aae17bbbbfa786d1dd6fa01a1bd37b122a67c80) | Homepage, community, support, admin pages; CSS design system; JS module structure |
| ~1:37 AM | [Initial commit](https://github.com/andredavisme/newscapes-live/commit/77e81635aae696a326352349730e7f36e1c708ad) | Repo created |

### Pre-repo (Supabase / Edge Function history)
- **2026-05-02** — `paypal-webhook` v11 deployed with dynamic `PAYPAL_ENV` support
- **2026-05-02** — Sandbox end-to-end test passed; `profiles.points_total` → 300 for matched user
- **Earlier** — Iterated through webhook versions v1–v10 fixing PayPal signature verification, tier logic, RLS bypass, and contributor matching

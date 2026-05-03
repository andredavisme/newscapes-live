# Newscapes Live

Web application for the **Newscapes Live** show at [Newscapes Brewing](https://www.newscapesbrewing.com/), Portland ME — streaming portal, community hub, and show management. Live every **Saturday at noon ET** at [163 Washington Ave, Portland ME](https://maps.google.com/?q=163+Washington+Ave+Portland+ME).

> **Live site:** `https://andredavisme.github.io/newscapes-live/`
> **Built and maintained by** [207 Analytix](https://andredavisme.github.io/207analytix/)

---

## Milestones

| # | Milestone | Status | Tested |
|---|-----------|--------|--------|
| 1 | Schema applied, auth trigger live, profiles backfilled, show seeded | ✅ Complete | 2026-05-02 9:19 AM ET |
| 2 | Homepage loads branding + stream player from DB | ✅ Complete | 2026-05-02 |
| 3 | Admin login, show CRUD, stream mode toggle | ✅ Complete | 2026-05-02 |
| 4 | Community signup, post, like, comment, leaderboard | ✅ Complete | 2026-05-02 |
| 5 | Auth overhaul — tiered sign-up, return-user prompt, password reset, account dashboard | ✅ Complete | 2026-05-03 |
| 6 | Hero card (Newscapes Brewing image + link), 207 Analytix footer | ✅ Complete | 2026-05-03 |
| 7 | PayPal donation → contributor + recognition wall + points | 🔲 Pending | — |

---

## Inspiration & Related Repos

The following repositories by the same author were referenced for patterns, component ideas, and auth architecture during development:

| Repo | What it contributed |
|------|---------------------|
| [andredavisme/social-app](https://github.com/andredavisme/social-app) | Multi-user social feed, admin panel pattern, feed/profile/settings page structure, Supabase multi-user auth approach |
| [andredavisme/alexandria-training-portal](https://github.com/andredavisme/alexandria-training-portal) | Role-gated content access patterns, tiered user access model (`auth.html`, `request-access.html`), discussion board structure, course catalog layout as reference for community feature design |

No code was directly copied; these repos served as structural and design inspiration while Newscapes Live was built ground-up against its own Supabase schema.

---

## Stack

| Layer | Technology |
|-------|------------|
| Hosting | GitHub Pages (static, `main` branch root) |
| Frontend | Vanilla HTML/CSS/JS — ES modules, no build step |
| Backend | [Supabase](https://supabase.com) — shared master Postgres project, Auth, RLS, Edge Functions |
| Payments | PayPal — webhook processed by Supabase Edge Function |
| Analytics / Dev | [207 Analytix](https://andredavisme.github.io/207analytix/) |

---

## Project Structure

```
newscapes-live/
├── index.html              # Homepage — stream player, countdown, show info, support tiers
├── css/
│   └── styles.css          # Global styles, dark theme, CSS design tokens
├── js/
│   ├── supabase.js         # Supabase client (URL + anon key)
│   ├── app.js              # Homepage — stream mode, countdown (next Saturday noon ET), branding
│   ├── admin.js            # Admin CRUD module (imported by admin/index.html)
│   ├── admin-launcher.js   # Lazy-loaded admin panel (injected into community page for mod access)
│   └── community.js        # Community auth, posts, polls, leaderboard, points
├── admin/
│   └── index.html          # Admin dashboard (role-gated: admin / moderator)
├── community/
│   └── index.html          # Community board, polls, leaderboard + full auth system
├── support/
│   └── index.html          # Donation page + recognition wall
└── sql/
    └── *.sql               # Schema migrations and seed scripts
```

---

## Pages

| Path | Description |
|------|-------------|
| `/` | Show portal — live/playlist player, next-show countdown, guests, notes, support tiers |
| `/community/` | Message board, likes, comments, polls, leaderboard; full auth (sign in / sign up / password reset / account dashboard) |
| `/support/` | PayPal donation flow, recognition wall display |
| `/admin/` | Admin dashboard — role-gated, requires `admin` or `moderator` profile |

---

## Auth System

Auth is handled by Supabase Auth (email/password). The full flow is implemented in `community/index.html`.

### Flow Overview

```
App Load
  └── Cached session?
        ├── YES → Return User Prompt ("Continue as [Name]" or "Sign Out")
        │         ├── Continue → Community landing (tier-appropriate features)
        │         └── Sign Out → Sign In screen
        └── NO  → Sign In screen

Sign In screen (email + password only)
  ├── Valid → Community landing
  └── Invalid → Inline hint: "We don't see your account — do you need to sign up?" + link

Sign Up screen (email + password + tier selection)
  ├── New email → Account created, temp password emailed, instruction to change from dashboard
  └── Existing email → Inline hint: "Account exists" + link to Sign In + option to reset password

Password Reset screen (email field)
  └── Submits → Supabase sends reset email with temp password + instructions

Account Dashboard (accessible from header avatar or nav)
  └── Shows tier, join date, change password, sign out
```

### Access Tiers

On sign-up, users select a tier. The `show_role` column on `profiles` drives feature visibility throughout the app.

| Role | Access |
|------|--------|
| `viewer` | Read-only public content |
| `member` | Community board post/vote |
| `supporter` | Member access + recognition wall listing |
| `moderator` | Admin dashboard access |
| `admin` | Full admin dashboard + all features |

**Existing accounts (as of Milestone 1):**

| Username | Role |
|----------|------|
| `owner` | `admin` |
| `admin` | `admin` |
| `andre.davis.me` | `admin` |

---

## JS Modules

| File | Purpose |
|------|---------|
| `js/supabase.js` | Initializes and exports the Supabase client |
| `js/app.js` | Reads `stream_mode` + `branding` from Supabase, drives homepage player and countdown timer |
| `js/admin.js` | All admin CRUD — `requireAdmin()` auth guard, shows, guests, stream links, polls, branding, users, supporters |
| `js/admin-launcher.js` | Self-contained admin panel injected lazily into community page for `admin`/`moderator` users |
| `js/community.js` | Community auth flow, post/like/comment CRUD, poll voting, leaderboard, points |

---

## Countdown Timer

Implemented in `js/app.js`. Counts down to the next **Saturday at noon ET**, updating every second. If it is currently Saturday before noon, it counts down to today's show. Displays `🔴 LIVE NOW` at showtime.

```js
// Core logic — exact timezone-safe calculation
function getNextSaturdayNoonET() { ... }
setInterval(updateCountdown, 1000);
```

---

## Database Philosophy

Newscapes Live integrates with a **shared master Supabase project** supporting multiple applications in the same ecosystem.

> **Retain, update, and reference existing tables where data naturally fits. Create new tables only where data is specific enough to warrant its own structure and future organic growth.**

- **Reuse first** — check the master DB before creating a new table
- **Extend, don't replace** — add columns to existing tables rather than duplicating
- **Create for specificity** — Newscapes-specific tables (`shows`, `guests`, `polls`, etc.) have no home elsewhere
- **Shared identity** — `profiles` is a master-level table; Newscapes adds `show_role` and `points_total`
- **No orphaned data** — all Newscapes tables reference `profiles.id` and `auth.users`

---

## Database Tables

### Shared / Extended

| Table | Origin | Newscapes Usage |
|-------|--------|-----------------|
| `profiles` | Master — Supabase auth users | `show_role`, `points_total`, `username`, `full_name`, `avatar_url`; auto-created via trigger |
| `branding` | Master — multi-app branding config | Extended with `show_name`, `media_links`; active row seeded |
| `leads` | Master — 207 Analytix intake | Referenced for supporter inquiries |

### Newscapes-Specific

| Table | Description |
|-------|-------------|
| `shows` | Episodes — title, episode number, scheduled time, status, notes, `stream_mode` |
| `guests` | Per-show guest roster — name, bio, social handle, confirmed, appearance order |
| `stream_links` | Per-show platform URLs — YouTube, Twitch, etc.; `is_primary` flag |
| `polls` | Polls tied to shows or standalone — question, options (jsonb), status |
| `poll_votes` | Individual user votes per poll option |
| `posts` | Community board messages |
| `likes` | Post likes (user × post) |
| `comments` | Post comments |
| `contributors` | Donor profiles linked to `profiles` |
| `donations` | PayPal donation records — amount, tier, `paypal_txn_id` |
| `recognition_wall` | Public supporter wall — display name, tier, visibility, sort order |
| `points_log` | Audit log for all point award events |

### RPCs

| Function | Purpose |
|----------|---------|
| `increment_points(uid, amount)` | Atomically adds points to `profiles.points_total` |

---

## Stream Mode

The `shows.stream_mode` field controls the homepage player, toggled from `/admin/`.

| Value | Behavior |
|-------|----------|
| `live` | Embeds the show's primary `stream_links` URL |
| `playlist` | Plays a randomly ordered YouTube playlist |
| `off` | Hides the player entirely |

---

## Edge Functions

| Function | Trigger | Purpose |
|----------|---------|---------|
| `paypal-webhook` | PayPal IPN/webhook POST | Verifies signature, determines tier, writes contributors/donations/recognition_wall, awards points |

### PayPal Webhook Secrets

| Secret | Description |
|--------|-------------|
| `PAYPAL_ENV` | `sandbox` or `live` |
| `SKIP_VERIFY` | `true` to bypass signature check (testing only) |
| `PAYPAL_CLIENT_ID` | PayPal app client ID |
| `PAYPAL_SECRET` | PayPal app secret |
| `PAYPAL_WEBHOOK_ID` | Registered webhook ID |
| `DB_SERVICE_KEY` | Supabase service role key (bypasses RLS) |
| `SUPABASE_URL` | Supabase project URL |

---

## Setup

1. Clone repo; enable GitHub Pages on `main` branch (root folder)
2. Set Supabase project URL and anon key in `js/supabase.js`
3. Review existing master DB tables before running migrations — extend rather than replace
4. Run SQL migrations from `sql/` against the shared Supabase project
5. Deploy Edge Functions: `supabase functions deploy paypal-webhook`
6. Set all Edge Function secrets in Supabase dashboard
7. Register a PayPal webhook pointing to your Edge Function URL
8. Ensure the `branding` table has an active row with `show_name` populated

---

## Change Log

### 2026-05-03

| Time (ET) | Change | Description |
|-----------|--------|-------------|
| ~8:00 AM | Auth overhaul | Full auth system rebuilt in `community/index.html`: return-user prompt, separate sign-in / sign-up / password reset screens, account dashboard, tiered access, inline error hints (account not found → sign up; email exists → sign in) |
| ~8:00 AM | Hero card | Newscapes Brewing image banner added to community page, linking to [newscapesbrewing.com](https://www.newscapesbrewing.com/) |
| ~8:00 AM | Footer | "Powered by 207 Analytix" with link to [207analytix](https://andredavisme.github.io/207analytix/) added to community page footer |
| ~8:00 AM | Docs | README updated — inspiration repos referenced, auth flow documented, full current structure, milestone 5 & 6 marked complete |

### 2026-05-02

| Time (ET) | Commit | Description |
|-----------|--------|-------------|
| 9:21 AM | [docs: milestone 1 complete](https://github.com/andredavisme/newscapes-live/commit/main) | Milestone tracker added; auth, schema, seed verified |
| 9:19 AM | DB | Episode 1 show seeded (`status=live`, `stream_mode=playlist`) |
| 9:16 AM | DB | Auth trigger verified; 3 existing users backfilled to `profiles`; all set to `admin` |
| 9:13 AM | [docs: master DB philosophy](https://github.com/andredavisme/newscapes-live/commit/7d0d669d1fc0603747a58a39a4e1336a57003bfa) | Database Philosophy section added |
| 9:13 AM | DB | `newscapes_schema` migration: 12 tables + RLS + `increment_points` RPC |
| 9:13 AM | DB | `newscapes_profiles` migration: `profiles` table + auth trigger |
| 9:02 AM | [docs: full chronicle](https://github.com/andredavisme/newscapes-live/commit/5210aee8dcaaa88777a3cd5e761f0139cdf380a0) | Full project chronicle README |
| 9:01 AM | [fix: passive session on admin load](https://github.com/andredavisme/newscapes-live/commit/87c62b2ee312eeef649d7de4d418b2ec4a93658f) | Replaced racing `init()` with passive `getSession()` |
| 8:56 AM | [fix: home nav relative path](https://github.com/andredavisme/newscapes-live/commit/9032a5bde9ce9997fba7f9276819d23c7d117194) | `href="/"` → `href="./"` |
| 8:52 AM | [feat: stream mode toggle card](https://github.com/andredavisme/newscapes-live/commit/521840080d73c7afb1b3459de98711dfc4681dca) | Stream mode toggle; initial README |
| ~12:00 PM | [feat: YouTube playlist fallback](https://github.com/andredavisme/newscapes-live/commit/58f21318debbd430bb304e29f54c089dfa693be2) | Randomized playlist embed |
| ~11:55 AM | [fix: countdown timezone](https://github.com/andredavisme/newscapes-live/commit/3401ad700c2016f1f5b53b37f460d2cc3e9efa5e) | Noon ET countdown timezone fix |
| ~1:57 AM | [feat: full admin panel](https://github.com/andredavisme/newscapes-live/commit/96b6b709e132b0531cdcad4c83de8cd2cf52126e) | Complete admin dashboard |
| ~1:53 AM | [feat: community board + auth](https://github.com/andredavisme/newscapes-live/commit/65583ca3b3db104ce1fc5add26df9551cc71628c) | Community board, polls, leaderboard, auth |
| ~1:47 AM | [feat: initial scaffold](https://github.com/andredavisme/newscapes-live/commit/5aae17bbbbfa786d1dd6fa01a1bd37b122a67c80) | Homepage, community, support, admin pages |
| ~1:37 AM | [Initial commit](https://github.com/andredavisme/newscapes-live/commit/77e81635aae696a326352349730e7f36e1c708ad) | Repo created |

### Pre-repo (Supabase / Edge Function history)
- **2026-05-02** — `paypal-webhook` v11 deployed with dynamic `PAYPAL_ENV` support
- **2026-05-02** — Sandbox end-to-end test passed; `profiles.points_total` → 300 for matched user
- **Earlier** — Iterated through webhook versions v1–v10 fixing PayPal signature verification, tier logic, RLS bypass, and contributor matching

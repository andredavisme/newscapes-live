# Newscapes Live

Web application for the **Newscapes Live** show at [Newscapes Brewing](https://maps.google.com/?q=163+Washington+Ave+Portland+ME), Portland ME.

Live every **Saturday at noon**.

## Stack
- **Frontend:** GitHub Pages (HTML/CSS/JS)
- **Backend:** [Supabase](https://supabase.com) — auth, database, RLS
- **Payments:** [PayPal](https://www.paypal.com/ncp/payment/SQ9X3PE9QF5WC)

## Pages
| Path | Description |
|------|-------------|
| `/` | Show portal — stream, schedule, countdown |
| `/community/` | Message board, polls, leaderboard |
| `/support/` | Donate via PayPal, recognition wall |
| `/admin/` | Admin dashboard (role-gated) |

## Setup
1. Clone this repo
2. Enable GitHub Pages on the `main` branch, root folder
3. Configure Supabase keys in `js/supabase.js`

import { supabase } from './supabase.js';

// ── Countdown to next Saturday noon ET ───────────────────────
function getNextSaturdayNoonET() {
  // Build "this Saturday at 12:00:00 ET" as a UTC timestamp
  // by using Intl to find the current date in New York
  const nowET = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = nowET.getDay(); // 0=Sun, 6=Sat
  const daysUntilSat = (6 - day + 7) % 7;

  // If it's already Saturday but past noon ET, roll to next Saturday
  const isPastNoonToday = day === 6 && (nowET.getHours() > 12 || (nowET.getHours() === 12 && nowET.getMinutes() > 0));
  const daysToAdd = (daysUntilSat === 0 && !isPastNoonToday) ? 0 : (daysUntilSat === 0 ? 7 : daysUntilSat);

  // Construct target as an ET noon string, then parse back to UTC Date
  const target = new Date(nowET);
  target.setDate(nowET.getDate() + daysToAdd);
  target.setHours(12, 0, 0, 0);

  // Re-express in UTC by using the ET offset
  const etString = target.toLocaleString('en-US', { timeZone: 'America/New_York' });
  const etDate = new Date(etString);
  const offsetMs = target - etDate;
  return new Date(target.getTime() + offsetMs);
}

function updateCountdown() {
  const target = getNextSaturdayNoonET();
  const now = new Date();
  const diff = target - now;
  if (diff <= 0) {
    document.getElementById('countdown').textContent = '\uD83D\uDD34 LIVE NOW';
    return;
  }
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  document.getElementById('countdown').textContent =
    `${d}d ${h}h ${m}m ${s}s`;
}

setInterval(updateCountdown, 1000);
updateCountdown();

// ── Load next show from Supabase ──────────────────────────────
async function loadNextShow() {
  const { data, error } = await supabase
    .from('shows')
    .select('*, stream_links(*), guests(*)')
    .in('status', ['scheduled', 'live'])
    .order('scheduled_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) return;

  const el = document.getElementById('show-title');
  if (el) el.textContent = data.title || 'Newscapes Live';

  const epEl = document.getElementById('episode-number');
  if (epEl && data.episode_number) epEl.textContent = `Episode ${data.episode_number}`;

  const notesEl = document.getElementById('show-notes');
  if (notesEl && data.notes) notesEl.textContent = data.notes;

  // Stream link
  const primary = data.stream_links?.find(l => l.is_primary) || data.stream_links?.[0];
  const streamBtn = document.getElementById('stream-btn');
  if (streamBtn && primary) {
    streamBtn.href = primary.url;
    streamBtn.textContent = `\u25B6 Watch on ${primary.platform}`;
  }

  // Guests
  const guestList = document.getElementById('guest-list');
  if (guestList && data.guests?.length) {
    guestList.innerHTML = data.guests
      .filter(g => g.confirmed)
      .sort((a, b) => a.appearance_order - b.appearance_order)
      .map(g => `<li><strong>${g.name}</strong>${g.bio ? ' \u2014 ' + g.bio : ''}</li>`)
      .join('');
  }
}

loadNextShow();

// ── Load branding ─────────────────────────────────────────────
async function loadBranding() {
  const { data } = await supabase
    .from('branding')
    .select('*')
    .eq('active', true)
    .maybeSingle();

  if (!data) return;
  const nameEls = document.querySelectorAll('.brand-name');
  nameEls.forEach(el => el.textContent = data.show_name);
  const tagEls = document.querySelectorAll('.brand-tagline');
  tagEls.forEach(el => el.textContent = data.tagline || '');
  if (data.logo_url) {
    const logos = document.querySelectorAll('.brand-logo');
    logos.forEach(el => { el.src = data.logo_url; el.style.display = 'block'; });
  }
}

loadBranding();

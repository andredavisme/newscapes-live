import { supabase } from './supabase.js';

// ── Playlist config ───────────────────────────────────────────
const PLAYLIST_IDS = [
  'PLNcy2saXCtKzb6Bk_keP06tN9dX1fXomc',
  'PLNcy2saXCtKxxsRjzp1IMfD2XKEIue01a',
];

function getRandomPlaylistEmbed() {
  const id = PLAYLIST_IDS[Math.floor(Math.random() * PLAYLIST_IDS.length)];
  return `https://www.youtube.com/embed/videoseries?list=${id}&autoplay=1&shuffle=1`;
}

// ── Countdown to next Saturday noon ET ───────────────────────
function getNextSaturdayNoonET() {
  const nowET = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const day = nowET.getDay();
  const isPastNoonToday = day === 6 && (nowET.getHours() > 12 || (nowET.getHours() === 12 && nowET.getMinutes() > 0));
  const daysUntilSat = (6 - day + 7) % 7;
  const daysToAdd = (daysUntilSat === 0 && !isPastNoonToday) ? 0 : (daysUntilSat === 0 ? 7 : daysUntilSat);
  const target = new Date(nowET);
  target.setDate(nowET.getDate() + daysToAdd);
  target.setHours(12, 0, 0, 0);
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
    document.getElementById('countdown').textContent = '🔴 LIVE NOW';
    return;
  }
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  document.getElementById('countdown').textContent = `${d}d ${h}h ${m}m ${s}s`;
}

setInterval(updateCountdown, 1000);
updateCountdown();

// ── Stream mode (live | playlist | off) ──────────────────────
async function loadStreamMode() {
  const { data } = await supabase
    .from('shows')
    .select('stream_mode, stream_links(*)')
    .in('status', ['scheduled', 'live'])
    .order('scheduled_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  const mode = data?.stream_mode || 'playlist';
  const player = document.getElementById('video-player');
  const label = document.getElementById('video-label');

  if (mode === 'live') {
    const primary = data?.stream_links?.find(l => l.is_primary) || data?.stream_links?.[0];
    if (primary) {
      // Convert watch URL to embed URL if needed
      const embedUrl = primary.url
        .replace('watch?v=', 'embed/')
        .replace('youtu.be/', 'www.youtube.com/embed/');
      player.src = embedUrl;
      player.style.display = 'block';
      if (label) label.textContent = '🔴 Live Now';
    }
  } else if (mode === 'playlist') {
    player.src = getRandomPlaylistEmbed();
    player.style.display = 'block';
    if (label) label.textContent = '🎬 Recent Shows';
  } else {
    // mode === 'off' — hide the player entirely
    player.style.display = 'none';
  }
}

loadStreamMode();

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

  const primary = data.stream_links?.find(l => l.is_primary) || data.stream_links?.[0];
  const streamBtn = document.getElementById('stream-btn');
  if (streamBtn && primary) {
    streamBtn.href = primary.url;
    streamBtn.textContent = `▶ Watch on ${primary.platform}`;
  }

  const guestList = document.getElementById('guest-list');
  if (guestList && data.guests?.length) {
    guestList.innerHTML = data.guests
      .filter(g => g.confirmed)
      .sort((a, b) => a.appearance_order - b.appearance_order)
      .map(g => `<li><strong>${g.name}</strong>${g.bio ? ' — ' + g.bio : ''}</li>`)
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
  document.querySelectorAll('.brand-name').forEach(el => el.textContent = data.show_name);
  document.querySelectorAll('.brand-tagline').forEach(el => el.textContent = data.tagline || '');
  if (data.logo_url) {
    document.querySelectorAll('.brand-logo').forEach(el => { el.src = data.logo_url; el.style.display = 'block'; });
  }
}

loadBranding();

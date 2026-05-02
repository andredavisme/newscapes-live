import { supabase } from './supabase.js';
import {
  requireAdmin, getShows, upsertShow, deleteShow,
  setStreamMode, getStreamMode,
  upsertGuest, deleteGuest, upsertStreamLink, deleteStreamLink,
  getPolls, upsertPoll, setPollStatus, deletePoll,
  getBranding, saveBranding,
  getUsers, setUserRole, awardPoints,
  getDonations, getRecognitionWall, updateRecognitionEntry
} from './admin.js';

let adminCtx = null;
let showsCache = [];
let drawerOpen = false;

// ── Inject styles ──────────────────────────────────────────────
const style = document.createElement('style');
style.textContent = `
#admin-fab {
  position: fixed; bottom: 1.5rem; right: 1.5rem;
  width: 48px; height: 48px; border-radius: 50%;
  background: var(--accent); color: #000;
  border: none; cursor: pointer; font-size: 1.3rem;
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 4px 16px rgba(0,0,0,.5);
  z-index: 999; transition: transform .2s;
}
#admin-fab:hover { transform: scale(1.08); }
#admin-drawer {
  position: fixed; inset: 0;
  z-index: 1000; display: none;
}
#admin-drawer.open { display: flex; }
#admin-drawer-backdrop {
  position: absolute; inset: 0;
  background: rgba(0,0,0,.6); backdrop-filter: blur(2px);
}
#admin-drawer-panel {
  position: absolute; top: 0; right: 0; bottom: 0;
  width: min(820px, 100vw);
  background: var(--bg, #0d0d0d);
  display: flex; flex-direction: column;
  box-shadow: -4px 0 32px rgba(0,0,0,.6);
  overflow: hidden;
}
#admin-drawer-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: .75rem 1.25rem;
  border-bottom: 1px solid var(--surface2, #222);
  flex-shrink: 0;
}
#admin-drawer-header h2 {
  color: var(--accent); font-size: 1rem; margin: 0;
}
#admin-drawer-close {
  background: none; border: none; color: var(--muted, #888);
  font-size: 1.4rem; cursor: pointer; line-height: 1;
}
#admin-drawer-body {
  display: flex; flex: 1; overflow: hidden;
}
.adm-sidebar {
  width: 160px; flex-shrink: 0;
  background: var(--surface, #111);
  border-right: 1px solid var(--surface2, #222);
  padding: 1rem 0; overflow-y: auto;
}
.adm-sidebar a {
  display: block; padding: .5rem 1rem;
  color: var(--muted, #888); font-size: .88rem;
  cursor: pointer; border-left: 3px solid transparent;
  transition: all .15s; text-decoration: none;
}
.adm-sidebar a:hover, .adm-sidebar a.active {
  color: var(--accent); background: rgba(232,184,75,.07);
  border-left-color: var(--accent);
}
.adm-sidebar .sec-label {
  font-size: .68rem; color: var(--muted); text-transform: uppercase;
  letter-spacing: .1em; padding: .75rem 1rem .2rem;
}
.adm-main {
  flex: 1; overflow-y: auto; padding: 1.25rem;
}
.adm-panel { display: none; }
.adm-panel.active { display: block; }
.adm-panel-title {
  font-size: 1.1rem; font-weight: 700;
  color: var(--accent); margin-bottom: 1rem;
}
.adm-toast {
  position: fixed; bottom: 5rem; right: 1.5rem;
  background: var(--surface, #111); border: 1px solid var(--accent);
  color: var(--accent); padding: .55rem 1rem;
  border-radius: 8px; font-size: .88rem;
  opacity: 0; transition: opacity .3s; pointer-events: none; z-index: 1100;
}
.adm-toast.show { opacity: 1; }
.adm-form-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: .6rem; margin-bottom: .75rem;
}
.adm-form-grid.single { grid-template-columns: 1fr; }
.adm-field { display: flex; flex-direction: column; gap: .25rem; }
.adm-field label { font-size: .75rem; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; }
.adm-field input, .adm-field select, .adm-field textarea {
  padding: .45rem .65rem; border-radius: 6px;
  border: 1px solid var(--surface2, #222);
  background: var(--surface2, #1a1a1a); color: var(--text, #eee);
  font-size: .88rem; font-family: inherit;
}
.adm-field textarea { resize: vertical; min-height: 60px; }
.adm-field input:focus, .adm-field select:focus, .adm-field textarea:focus {
  outline: 1px solid var(--accent);
}
.adm-actions { display: flex; gap: .5rem; margin-top: .5rem; }
.adm-table { width: 100%; border-collapse: collapse; font-size: .83rem; }
.adm-table th {
  text-align: left; padding: .4rem .6rem;
  border-bottom: 2px solid var(--surface2, #222);
  color: var(--muted); font-size: .73rem; text-transform: uppercase;
}
.adm-table td {
  padding: .45rem .6rem; border-bottom: 1px solid var(--surface2, #222);
  vertical-align: middle;
}
.adm-table tr:last-child td { border-bottom: none; }
.adm-badge {
  display: inline-block; padding: .12rem .45rem;
  border-radius: 99px; font-size: .72rem; font-weight: 600;
}
.adm-card {
  background: var(--surface, #111); border-radius: 8px;
  padding: .9rem 1rem; margin-bottom: 1rem;
  border: 1px solid var(--surface2, #222);
}
.adm-stream-row {
  display: flex; align-items: center;
  justify-content: space-between; gap: .75rem; flex-wrap: wrap;
  margin-bottom: .5rem;
}
@media (max-width: 600px) {
  #admin-drawer-panel { width: 100vw; }
  .adm-sidebar { width: 120px; }
  .adm-form-grid { grid-template-columns: 1fr; }
}
`;
document.head.appendChild(style);

// ── Inject HTML ────────────────────────────────────────────────
const frag = document.createRange().createContextualFragment(`
<div id="adm-toast" class="adm-toast"></div>
<button id="admin-fab" title="Admin Panel" style="display:none">⚙️</button>
<div id="admin-drawer">
  <div id="admin-drawer-backdrop"></div>
  <div id="admin-drawer-panel">
    <div id="admin-drawer-header">
      <h2>⚙️ Admin — <span id="adm-user"></span></h2>
      <button id="admin-drawer-close">✕</button>
    </div>
    <div id="admin-drawer-body">
      <nav class="adm-sidebar">
        <div class="sec-label">Show</div>
        <a data-adm="shows" class="active">📅 Shows</a>
        <a data-adm="guests">🎤 Guests</a>
        <a data-adm="stream">📡 Stream</a>
        <div class="sec-label">Content</div>
        <a data-adm="polls">📊 Polls</a>
        <a data-adm="branding">🎨 Branding</a>
        <div class="sec-label">Community</div>
        <a data-adm="users">👥 Users</a>
        <a data-adm="supporters">💛 Supporters</a>
      </nav>
      <main class="adm-main">

        <!-- SHOWS -->
        <div class="adm-panel active" id="adm-panel-shows">
          <div class="adm-panel-title">📅 Shows</div>
          <div class="adm-card">
            <div class="adm-stream-row">
              <div style="font-size:.85rem;font-weight:700;color:var(--accent)">Stream Mode</div>
              <div style="display:flex;gap:.4rem;flex-wrap:wrap">
                <button class="btn btn-outline" id="adm-mode-live" style="padding:.3rem .7rem;font-size:.8rem">🔴 Live</button>
                <button class="btn btn-outline" id="adm-mode-playlist" style="padding:.3rem .7rem;font-size:.8rem">🎬 Playlist</button>
                <button class="btn btn-outline" id="adm-mode-off" style="padding:.3rem .7rem;font-size:.8rem">⏹ Off</button>
              </div>
            </div>
            <div id="adm-mode-status" style="font-size:.8rem;color:var(--muted)">Loading...</div>
          </div>
          <div class="adm-card">
            <div style="font-size:.85rem;font-weight:700;color:var(--accent);margin-bottom:.6rem" id="adm-show-form-title">New Show</div>
            <input type="hidden" id="adm-show-id">
            <div class="adm-form-grid">
              <div class="adm-field"><label>Title</label><input id="adm-show-title" placeholder="Episode title"></div>
              <div class="adm-field"><label>Episode #</label><input id="adm-show-ep" type="number"></div>
              <div class="adm-field"><label>Scheduled At</label><input id="adm-show-date" type="datetime-local"></div>
              <div class="adm-field"><label>Status</label>
                <select id="adm-show-status">
                  <option value="scheduled">Scheduled</option>
                  <option value="live">Live</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div class="adm-field" style="grid-column:1/-1"><label>Notes</label><textarea id="adm-show-notes"></textarea></div>
            </div>
            <div class="adm-actions">
              <button class="btn btn-primary" id="adm-show-save">Save</button>
              <button class="btn btn-outline" id="adm-show-clear" style="padding:.4rem .8rem">Clear</button>
            </div>
          </div>
          <table class="adm-table"><thead><tr><th>Ep</th><th>Title</th><th>Date</th><th>Status</th><th></th></tr></thead>
          <tbody id="adm-shows-tbody"><tr><td colspan="5" style="color:var(--muted)">Loading...</td></tr></tbody></table>
        </div>

        <!-- GUESTS -->
        <div class="adm-panel" id="adm-panel-guests">
          <div class="adm-panel-title">🎤 Guests</div>
          <div class="adm-card">
            <input type="hidden" id="adm-guest-id">
            <div class="adm-form-grid">
              <div class="adm-field"><label>Show</label><select id="adm-guest-show"><option value="">Select show...</option></select></div>
              <div class="adm-field"><label>Name</label><input id="adm-guest-name" placeholder="Guest name"></div>
              <div class="adm-field"><label>Social Handle</label><input id="adm-guest-social" placeholder="@handle"></div>
              <div class="adm-field"><label>Status</label><select id="adm-guest-confirmed"><option value="false">Pending</option><option value="true">Confirmed</option></select></div>
              <div class="adm-field" style="grid-column:1/-1"><label>Bio</label><textarea id="adm-guest-bio"></textarea></div>
            </div>
            <div class="adm-actions">
              <button class="btn btn-primary" id="adm-guest-save">Save</button>
              <button class="btn btn-outline" id="adm-guest-clear" style="padding:.4rem .8rem">Clear</button>
            </div>
          </div>
          <table class="adm-table"><thead><tr><th>Name</th><th>Show</th><th>Status</th><th></th></tr></thead>
          <tbody id="adm-guests-tbody"><tr><td colspan="4" style="color:var(--muted)">Loading...</td></tr></tbody></table>
        </div>

        <!-- STREAM LINKS -->
        <div class="adm-panel" id="adm-panel-stream">
          <div class="adm-panel-title">📡 Stream Links</div>
          <div class="adm-card">
            <input type="hidden" id="adm-link-id">
            <div class="adm-form-grid">
              <div class="adm-field"><label>Show</label><select id="adm-link-show"><option value="">Select show...</option></select></div>
              <div class="adm-field"><label>Platform</label><input id="adm-link-platform" placeholder="YouTube"></div>
              <div class="adm-field" style="grid-column:1/-1"><label>URL</label><input id="adm-link-url" placeholder="https://..."></div>
              <div class="adm-field"><label>Primary</label><select id="adm-link-primary"><option value="false">No</option><option value="true">Yes</option></select></div>
            </div>
            <div class="adm-actions">
              <button class="btn btn-primary" id="adm-link-save">Save</button>
              <button class="btn btn-outline" id="adm-link-clear" style="padding:.4rem .8rem">Clear</button>
            </div>
          </div>
          <table class="adm-table"><thead><tr><th>Show</th><th>Platform</th><th>URL</th><th>Primary</th><th></th></tr></thead>
          <tbody id="adm-links-tbody"><tr><td colspan="5" style="color:var(--muted)">Loading...</td></tr></tbody></table>
        </div>

        <!-- POLLS -->
        <div class="adm-panel" id="adm-panel-polls">
          <div class="adm-panel-title">📊 Polls</div>
          <div class="adm-card">
            <input type="hidden" id="adm-poll-id">
            <div class="adm-form-grid">
              <div class="adm-field" style="grid-column:1/-1"><label>Question</label><input id="adm-poll-question"></div>
              <div class="adm-field" style="grid-column:1/-1"><label>Options (one per line)</label><textarea id="adm-poll-options" placeholder="Option A&#10;Option B"></textarea></div>
              <div class="adm-field"><label>Show (optional)</label><select id="adm-poll-show"><option value="">None</option></select></div>
              <div class="adm-field"><label>Status</label><select id="adm-poll-status"><option value="draft">Draft</option><option value="open">Open</option><option value="closed">Closed</option></select></div>
            </div>
            <div class="adm-actions">
              <button class="btn btn-primary" id="adm-poll-save">Save</button>
              <button class="btn btn-outline" id="adm-poll-clear" style="padding:.4rem .8rem">Clear</button>
            </div>
          </div>
          <table class="adm-table"><thead><tr><th>Question</th><th>Status</th><th>Votes</th><th>Actions</th></tr></thead>
          <tbody id="adm-polls-tbody"><tr><td colspan="4" style="color:var(--muted)">Loading...</td></tr></tbody></table>
        </div>

        <!-- BRANDING -->
        <div class="adm-panel" id="adm-panel-branding">
          <div class="adm-panel-title">🎨 Branding</div>
          <div class="adm-card">
            <input type="hidden" id="adm-brand-id">
            <div class="adm-form-grid">
              <div class="adm-field"><label>Show Name</label><input id="adm-brand-name"></div>
              <div class="adm-field"><label>Tagline</label><input id="adm-brand-tagline"></div>
              <div class="adm-field" style="grid-column:1/-1"><label>Logo URL</label><input id="adm-brand-logo"></div>
              <div class="adm-field"><label>YouTube</label><input id="adm-brand-yt"></div>
              <div class="adm-field"><label>Twitch</label><input id="adm-brand-twitch"></div>
              <div class="adm-field"><label>Instagram</label><input id="adm-brand-ig"></div>
              <div class="adm-field"><label>Facebook</label><input id="adm-brand-fb"></div>
              <div class="adm-field"><label>Website</label><input id="adm-brand-web"></div>
              <div class="adm-field"><label>Podcast</label><input id="adm-brand-pod"></div>
            </div>
            <div class="adm-actions"><button class="btn btn-primary" id="adm-brand-save">Save Branding</button></div>
          </div>
        </div>

        <!-- USERS -->
        <div class="adm-panel" id="adm-panel-users">
          <div class="adm-panel-title">👥 Users</div>
          <table class="adm-table"><thead><tr><th>Username</th><th>Role</th><th>Points</th><th>Actions</th></tr></thead>
          <tbody id="adm-users-tbody"><tr><td colspan="4" style="color:var(--muted)">Loading...</td></tr></tbody></table>
        </div>

        <!-- SUPPORTERS -->
        <div class="adm-panel" id="adm-panel-supporters">
          <div class="adm-panel-title">💛 Supporters</div>
          <table class="adm-table" style="margin-bottom:1.5rem"><thead><tr><th>Name</th><th>Amount</th><th>Tier</th><th>Date</th></tr></thead>
          <tbody id="adm-donations-tbody"><tr><td colspan="4" style="color:var(--muted)">Loading...</td></tr></tbody></table>
          <div style="font-size:.85rem;font-weight:700;color:var(--accent);margin-bottom:.5rem">Recognition Wall</div>
          <table class="adm-table"><thead><tr><th>Name</th><th>Tier</th><th>Visible</th><th>Featured</th></tr></thead>
          <tbody id="adm-wall-tbody"><tr><td colspan="4" style="color:var(--muted)">Loading...</td></tr></tbody></table>
        </div>

      </main>
    </div>
  </div>
</div>
`);
document.body.appendChild(frag);

// ── Helpers ────────────────────────────────────────────────────
function toast(msg) {
  const el = document.getElementById('adm-toast');
  el.textContent = msg; el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2800);
}
function fmtDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' });
}
function populateShowSelects(shows) {
  ['adm-guest-show','adm-link-show','adm-poll-show'].forEach(selId => {
    const sel = document.getElementById(selId);
    const first = sel.options[0];
    sel.innerHTML = '';
    sel.appendChild(first);
    shows.forEach(s => {
      const o = document.createElement('option');
      o.value = s.id;
      o.textContent = `Ep ${s.episode_number||'?'} — ${s.title}`;
      sel.appendChild(o);
    });
  });
}

// ── Show/hide fab based on admin status ─────────────────────────
async function updateFab() {
  const fab = document.getElementById('admin-fab');
  const ctx = await requireAdmin();
  if (ctx) {
    adminCtx = ctx;
    fab.style.display = 'flex';
    document.getElementById('adm-user').textContent = ctx.profile.username || ctx.user.email;
  } else {
    fab.style.display = 'none';
  }
}

// ── Drawer open/close ──────────────────────────────────────────
function openDrawer() {
  document.getElementById('admin-drawer').classList.add('open');
  document.body.style.overflow = 'hidden';
  drawerOpen = true;
  admLoadShows();
  admRefreshMode();
}
function closeDrawer() {
  document.getElementById('admin-drawer').classList.remove('open');
  document.body.style.overflow = '';
  drawerOpen = false;
}
document.getElementById('admin-fab').addEventListener('click', openDrawer);
document.getElementById('admin-drawer-close').addEventListener('click', closeDrawer);
document.getElementById('admin-drawer-backdrop').addEventListener('click', closeDrawer);

// ── Sidebar nav ────────────────────────────────────────────────
document.querySelectorAll('.adm-sidebar a[data-adm]').forEach(a => {
  a.addEventListener('click', () => {
    document.querySelectorAll('.adm-sidebar a').forEach(x => x.classList.remove('active'));
    document.querySelectorAll('.adm-panel').forEach(p => p.classList.remove('active'));
    a.classList.add('active');
    document.getElementById('adm-panel-' + a.dataset.adm).classList.add('active');
    const loaders = {
      shows: () => { admLoadShows(); admRefreshMode(); },
      guests: admLoadGuests, stream: admLoadLinks,
      polls: admLoadPolls, branding: admLoadBranding,
      users: admLoadUsers, supporters: admLoadSupporters
    };
    if (loaders[a.dataset.adm]) loaders[a.dataset.adm]();
  });
});

// ── Stream Mode ────────────────────────────────────────────────
async function admRefreshMode() {
  const el = document.getElementById('adm-mode-status');
  try { const m = await getStreamMode(); el.textContent = `Current mode: ${m}`; }
  catch { el.textContent = 'Current mode: unavailable'; }
}
async function admSetMode(mode) {
  try { await setStreamMode(mode); toast(`Stream mode: ${mode} ✔`); admRefreshMode(); }
  catch(e) { toast(e.message || 'Error'); }
}
document.getElementById('adm-mode-live').addEventListener('click', () => admSetMode('live'));
document.getElementById('adm-mode-playlist').addEventListener('click', () => admSetMode('playlist'));
document.getElementById('adm-mode-off').addEventListener('click', () => admSetMode('off'));

// ── Shows ──────────────────────────────────────────────────────
async function admLoadShows() {
  showsCache = await getShows();
  populateShowSelects(showsCache);
  const tb = document.getElementById('adm-shows-tbody');
  if (!showsCache.length) { tb.innerHTML = '<tr><td colspan="5" style="color:var(--muted)">No shows yet.</td></tr>'; return; }
  tb.innerHTML = showsCache.map(s => `
    <tr>
      <td>${s.episode_number||'—'}</td>
      <td><strong>${s.title}</strong></td>
      <td>${fmtDate(s.scheduled_at)}</td>
      <td><span class="adm-badge" style="background:rgba(100,180,255,.15);color:#6ab4ff">${s.status}</span></td>
      <td>
        <button class="btn btn-outline" style="padding:.2rem .5rem;font-size:.75rem" onclick="admEditShow('${s.id}')">Edit</button>
        <button style="background:none;border:none;color:var(--muted);cursor:pointer" onclick="admRemoveShow('${s.id}')">🗑</button>
      </td>
    </tr>`).join('');
}
window.admEditShow = id => {
  const s = showsCache.find(x => x.id === id); if (!s) return;
  document.getElementById('adm-show-id').value = s.id;
  document.getElementById('adm-show-title').value = s.title||'';
  document.getElementById('adm-show-ep').value = s.episode_number||'';
  document.getElementById('adm-show-date').value = s.scheduled_at ? s.scheduled_at.slice(0,16) : '';
  document.getElementById('adm-show-status').value = s.status||'scheduled';
  document.getElementById('adm-show-notes').value = s.notes||'';
  document.getElementById('adm-show-form-title').textContent = 'Edit Show';
};
window.admRemoveShow = async id => {
  if (!confirm('Delete show?')) return;
  await deleteShow(id); toast('Show deleted.'); admLoadShows();
};
document.getElementById('adm-show-save').addEventListener('click', async () => {
  const id = document.getElementById('adm-show-id').value;
  const payload = {
    title: document.getElementById('adm-show-title').value.trim(),
    episode_number: parseInt(document.getElementById('adm-show-ep').value)||null,
    scheduled_at: document.getElementById('adm-show-date').value||null,
    status: document.getElementById('adm-show-status').value,
    notes: document.getElementById('adm-show-notes').value.trim()||null,
  };
  if (!payload.title) { toast('Title required.'); return; }
  if (id) payload.id = id;
  await upsertShow(payload); toast('Show saved ✔');
  document.getElementById('adm-show-clear').click(); admLoadShows();
});
document.getElementById('adm-show-clear').addEventListener('click', () => {
  ['adm-show-id','adm-show-title','adm-show-ep','adm-show-date','adm-show-notes'].forEach(i => document.getElementById(i).value = '');
  document.getElementById('adm-show-status').value = 'scheduled';
  document.getElementById('adm-show-form-title').textContent = 'New Show';
});

// ── Guests ─────────────────────────────────────────────────────
let guestsCache = [];
async function admLoadGuests() {
  if (!showsCache.length) showsCache = await getShows();
  populateShowSelects(showsCache);
  const { data } = await supabase.from('guests').select('*, shows(title, episode_number)').order('created_at', { ascending: false });
  guestsCache = data || [];
  const tb = document.getElementById('adm-guests-tbody');
  if (!guestsCache.length) { tb.innerHTML = '<tr><td colspan="4" style="color:var(--muted)">No guests yet.</td></tr>'; return; }
  tb.innerHTML = guestsCache.map(g => `
    <tr>
      <td><strong>${g.name}</strong></td>
      <td>${g.shows ? `Ep ${g.shows.episode_number||'?'} — ${g.shows.title}` : '—'}</td>
      <td>${g.confirmed ? '✅ Confirmed' : '⏳ Pending'}</td>
      <td>
        <button class="btn btn-outline" style="padding:.2rem .5rem;font-size:.75rem" onclick="admEditGuest('${g.id}')">Edit</button>
        <button style="background:none;border:none;color:var(--muted);cursor:pointer" onclick="admRemoveGuest('${g.id}')">🗑</button>
      </td>
    </tr>`).join('');
}
window.admEditGuest = id => {
  const g = guestsCache.find(x => x.id === id); if (!g) return;
  document.getElementById('adm-guest-id').value = g.id;
  document.getElementById('adm-guest-show').value = g.show_id||'';
  document.getElementById('adm-guest-name').value = g.name||'';
  document.getElementById('adm-guest-bio').value = g.bio||'';
  document.getElementById('adm-guest-social').value = g.social_handle||'';
  document.getElementById('adm-guest-confirmed').value = String(g.confirmed);
};
window.admRemoveGuest = async id => {
  if (!confirm('Delete guest?')) return;
  await deleteGuest(id); toast('Guest deleted.'); admLoadGuests();
};
document.getElementById('adm-guest-save').addEventListener('click', async () => {
  const id = document.getElementById('adm-guest-id').value;
  const payload = {
    show_id: document.getElementById('adm-guest-show').value||null,
    name: document.getElementById('adm-guest-name').value.trim(),
    bio: document.getElementById('adm-guest-bio').value.trim()||null,
    social_handle: document.getElementById('adm-guest-social').value.trim()||null,
    confirmed: document.getElementById('adm-guest-confirmed').value === 'true',
  };
  if (!payload.name) { toast('Name required.'); return; }
  if (id) payload.id = id;
  await upsertGuest(payload); toast('Guest saved ✔');
  document.getElementById('adm-guest-clear').click(); admLoadGuests();
});
document.getElementById('adm-guest-clear').addEventListener('click', () => {
  ['adm-guest-id','adm-guest-name','adm-guest-bio','adm-guest-social'].forEach(i => document.getElementById(i).value = '');
  document.getElementById('adm-guest-confirmed').value = 'false';
});

// ── Stream Links ───────────────────────────────────────────────
let linksCache = [];
async function admLoadLinks() {
  if (!showsCache.length) showsCache = await getShows();
  populateShowSelects(showsCache);
  const { data } = await supabase.from('stream_links').select('*, shows(title, episode_number)').order('created_at', { ascending: false });
  linksCache = data || [];
  const tb = document.getElementById('adm-links-tbody');
  if (!linksCache.length) { tb.innerHTML = '<tr><td colspan="5" style="color:var(--muted)">No stream links yet.</td></tr>'; return; }
  tb.innerHTML = linksCache.map(l => `
    <tr>
      <td>${l.shows ? `Ep ${l.shows.episode_number||'?'} — ${l.shows.title}` : '—'}</td>
      <td>${l.platform}</td>
      <td style="font-size:.78rem"><a href="${l.url}" target="_blank">${l.url.slice(0,35)}...</a></td>
      <td>${l.is_primary ? '✅' : ''}</td>
      <td><button style="background:none;border:none;color:var(--muted);cursor:pointer" onclick="admRemoveLink('${l.id}')">🗑</button></td>
    </tr>`).join('');
}
window.admRemoveLink = async id => {
  if (!confirm('Delete link?')) return;
  await deleteStreamLink(id); toast('Link deleted.'); admLoadLinks();
};
document.getElementById('adm-link-save').addEventListener('click', async () => {
  const id = document.getElementById('adm-link-id').value;
  const payload = {
    show_id: document.getElementById('adm-link-show').value||null,
    platform: document.getElementById('adm-link-platform').value.trim(),
    url: document.getElementById('adm-link-url').value.trim(),
    is_primary: document.getElementById('adm-link-primary').value === 'true',
  };
  if (!payload.url || !payload.platform) { toast('Platform and URL required.'); return; }
  if (id) payload.id = id;
  await upsertStreamLink(payload); toast('Stream link saved ✔');
  document.getElementById('adm-link-clear').click(); admLoadLinks();
});
document.getElementById('adm-link-clear').addEventListener('click', () => {
  ['adm-link-id','adm-link-platform','adm-link-url'].forEach(i => document.getElementById(i).value = '');
  document.getElementById('adm-link-primary').value = 'false';
});

// ── Polls ──────────────────────────────────────────────────────
let pollsCache = [];
async function admLoadPolls() {
  if (!showsCache.length) showsCache = await getShows();
  populateShowSelects(showsCache);
  pollsCache = await getPolls();
  const tb = document.getElementById('adm-polls-tbody');
  if (!pollsCache.length) { tb.innerHTML = '<tr><td colspan="4" style="color:var(--muted)">No polls.</td></tr>'; return; }
  tb.innerHTML = pollsCache.map(p => `
    <tr>
      <td><strong>${p.question}</strong></td>
      <td>${p.status}</td>
      <td>${p.poll_votes?.length||0}</td>
      <td>
        ${p.status==='draft' ? `<button class="btn btn-outline" style="padding:.18rem .45rem;font-size:.73rem" onclick="admOpenPoll('${p.id}')">Open</button>` : ''}
        ${p.status==='open' ? `<button class="btn btn-outline" style="padding:.18rem .45rem;font-size:.73rem" onclick="admClosePoll('${p.id}')">Close</button>` : ''}
        <button class="btn btn-outline" style="padding:.18rem .45rem;font-size:.73rem" onclick="admEditPoll('${p.id}')">Edit</button>
        <button style="background:none;border:none;color:var(--muted);cursor:pointer" onclick="admRemovePoll('${p.id}')">🗑</button>
      </td>
    </tr>`).join('');
}
window.admOpenPoll = async id => { await setPollStatus(id,'open'); toast('Poll opened.'); admLoadPolls(); };
window.admClosePoll = async id => { await setPollStatus(id,'closed'); toast('Poll closed.'); admLoadPolls(); };
window.admRemovePoll = async id => { if (!confirm('Delete poll?')) return; await deletePoll(id); toast('Poll deleted.'); admLoadPolls(); };
window.admEditPoll = id => {
  const p = pollsCache.find(x => x.id === id); if (!p) return;
  const opts = Array.isArray(p.options) ? p.options : JSON.parse(p.options||'[]');
  document.getElementById('adm-poll-id').value = p.id;
  document.getElementById('adm-poll-question').value = p.question||'';
  document.getElementById('adm-poll-options').value = opts.join('\n');
  document.getElementById('adm-poll-show').value = p.show_id||'';
  document.getElementById('adm-poll-status').value = p.status||'draft';
};
document.getElementById('adm-poll-save').addEventListener('click', async () => {
  const id = document.getElementById('adm-poll-id').value;
  const opts = document.getElementById('adm-poll-options').value.split('\n').map(s=>s.trim()).filter(Boolean);
  const payload = {
    question: document.getElementById('adm-poll-question').value.trim(),
    options: opts,
    show_id: document.getElementById('adm-poll-show').value||null,
    status: document.getElementById('adm-poll-status').value,
  };
  if (!payload.question || opts.length < 2) { toast('Question + 2 options required.'); return; }
  if (id) payload.id = id;
  await upsertPoll(payload); toast('Poll saved ✔');
  document.getElementById('adm-poll-clear').click(); admLoadPolls();
});
document.getElementById('adm-poll-clear').addEventListener('click', () => {
  ['adm-poll-id','adm-poll-question','adm-poll-options'].forEach(i => document.getElementById(i).value = '');
  document.getElementById('adm-poll-status').value = 'draft';
});

// ── Branding ───────────────────────────────────────────────────
async function admLoadBranding() {
  const b = await getBranding(); if (!b) return;
  document.getElementById('adm-brand-id').value = b.id||'';
  document.getElementById('adm-brand-name').value = b.show_name||'';
  document.getElementById('adm-brand-tagline').value = b.tagline||'';
  document.getElementById('adm-brand-logo').value = b.logo_url||'';
  const ml = b.media_links||{};
  document.getElementById('adm-brand-yt').value = ml.youtube||'';
  document.getElementById('adm-brand-twitch').value = ml.twitch||'';
  document.getElementById('adm-brand-ig').value = ml.instagram||'';
  document.getElementById('adm-brand-fb').value = ml.facebook||'';
  document.getElementById('adm-brand-web').value = ml.website||'';
  document.getElementById('adm-brand-pod').value = ml.podcast||'';
}
document.getElementById('adm-brand-save').addEventListener('click', async () => {
  const id = document.getElementById('adm-brand-id').value;
  const payload = {
    show_name: document.getElementById('adm-brand-name').value.trim(),
    tagline: document.getElementById('adm-brand-tagline').value.trim()||null,
    logo_url: document.getElementById('adm-brand-logo').value.trim()||null,
    media_links: {
      youtube: document.getElementById('adm-brand-yt').value.trim()||null,
      twitch: document.getElementById('adm-brand-twitch').value.trim()||null,
      instagram: document.getElementById('adm-brand-ig').value.trim()||null,
      facebook: document.getElementById('adm-brand-fb').value.trim()||null,
      website: document.getElementById('adm-brand-web').value.trim()||null,
      podcast: document.getElementById('adm-brand-pod').value.trim()||null,
    },
    is_active: true,
  };
  if (!payload.show_name) { toast('Show name required.'); return; }
  if (id) payload.id = id;
  await saveBranding(payload); toast('Branding saved ✔');
});

// ── Users ──────────────────────────────────────────────────────
let usersCache = [];
async function admLoadUsers() {
  usersCache = await getUsers();
  const tb = document.getElementById('adm-users-tbody');
  if (!usersCache.length) { tb.innerHTML = '<tr><td colspan="4" style="color:var(--muted)">No users.</td></tr>'; return; }
  tb.innerHTML = usersCache.map(u => `
    <tr>
      <td><strong>${u.username||'(no username)'}</strong><br><span style="color:var(--muted);font-size:.75rem">${u.full_name||''}</span></td>
      <td>${u.show_role}</td>
      <td>${u.points_total}</td>
      <td>
        <select onchange="admChangeRole('${u.id}', this.value)" style="background:var(--surface2);color:var(--text);border:1px solid var(--surface2);border-radius:4px;padding:.18rem .35rem;font-size:.78rem">
          ${['viewer','member','supporter','moderator','admin'].map(r => `<option value="${r}" ${u.show_role===r?'selected':''}>${r}</option>`).join('')}
        </select>
        <button class="btn btn-outline" style="padding:.18rem .45rem;font-size:.73rem;margin-left:.3rem" onclick="admAwardPoints('${u.id}','${u.username||'user'}')">+pts</button>
      </td>
    </tr>`).join('');
}
window.admChangeRole = async (id, role) => { await setUserRole(id, role); toast('Role updated ✔'); };
window.admAwardPoints = async (id, name) => {
  const pts = parseInt(prompt(`Award points to ${name}:`));
  if (isNaN(pts)) return;
  await awardPoints(id, 'manual_award', pts);
  toast(`+${pts} pts to ${name} ✔`); admLoadUsers();
};

// ── Supporters ─────────────────────────────────────────────────
async function admLoadSupporters() {
  const donations = await getDonations();
  const wall = await getRecognitionWall();
  const dtb = document.getElementById('adm-donations-tbody');
  if (!donations.length) { dtb.innerHTML = '<tr><td colspan="4" style="color:var(--muted)">No donations yet.</td></tr>'; }
  else dtb.innerHTML = donations.map(d => `
    <tr>
      <td>${d.contributors?.display_name||'Anonymous'}</td>
      <td style="color:var(--accent);font-weight:700">$${parseFloat(d.amount_usd).toFixed(2)}</td>
      <td>${d.tier}</td>
      <td style="color:var(--muted);font-size:.78rem">${fmtDate(d.created_at)}</td>
    </tr>`).join('');
  const wtb = document.getElementById('adm-wall-tbody');
  if (!wall.length) { wtb.innerHTML = '<tr><td colspan="4" style="color:var(--muted)">Wall is empty.</td></tr>'; }
  else wtb.innerHTML = wall.map(w => `
    <tr>
      <td><strong>${w.display_name}</strong></td>
      <td>${w.tier}</td>
      <td><input type="checkbox" ${w.is_visible?'checked':''} onchange="admToggleVisible('${w.id}',this.checked)"></td>
      <td><input type="checkbox" ${w.featured?'checked':''} onchange="admToggleFeatured('${w.id}',this.checked)"></td>
    </tr>`).join('');
}
window.admToggleVisible = async (id, val) => { await updateRecognitionEntry(id, { is_visible: val }); toast('Updated.'); };
window.admToggleFeatured = async (id, val) => { await updateRecognitionEntry(id, { featured: val }); toast('Updated.'); };

// ── Init: immediate session check + subscribe to future changes ──
// The dynamic import() means we may miss the initial SIGNED_IN event,
// so we proactively check getSession() right away.
updateFab();
supabase.auth.onAuthStateChange(() => updateFab());

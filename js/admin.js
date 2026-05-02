import { supabase } from './supabase.js';

// ── Auth Guard ─────────────────────────────────────────────
export async function requireAdmin() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', session.user.id).maybeSingle();
  if (!profile || !['admin','moderator'].includes(profile.show_role)) return null;
  return { user: session.user, profile };
}

// ── Shows ──────────────────────────────────────────────────
export async function getShows() {
  const { data } = await supabase
    .from('shows')
    .select('*, guests(id, name, confirmed), stream_links(id, platform, url, is_primary)')
    .order('scheduled_at', { ascending: false })
    .limit(20);
  return data || [];
}

export async function upsertShow(show) {
  const { data, error } = await supabase.from('shows').upsert(show).select().single();
  if (error) throw error;
  return data;
}

export async function deleteShow(id) {
  const { error } = await supabase.from('shows').delete().eq('id', id);
  if (error) throw error;
}

// ── Stream Mode ────────────────────────────────────────────
export async function setStreamMode(mode) {
  const { data: show } = await supabase
    .from('shows')
    .select('id')
    .in('status', ['scheduled', 'live'])
    .order('scheduled_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!show) throw new Error('No active show found');
  const { error } = await supabase
    .from('shows')
    .update({ stream_mode: mode })
    .eq('id', show.id);
  if (error) throw error;
}

export async function getStreamMode() {
  const { data } = await supabase
    .from('shows')
    .select('stream_mode')
    .in('status', ['scheduled', 'live'])
    .order('scheduled_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return data?.stream_mode || 'playlist';
}

// ── Guests ─────────────────────────────────────────────────
export async function upsertGuest(guest) {
  const { data, error } = await supabase.from('guests').upsert(guest).select().single();
  if (error) throw error;
  return data;
}

export async function deleteGuest(id) {
  const { error } = await supabase.from('guests').delete().eq('id', id);
  if (error) throw error;
}

// ── Stream Links ─────────────────────────────────────────
export async function upsertStreamLink(link) {
  const { data, error } = await supabase.from('stream_links').upsert(link).select().single();
  if (error) throw error;
  return data;
}

export async function deleteStreamLink(id) {
  await supabase.from('stream_links').delete().eq('id', id);
}

// ── Polls ───────────────────────────────────────────────────
export async function getPolls() {
  const { data } = await supabase
    .from('polls')
    .select('*, poll_votes(id)')
    .order('created_at', { ascending: false })
    .limit(20);
  return data || [];
}

export async function upsertPoll(poll) {
  const { data, error } = await supabase.from('polls').upsert(poll).select().single();
  if (error) throw error;
  return data;
}

export async function setPollStatus(id, status) {
  const { error } = await supabase.from('polls').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function deletePoll(id) {
  await supabase.from('polls').delete().eq('id', id);
}

// ── Branding ───────────────────────────────────────────────
export async function getBranding() {
  const { data } = await supabase.from('branding').select('*').eq('active', true).maybeSingle();
  return data;
}

export async function saveBranding(branding) {
  if (branding.id) {
    const { error } = await supabase.from('branding').update(branding).eq('id', branding.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from('branding').insert({ ...branding, active: true });
    if (error) throw error;
  }
}

// ── Users ────────────────────────────────────────────────────
export async function getUsers() {
  const { data } = await supabase
    .from('profiles')
    .select('id, username, full_name, show_role, points_total, created_at')
    .order('created_at', { ascending: false })
    .limit(50);
  return data || [];
}

export async function setUserRole(id, role) {
  const { error } = await supabase.from('profiles').update({ show_role: role }).eq('id', id);
  if (error) throw error;
}

export async function awardPoints(userId, action, points) {
  await supabase.from('points_log').insert({ user_id: userId, action, points });
  await supabase.rpc('increment_points', { uid: userId, amount: points });
}

// ── Supporters ─────────────────────────────────────────────
export async function getDonations() {
  const { data } = await supabase
    .from('donations')
    .select('*, contributors(display_name, email)')
    .order('created_at', { ascending: false })
    .limit(50);
  return data || [];
}

export async function getRecognitionWall() {
  const { data } = await supabase
    .from('recognition_wall')
    .select('*')
    .order('sort_order', { ascending: true });
  return data || [];
}

export async function updateRecognitionEntry(id, updates) {
  const { error } = await supabase.from('recognition_wall').update(updates).eq('id', id);
  if (error) throw error;
}

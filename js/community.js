import { supabase } from './supabase.js';

// ── Auth State ────────────────────────────────────────────────
export let currentUser = null;
export let currentProfile = null;

export async function initAuth(onAuthChange) {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) await resolveProfile(session.user);
  supabase.auth.onAuthStateChange(async (_event, session) => {
    if (session?.user) {
      await resolveProfile(session.user);
    } else {
      currentUser = null;
      currentProfile = null;
    }
    if (onAuthChange) onAuthChange(currentUser, currentProfile);
  });
  if (onAuthChange) onAuthChange(currentUser, currentProfile);
}

async function resolveProfile(user) {
  currentUser = user;
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();
  currentProfile = data;
}

// ── Posts (Message Board) ────────────────────────────────────
export async function loadPosts(limit = 20) {
  const { data, error } = await supabase
    .from('posts')
    .select(`
      id, caption, image_url, created_at,
      profiles:user_id ( username, avatar_url ),
      likes ( id ),
      comments ( id, body, created_at, profiles:user_id(username) )
    `)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) console.error('loadPosts', error);
  return data || [];
}

export async function createPost(caption) {
  if (!currentUser) throw new Error('Not signed in');
  const { data, error } = await supabase
    .from('posts')
    .insert({ user_id: currentUser.id, caption })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deletePost(postId) {
  const { error } = await supabase.from('posts').delete().eq('id', postId);
  if (error) throw error;
}

export async function toggleLike(postId) {
  if (!currentUser) throw new Error('Not signed in');
  const { data: existing } = await supabase
    .from('likes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', currentUser.id)
    .maybeSingle();
  if (existing) {
    await supabase.from('likes').delete().eq('id', existing.id);
    return false;
  } else {
    await supabase.from('likes').insert({ post_id: postId, user_id: currentUser.id });
    return true;
  }
}

export async function addComment(postId, body) {
  if (!currentUser) throw new Error('Not signed in');
  const { data, error } = await supabase
    .from('comments')
    .insert({ post_id: postId, user_id: currentUser.id, body })
    .select('id, body, created_at, profiles:user_id(username)')
    .single();
  if (error) throw error;
  return data;
}

// ── Polls ─────────────────────────────────────────────────────
export async function loadOpenPolls() {
  const { data } = await supabase
    .from('polls')
    .select('*')
    .eq('status', 'open')
    .order('created_at', { ascending: false });
  return data || [];
}

export async function getUserVote(pollId) {
  if (!currentUser) return null;
  const { data } = await supabase
    .from('poll_votes')
    .select('choice')
    .eq('poll_id', pollId)
    .eq('user_id', currentUser.id)
    .maybeSingle();
  return data?.choice || null;
}

export async function castVote(pollId, choice) {
  if (!currentUser) throw new Error('Not signed in');
  const { error } = await supabase
    .from('poll_votes')
    .insert({ poll_id: pollId, user_id: currentUser.id, choice });
  if (error) throw error;
}

export async function getPollResults(pollId) {
  const { data } = await supabase
    .from('poll_votes')
    .select('choice')
    .eq('poll_id', pollId);
  const counts = {};
  (data || []).forEach(v => { counts[v.choice] = (counts[v.choice] || 0) + 1; });
  return counts;
}

// ── Leaderboard ───────────────────────────────────────────────
export async function loadLeaderboard(limit = 10) {
  const { data } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, points_total, show_role')
    .order('points_total', { ascending: false })
    .limit(limit);
  return data || [];
}

// ── Award Points (client-side log, admin-controlled) ──────────
export async function logPoints(userId, action, points, refId = null) {
  await supabase.from('points_log').insert({ user_id: userId, action, points, ref_id: refId });
  // Update total
  await supabase.rpc('increment_points', { uid: userId, amount: points }).catch(() => {});
}

// Supabase client config
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = 'https://nmemmfblpzrkwyljpmvp.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Lc7rXKQ-1TJaQFu7a-nOVQ_5Sf3x__M';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

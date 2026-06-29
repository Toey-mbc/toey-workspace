import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const hasSupabaseConfig = Boolean(url && anon && !url.includes('YOUR_PROJECT'));
export const supabase = hasSupabaseConfig ? createClient(url, anon) : null;

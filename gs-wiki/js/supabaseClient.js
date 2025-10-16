// public/js/supabaseClient.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const SUPABASE_URL = "https://TU-PROJECT-REF.supabase.co";
export const SUPABASE_ANON_KEY = "TU-ANON-KEY";
export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

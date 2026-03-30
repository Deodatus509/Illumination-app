import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://tjwwdnkdynmqblwwbiuq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_-uwYZZDb0CTrn3dWynsQNg_-NzRQtvT';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

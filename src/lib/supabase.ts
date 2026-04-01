import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://tjwwdnkdynmqblwwbiuq.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqd3dkbmtkeW5tcWJsd3diaXVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4OTM4MDQsImV4cCI6MjA5MDQ2OTgwNH0.klV-7GbXpH6rnYF1LCy63RVpQGik94bfOwi38dxT7ok';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

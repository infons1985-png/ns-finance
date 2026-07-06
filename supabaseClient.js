import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xvjfcujfcmhsbiygquss.supabase.co';
const supabaseAnonKey = 'sb_publishable_u17szuQq4LzpEKljhfH-Iw_FBM1Ntqb';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

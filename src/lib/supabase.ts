import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Tạo client — nếu chưa có URL thì app sẽ báo lỗi rõ ràng khi gọi API
export const supabase: SupabaseClient = createClient(
  supabaseUrl  || 'https://placeholder.supabase.co',
  supabaseKey  || 'placeholder-key'
);

export const isSupabaseConfigured =
  !!supabaseUrl && !supabaseUrl.includes('placeholder') &&
  !!supabaseKey && !supabaseKey.includes('placeholder');

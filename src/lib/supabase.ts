import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn("Supabase 환경변수가 없습니다. VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY를 설정하세요.");
}

export const supabase = createClient(
  supabaseUrl || "https://missing.supabase.co",
  supabaseAnonKey || "missing-anon-key"
);

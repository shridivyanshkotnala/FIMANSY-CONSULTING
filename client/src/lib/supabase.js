import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Temporary-safe mode:
// If Supabase env vars are missing, bootstrap with harmless placeholders
// so the app can load. Supabase calls will fail gracefully at runtime.
const fallbackUrl = "https://placeholder-project.supabase.co";
const fallbackAnonKey = "placeholder-anon-key";

if (!supabaseUrl || !supabaseAnonKey) {
  console.debug(
    "[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing. Supabase features are temporarily disabled."
  );
}

export const supabase = createClient(
  supabaseUrl || fallbackUrl,
  supabaseAnonKey || fallbackAnonKey
);

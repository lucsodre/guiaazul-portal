import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

let supabaseProjectRef = 'app'
try {
  supabaseProjectRef = new URL(supabaseUrl).hostname.split('.')[0]
} catch {
  // env var not set — safe fallback prevents module crash
}

export const supabaseStorageKey = `sb-${supabaseProjectRef}-auth-token`

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: localStorage,
    storageKey: supabaseStorageKey,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl) throw new Error('VITE_SUPABASE_URL no está definida')
if (!supabaseAnonKey) throw new Error('VITE_SUPABASE_ANON_KEY no está definida')

/** Cliente de Supabase preconfigurado con persistencia de sesión y auto-refresh de token */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})
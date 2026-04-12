import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env and fill in your Supabase credentials.'
  )
}

// Note: For full type safety, generate types with:
//   npx supabase gen types typescript --project-id YOUR_PROJECT_REF > src/types/database.ts
// Then pass the Database type: createClient<Database>(...)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

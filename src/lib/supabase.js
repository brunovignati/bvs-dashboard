import { createClient } from '@supabase/supabase-js'

// Credenciales directas — proyecto BVS Analytics
// Nota: service_role key bypasea RLS (aceptable para dashboard interno)
const supabaseUrl = 'https://tdygooblqxldyakijgda.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkeWdvb2JscXhsZHlha2lqZ2RhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTQ5OTgwNSwiZXhwIjoyMDk3MDc1ODA1fQ.ks59ROyIph2wg_543nFbutdwEIPt_ZIJ9K830x7WNwY'

export const supabase = createClient(supabaseUrl, supabaseKey)

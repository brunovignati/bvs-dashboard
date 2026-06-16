import { createClient } from '@supabase/supabase-js'

// Credenciales directas — proyecto BVS Analytics
const supabaseUrl = 'https://tdygooblqxldyakijgda.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkeWdvb2JscXhsZHlha2lqZ2RhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0OTk4MDUsImV4cCI6MjA5NzA3NTgwNX0.ENo9c6IWjwJjw4jV5evxvwLEJq7Tw0kNRXBbNOZOzIY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

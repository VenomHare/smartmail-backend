
import dotenv from 'dotenv'

dotenv.config()

/* Constants */
export const PORT = process.env.PORT || 3001;
export const SUPABASE_ANON_KEY= process.env.SUPABASE_ANON_KEY || ""
export const SUPABASE_URL = process.env.SUPABASE_URL || ""
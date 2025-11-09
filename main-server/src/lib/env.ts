
import dotenv from 'dotenv'

dotenv.config()

/* Constants */
export const PORT = process.env.PORT || 3001;
export const NODE_ENV = process.env.NODE_ENV || "sandbox";
export const SUPABASE_ANON_KEY= process.env.SUPABASE_ANON_KEY || ""
export const SUPABASE_URL = process.env.SUPABASE_URL || ""
export const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000"
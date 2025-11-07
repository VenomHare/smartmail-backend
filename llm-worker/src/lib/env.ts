import dotenv from 'dotenv'
dotenv.config();

export const SUPABASE_URL = process.env.SUPABASE_URL || ""
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || ""

export const GEMINI_MODEL = process.env.GEMINI_MODEL || ""
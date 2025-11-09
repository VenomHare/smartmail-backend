import dotenv from 'dotenv'
dotenv.config();

export const SUPABASE_URL = process.env.SUPABASE_URL || ""
export const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || ""

export const GEMINI_MODEL = process.env.GEMINI_MODEL || ""
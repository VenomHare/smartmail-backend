import { createClient } from "@supabase/supabase-js";
import type { Request, Response } from "express";

// export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!
);

// Admin client for server operations (with secret key)
export const supabaseAdmin = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

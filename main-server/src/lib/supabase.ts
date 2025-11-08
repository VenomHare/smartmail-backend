import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "./env";
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

export const getSupabaseWithCookies = (req: Request, res: Response) => {
    return createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      {
        auth: {
          flowType: 'pkce',
          detectSessionInUrl: true,
          persistSession: true,
          storage: {
            getItem: (key: string) => {
                if (req.cookies) {
                    return req.cookies[key];
                }
                else {
                    return null
                }
            },
            setItem: (key: string, value: string) => {
              res.cookie(key, value, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 1000 * 60 * 60 * 24 * 7 // 7 days
              });
            },
            removeItem: (key: string) => {
              res.clearCookie(key);
            }
          }
        }
      }
    );
  };
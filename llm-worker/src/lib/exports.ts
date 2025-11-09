import Redis from "ioredis";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env";
import { GoogleGenAI } from "@google/genai";

export const redis = new Redis();
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
export const ai = new GoogleGenAI({});

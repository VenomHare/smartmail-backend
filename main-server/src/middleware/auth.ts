import type { NextFunction, Request, Response } from "express";
import { getSupabaseWithCookies } from "../lib/supabase";

interface AuthRequest extends Request {
    user?: any
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const supabase = getSupabaseWithCookies(req, res);

        const { data, error } = await supabase.auth.getClaims()

        if (error || data == null) {
            console.log(error);
            res.status(401).json({ error: 'Unauthorized' });
            return
        }

        console.log(data);
        req.user = data.claims
        next();
    }
    catch (err) {
        console.log(err);
        res.status(401).json({
            message: "Unauthorized",
            errorCode: "DB_01"
        })
        return
    }
}
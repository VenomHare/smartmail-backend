import type { NextFunction, Request, Response } from "express";
import { supabase, supabaseAdmin } from "../lib/supabase";
import { redisAuth } from "../lib/redis";
import { FRONTEND_URL } from "../lib/env";

//Refrence Types from supabase
export type UserClaims = {
    iss: string
    sub: string
    aud: string | string[]
    exp: number
    iat: number
    role: string
    session_id: string,

    email?: string
    phone?: string
    is_anonymous?: boolean

    jti?: string
    nbf?: number
    app_metadata?: any
    user_metadata?: any

    ref?: string

    [key: string]: any
}

export interface AuthRequest extends Request {
    user?: UserClaims
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const access_token = req.cookies.access_token;

        if (!access_token) {
            res.status(401).json({
                message: "Unauthorized",
                errorCode: "TK_01"
            });
            return
        }

        const { data } = await supabase.auth.getClaims(access_token);

        if (!data || !data.claims) {
            res.status(401).json({
                message: "Unauthorized",
                errorCode: "TK_02"
            });
            return
        }

        // console.log(`User claims`, data.claims);
        req.user = data.claims;
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

export const signout = async (req: AuthRequest, res: Response) => {
    if (!req.user) { return res.status(401).json({ message: "Session not found", errorCode: "SE_404" }) }
    await supabaseAdmin.auth.admin.signOut(req.cookies.access_token);
    await redisAuth.del(`session:${req.user.sub}`);
    res.clearCookie("access_token");
    res.json({
        message: "Logout Succesfull."
    });
}
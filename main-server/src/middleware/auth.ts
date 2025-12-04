import type { NextFunction, Request, Response } from "express";
import { supabase, supabaseAdmin } from "../lib/supabase";
import { redisAuth } from "../lib/redis";
import { NODE_ENV } from "../lib/env";
import jwt from 'jsonwebtoken'

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
        let access_token = req.cookies.access_token;

        if (!access_token) {
            res.status(401).json({
                message: "Unauthorized",
                errorCode: "TK_01"
            });
            return
        }

        const { error } = await supabase.auth.getUser(access_token);

        if (error) {
            if (error.code == "bad_jwt") {
                access_token = await refreshTokens(req, res);
            }
            else {
                res.status(401).json({
                    message: "Unauthorized",
                    errorCode: "TK_02"
                });
                return
            }
        }

        const { data: claims } = await supabase.auth.getClaims(access_token);

        if (!claims || !claims.claims) {
            res.status(401).json({
                message: "Unauthorized",
                errorCode: "TK_03"
            });
            return
        }

        // console.log(`User claims`, data.claims);
        req.user = claims.claims;
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
        message: "Logged Out!"
    });
}

export const refreshTokens = async (req: Request, res: Response) => {
    try {
        const access_token = req.cookies.access_token;

        const ClaimsData : any = jwt.decode(access_token);
        
        if (ClaimsData == null) {
            await signout(req, res);
        }

        const refreshToken = await redisAuth.getex(`session:${ClaimsData?.sub}`);

        if (refreshToken == null) {
            console.log("Refresh Token not found. Signing user out for new tokens");
            return await signout(req, res);
        }

        const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

        if (error) {
            return res.status(401).json({ error: 'Failed to refresh session' });
        }

        if (data.session && data.user) {
            res.cookie("access_token", data.session.access_token, {
                sameSite: "lax",
                httpOnly: NODE_ENV == "production",
                secure: NODE_ENV == "production",
                maxAge: 30 * 24 * 60 * 60 * 1000,
            })

            // Storing refresh token in client cookies just doesn't make sense
            redisAuth.setex(`session:${data.user.id}`, 30 * 24 * 60 * 60 * 1000, data.session?.refresh_token);

        }
        console.log("♻️ Refreshed Session");
        return data.session?.access_token

    } catch (error) {
        console.log(error);
        return res.status(401).json({
            message: "Unauthorized",
            errorCode: "REFRESH"
        })
    }
}
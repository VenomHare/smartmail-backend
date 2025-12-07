import { Router } from "express";
import { supabase } from "../lib/supabase";
import { FRONTEND_URL, NODE_ENV } from "../lib/env";
import { redisAuth } from "../lib/redis";
import { authMiddleware, signout, type AuthRequest } from "../middleware/auth";
import rateLimit from "express-rate-limit";

const authRouter = Router();

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
    standardHeaders: 'draft-8', // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
    ipv6Subnet: 56, // Set to 60 or 64 to be less aggressive, or 52 or 48 to be more aggressive
})

authRouter.use(limiter);

authRouter.post("/signup", async (req, res) => {
    try {

        const { email, password } = req.body;

        const { data, error } = await supabase.auth.signUp({
            email,
            password
        });

        if (error) {
            res.status(400).json({
                error: error.message
            })
        }

        if (data.session) {
            res.cookie("access_token", data.session.access_token, {
                sameSite: "lax",
                httpOnly: NODE_ENV == "production",
                secure: NODE_ENV == "production",
                maxAge: 30 * 24 * 60 * 60 * 1000,
            })
            // Storing refresh token in seperate redis cache 
            // Storing ref_token in client cookies just doesn't make sense

            redisAuth.setex(`session:${data.user?.id}`, 30 * 24 * 60 * 60 * 1000, data.session?.refresh_token);
        }

        res.json({
            message: 'Signup successful. Check your email for verification.',
            user: data.user
        });
    }
    catch (err) {
        console.log(err);
        res.status(500).json({
            message: "Something went wrong!"
        })
    }
})

authRouter.post("/signin", async (req, res) => {
    try {
        const { email, password } = req.body;
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            res.status(400).json({
                error: error.message
            })
        }

        if (data.session) {
            res.cookie("access_token", data.session.access_token, {
                sameSite: "lax",
                httpOnly: true,
                secure: true,
                maxAge: 30 * 24 * 60 * 60 * 1000,
            })
            // Storing refresh token in seperate redis cache 
            // Storing ref_token in client cookies just doesn't make sense

            redisAuth.setex(`session:${data.user.id}`, 30 * 24 * 60 * 60 * 1000, data.session?.refresh_token);
        }

        res.json({
            message: "login successful"
        });
    }
    catch (err) {
        console.log(err);
        res.status(500).json({
            message: "Something went wrong!"
        })
    }
})

authRouter.get("/google", async (_, res) => {
    try {

        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${FRONTEND_URL}/auth/callback`,
                queryParams: {
                    access_type: 'offline',
                    prompt: 'consent',
                }
            }
        });

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        // Return the OAuth URL to the frontend
        res.json({ url: data.url });
    } catch (error) {
        res.status(500).json({ error: 'OAuth initiation failed' });
    }
})

authRouter.post("/callback", async (req, res) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ error: 'No code provided' });
        }

        // Exchange the code for a session
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
            console.log(error);
            return res.status(400).json({ error: error.message });
        }

        if (data.session) {
            res.cookie("access_token", data.session.access_token, {
                sameSite: "lax",
                httpOnly: NODE_ENV == "production",
                secure: NODE_ENV == "production",
                maxAge: (data.session.expires_in || 600) * 1000,
            })
            // Storing refresh token in seperate redis cache 
            // Storing ref_token in client cookies just doesn't make sense

            redisAuth.setex(`session:${data.user.id}`, 30 * 24 * 60 * 60 * 1000, data.session?.refresh_token);
        }


        res.json({
            message: 'OAuth login successful',
            user: data.user
        });
    } catch (error) {
        res.status(500).json({ error: 'OAuth callback failed' });
    }
})

authRouter.get('/signout', authMiddleware, async (req: AuthRequest, res) => {
    try {
        await signout(req, res);
    } catch (error) {
        res.status(500).json({ error: 'Logout failed' });
    }
});

authRouter.get('/me', authMiddleware, async (req: AuthRequest, res) => {
    try {
        const { data, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", req.user?.sub)
            .single();

        if (error) {
            throw error
        }

        res.json({ user: data });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get user' });
    }
});

authRouter.get('/refresh', authMiddleware, async (req: AuthRequest, res) => {
    try {
        if (!req.user) { return res.status(401).json({ message: "Session not found", errorCode: "SE_404" }) }

        const refreshToken = await redisAuth.getex(`session:${req.user.sub}`);
        if (refreshToken == null) {
            console.log("Refresh Token not found. Signing user out for new tokens");
            await signout(req, res);
            return
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
                maxAge: (data.session.expires_in || 600) * 1000,
            })

            // Storing refresh token in client cookies just doesn't make sense
            redisAuth.setex(`session:${data.user.id}`, 30 * 24 * 60 * 60 * 1000, data.session?.refresh_token);
        }



        res.json({
            message: 'Session refreshed',
        });
    } catch (error) {
        res.status(500).json({ error: 'Refresh failed' });
    }
});

authRouter.post("/reset", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            res.status(400).json({
                message: "Invalid Input"
            })
            return
        }
        await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${FRONTEND_URL}/signin`
        });

        res.json({
            message: "Email Sent!"
        })
    }
    catch (error) {
        res.status(500).json({ error: 'Refresh failed' });
    }
})

authRouter.post("/onboard", authMiddleware, async (req: AuthRequest, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                message: "User not logged in!"
            });
        }
        const { full_name } = req.body;
        const { error } = await supabase.from("profiles").update({
            full_name
        }).eq("id", req.user.sub);

    }
    catch (err) {
        console.log(err);
        res.status(500).json({
            message: "Something went wrong!"
        })
    }
})

export default authRouter
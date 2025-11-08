import { application, Router } from "express";
import { getSupabaseWithCookies } from "../lib/supabase";
import { FRONTEND_URL } from "../lib/env";

const authRouter = Router();

authRouter.post("/signup", async (req, res) => {
    try {
        const supabase = getSupabaseWithCookies(req, res);

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
        const supabase = getSupabaseWithCookies(req, res);

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

        res.json({
            message: 'Login successful. ',
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

authRouter.get("/google", async (req, res) => {
    try {
        const supabase = getSupabaseWithCookies(req, res);

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

        const supabase = getSupabaseWithCookies(req, res);

        // Exchange the code for a session
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
            console.log(error);
            return res.status(400).json({ error: error.message });
        }

        res.json({
            message: 'OAuth login successful',
            user: data.user
        });
    } catch (error) {
        res.status(500).json({ error: 'OAuth callback failed' });
    }
})

authRouter.post('/signout', async (req, res) => {
    try {
        const supabase = getSupabaseWithCookies(req, res);

        await supabase.auth.signOut();

        res.json({ message: 'Logout successful' });
    } catch (error) {
        res.status(500).json({ error: 'Logout failed' });
    }
});

authRouter.get('/me', async (req, res) => {
    try {
        const supabase = getSupabaseWithCookies(req, res);

        const { data, error } = await supabase.auth.getClaims();

        if (error || !data?.claims) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        res.json({ user: data.claims });
    } catch (error) {
        res.status(500).json({ error: 'Failed to get user' });
    }
});

authRouter.post('/refresh', async (req, res) => {
    try {
        const supabase = getSupabaseWithCookies(req, res);

        const { data, error } = await supabase.auth.refreshSession();

        if (error) {
            return res.status(401).json({ error: 'Failed to refresh session' });
        }

        res.json({
            message: 'Session refreshed',
            session: data.session
        });
    } catch (error) {
        res.status(500).json({ error: 'Refresh failed' });
    }
});

export default authRouter
import { Router } from "express";
import { authMiddleware, type AuthRequest } from "../middleware/auth";
import { google } from "googleapis";
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } from "../lib/env";
import { supabase } from "../lib/supabase";

const router = Router();
router.use(authMiddleware);

const auth = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
);
const gmail = google.gmail({ version: "v1", auth });

router.get("/gmail/add", (req, res) => {

    const url = auth.generateAuthUrl({
        scope: ["https://www.googleapis.com/auth/gmail.compose", "https://www.googleapis.com/auth/userinfo.email"],
        prompt: "consent"
    });
    res.json({ url });
});


router.post("/gmail/creds", async (req: AuthRequest, res) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({
                message: "Invalid Input"
            })
        }
        if (!req.user) {
            return res.status(401).json({
                message: "Invalid User"
            })
        }

        const { tokens: { access_token, refresh_token, expiry_date } } = await auth.getToken(code);
        const { data: { emailAddress } } = await gmail.users.getProfile({
            userId: "me"
        })

        console.log({ emailAddress });
        const { error } = await supabase
            .from("gmail_connections")
            .insert({
                user_id: req.user.sub,
                gmail_id: emailAddress,
                access_token,
                refresh_token,
                expiry_date
            });

        if (error) {
            return res.status(500).json({
                status: "fail",
            });
        }

        res.json({
            status: "success",
        })

    }
    catch (err) {
        console.log(err);
        res.status(500).json({
            message: "Something went wrong!"
        })
    }
})
export default router;
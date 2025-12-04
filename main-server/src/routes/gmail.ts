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

router.get("/add", (_, res) => {

    const url = auth.generateAuthUrl({
        scope: ["https://www.googleapis.com/auth/gmail.compose", "https://www.googleapis.com/auth/userinfo.email"],
        prompt: "consent",
        access_type: "offline"
    });
    res.json({ url });
});


router.post("/creds", async (req: AuthRequest, res) => {
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
        auth.setCredentials({ access_token, refresh_token, expiry_date });

        const { data: { emailAddress } } = await gmail.users.getProfile({
            userId: "me"
        })

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
        console.log(JSON.stringify(err));
        res.status(500).json({
            message: "Something went wrong!"
        })
    }
})
router.get("/accounts", async (req: AuthRequest, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                message: "Unauthorized"
            })
        }

        const { error, data } = await supabase.from("gmail_connections").select("gmail_id").eq("user_id", req.user.sub);

        if (error) {
            return res.status(500).json({
                message: "Failed to fetch linked accounts"
            })
        }

        res.json(data.map(e => ({ email: e.gmail_id })));
    }
    catch (err) {
        console.log(JSON.stringify(err));
        res.status(500).json({
            message: "Something went wrong!"
        })
    }
})
router.post('/send-draft', async (req: AuthRequest, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({
                message: "Unauthorized"
            })
        }

        const { mail, id } = req.body;

        const { data: CredsData, error: CredsError } = await supabase
            .from("gmail_connections")
            .select("*")
            .eq("user_id", req.user.sub)
            .eq("gmail_id", mail)
            .single();

        if (CredsError) {
            return res.status(400).json({
                message: "No Linked Account Found!"
            })
        }

        const { data: MailData, error: MailError } = await supabase
            .from("generated_mail")
            .select("*")
            .eq("user_id", req.user.sub)
            .eq("uuid", id)
            .single();

        if (MailError) {
            return res.status(400).json({
                message: "No Linked Mail Found!"
            })
        }

        auth.setCredentials({
            access_token: CredsData.access_token,
            refresh_token: CredsData.refresh_token,
            expiry_date: CredsData.expiry_date
        });

        const utf8Subject = `=?utf-8?B?${Buffer.from(MailData.subject).toString('base64')}?=`;
        const messageParts = [
            // `To: ${mail}`,
            `Subject: ${utf8Subject}`,
            'MIME-Version: 1.0',
            'Content-Type: text/html; charset=utf-8',
            '',
            MailData.html
        ];

        const message = messageParts.join('\n');

        // Encode the message in base64url
        const encodedMessage = Buffer.from(message)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        try {
            await gmail.users.drafts.create({
                userId: "me",
                requestBody: {
                    message: {
                        raw: encodedMessage
                    },
                },
                auth
            });

            return res.json({
                message: "Mail Sent to Gmail Drafts!"
            });
        }
        catch (err) {
            return res.status(500).json({
                message: "Failed to send mail to gmail"
            })
        }
    }
    catch (err) {
        console.log(JSON.stringify(err));
        res.status(500).json({
            message: "Something went wrong!"
        })
    }
})
export default router;
import { google } from 'googleapis'
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } from '../lib/env'
export const sendEmail = async (subject: string, html: string) => {
    try {
        const auth = new google.auth.OAuth2(
            GOOGLE_CLIENT_ID,
            GOOGLE_CLIENT_SECRET,
            GOOGLE_REDIRECT_URI
        );
        const url = auth.generateAuthUrl({
            scope: ["https://www.googleapis.com/auth/gmail.compose"]
        });
        console.log(url);
    }
    catch (error) {
        console.log(error);
    }
}
import express from 'express'
import cors from 'cors'
import { PORT } from './lib/env';
import { authMiddleware } from './middleware/auth';
import mailRouter from './routes/mail';
import authRouter from './routes/auth';
import gmailRouter from './routes/gmail';
import CookieParser from 'cookie-parser'
import rateLimit from 'express-rate-limit';
import { sendEmail } from './helper/send-inbox';


const app = express();

const globalLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    limit: 500, 
    standardHeaders: 'draft-8', // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
    ipv6Subnet: 56, // Set to 60 or 64 to be less aggressive, or 52 or 48 to be more aggressive
})

app.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}));

app.use(globalLimiter);
app.use(express.json());
app.use(CookieParser());

app.use((req, _, next) => {
    console.log(`${req.method} ${req.url} ${JSON.stringify(req.body)}`);
    next();
})

app.get("/health", authMiddleware, (_, res) => {
    res.json({
        message: "Healthly Connection"
    })
})

app.use("/auth", authRouter);
app.use(mailRouter);
app.use(gmailRouter);

sendEmail("","");

app.listen(PORT, () => {
    console.log("Server Running on PORT " + PORT);
})
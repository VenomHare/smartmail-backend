import express from 'express'
import cors from 'cors'
import { PORT } from './lib/env';
import { authMiddleware } from './middleware/auth';
import mailRouter from './routes/mail';
import authRouter from './routes/auth';
import CookieParser from 'cookie-parser'

const app = express();

app.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}));
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

app.listen(PORT, () => {
    console.log("Server Running on PORT " + PORT);
})
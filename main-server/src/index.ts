import express from 'express'
import cors from 'cors'
import { PORT } from './lib/env';
import { authMiddleware } from './middleware/auth';
import mailRouter from './routes/mail';
import authRouter from './routes/auth';

const app = express();

app.use(cors());
app.use(express.json());

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
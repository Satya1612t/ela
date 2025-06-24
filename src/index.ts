import 'dotenv/config';
import { prisma } from './config/db';
import express, { Express, Request } from "express";
import cookieParser from "cookie-parser";
import helmet from 'helmet';
import { configCors } from './config/cors';
import { requestLogger } from './utils/logger';

const PORT = process.env.PORT || 4001;

const APP: Express = express();

APP.use(requestLogger)

APP.use(helmet());
APP.use(configCors());
APP.use(cookieParser()); 

APP.use(express.json());
APP.use(express.urlencoded({ extended: true }));

APP.get('/api/appCheck', async (req: Request, res: any) => {
    res.status(200).json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        message: 'Service is running'
    });
});



APP.listen(PORT, () => {
    console.log(`[Server] Server is listening on ${PORT}`);
})

process.on("SIGINT", async () => {
    await prisma.$disconnect();
    console.log("[Prisma] Disconnected Prisma gracefully");
    process.exit(0);
});

import 'dotenv/config';
import { prisma } from './config/db';
import express, { Express, Request, Response } from "express";
import cookieParser from "cookie-parser";
import PhonePeRoutes  from './routes/phonepe.route'
import helmet from 'helmet';
import { configCors } from './config/cors';
import { requestLogger } from './utils/logger';

const PORT = process.env.PORT || 4001;

const APP: Express = express();

// For Admin Creation
// (async () => {
    // await createAdminFromFirebaseUser();
    // })()
    // main()
    //   .then(() => {
        //     console.log('Seeding complete.');
//     return prisma.$disconnect();
//   })
//   .catch(e => {
//     console.error(e);
//     return prisma.$disconnect();
//   });


APP.use(requestLogger)

APP.use('/api/v1', PhonePeRoutes);

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


APP.get('/api/dbCheck', async (req: Request, res: Response) => {
  try {
    // Simple query to check connection (no actual data needed)
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      status: "connected",
      message: "Database is reachable",
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("[DB ERROR]", error);
    res.status(500).json({
      status: "disconnected",
      message: "Failed to connect to the database",
      error: (error as Error).message,
      timestamp: new Date().toISOString()
    });
  }
});

APP.listen(PORT, () => {
  console.log(`[Server] Server is listening on ${PORT}`);
})

process.on("SIGINT", async () => {
  await prisma.$disconnect();
  console.log("[Prisma] Disconnected Prisma gracefully");
  process.exit(0);
});

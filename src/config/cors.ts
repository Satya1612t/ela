import 'dotenv/config';
import cors from 'cors';

export const configCors = () => {
    const allowedOrigins = [
        'http://localhost:5173', // typically set to your frontend URL
        'http://localhost:5174' // typically set to your frontend URL
    ];

    return cors({
        origin: (origin, callback) => {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
            } else {
                callback(new Error("Not allowed by CORS"));
            }
        },
        methods: ["GET", "POST", "PUT", "DELETE"],
        allowedHeaders: [
            "Content-Type",
            "Authorization",
            "Accept-Version",
            "Cache-Control",
            "Expires",
            "Pragma",
            "x-requested-with"
        ],
        credentials: true,
        preflightContinue: false,
        maxAge: 600,
        optionsSuccessStatus: 204,
    });
};

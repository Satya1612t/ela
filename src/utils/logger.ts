import { NextFunction, Request, Response } from "express";
import winston from "winston";

// Determine environment
const isProduction = process.env.NODE_ENV === "production";

// Winston Logger Configuration
export const logger = winston.createLogger({
  level: isProduction ? "info" : "debug",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: "server" },
  transports: [
    // Console transport (clean output for dev)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ level, message, timestamp }) => {
          return `[${level}] ${timestamp} - ${message}`;
        })
      ),
    }),

    // File transports (structured logs)
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

// Request Logger Middleware
export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startHrTime = process.hrtime();

  res.on("finish", () => {
    const elapsedHrTime = process.hrtime(startHrTime);
    const elapsedMs = (elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1e6).toFixed(3);

    const logMessage = `${req.method} ${req.originalUrl} - ${res.statusCode} ${res.statusMessage || ""} - ${elapsedMs}ms | IP: ${req.ip} | UA: ${req.headers["user-agent"]} | Content-Length: ${res.get("Content-Length") || 0}`;

    const metadata = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: `${elapsedMs}ms`,
      ip: req.ip,
      // userAgent: req.headers["user-agent"],
      contentLength: res.get("Content-Length") || 0,
    };

    if (isProduction) {
      logger.info(logMessage, metadata); // Full JSON + message in file
    } else {
      logger.info(logMessage); // Clean message in console
    }
  });

  next();
};

// Error Handler Middleware
export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error({
    message: err.message,
    stack: err.stack || "",
    method: req.method,
    url: req.originalUrl,
    statusCode: err.status || 500,
    ip: req.ip,
    ...(err.error && { error: err.error.message }),
  });

  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(err.flag && { flag: err.flag }),
  });
};

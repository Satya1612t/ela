import { NextFunction, Request, Response } from "express";
import winston from "winston";

export const logger = winston.createLogger({
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.splat(),
        winston.format.json()
    ),
    defaultMeta: { service: "server" },
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            ),
        }),
        new winston.transports.File({ filename: "error.log", level: "error" }),
        new winston.transports.File({ filename: "combined.log" }),
    ],
});

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
    const startHrTime = process.hrtime();

    res.on('finish', () => {
      const elapsedHrTime = process.hrtime(startHrTime);
      const elapsedMs = (elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1e6).toFixed(3);
  
      logger.info({
        message: 'incoming request',
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        responseTime: `${elapsedMs} ms`,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        contentLength: res.get('Content-Length') || 0,
      });
    });
  
    next();
}


export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    logger.error({
        message: err.message,
        stack: err.stack || '',
        method: req.method,
        url: req.originalUrl,
        statusCode: err.status || 500,
        ip: req.ip,
        ...(err.error && { error: err.error.message }), // log nested error if provided
      });
    
      res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal Server Error',
        ...(err.flag && { flag: err.flag }),
      });
  };

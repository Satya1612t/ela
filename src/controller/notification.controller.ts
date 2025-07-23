import { Request, Response } from "express";
import { AuthRequest } from "../types/custom";
import { addDays } from 'date-fns';
import { prisma } from "../config/db";
import { getTokenFromHeader } from "../utils/lib";

export const saveFCMToken = async (req: Request, res: Response): Promise<Response | void> => {
    const { id: userId, role } = (req as AuthRequest)?.auth || {};
    const token = getTokenFromHeader(req);

    if (!token) {
        return res.status(400).json({ success: false, message: 'FCM token is required' });
    }

    if (!userId) {
        return res.status(400).json({ success: false, message: 'Account ID is missing or invalid' });
    }

    try {
        const expiredAt = addDays(new Date(), 30); // Example: expire in 30 days

        // Check if FCM token already exists for this user
        const existingToken = await prisma.token.findFirst({
            where: { userId, type: 'FCM' },
        });

        if (
            !existingToken ||
            existingToken.token !== token || // token changed
            new Date(existingToken.expiredAt) < new Date() // expired
        ) {
            const expiredAt = addDays(new Date(), 30);

            if (existingToken) {
                // Update if token changed or expired
                await prisma.token.update({
                    where: { id: existingToken.id },
                    data: { token, role, expiredAt },
                });
            } else {
                // Create new token
                await prisma.token.create({
                    data: { userId, token, role, type: 'FCM', expiredAt },
                });
            }
        }

        return res.status(201).json({
            success: true,
            message: 'Token saved successfully',
        });

    } catch (err: any) {
        console.error('Error saving FCM token:', err);

        if (err.code === 'P2002') {
            // Prisma unique constraint error
            return res.status(409).json({
                success: false,
                message: 'This token is already in use',
            });
        }

        return res.status(500).json({
            success: false,
            message: 'Internal Server Error: Unable to save FCM token',
        });
    }
}
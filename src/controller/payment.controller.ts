import { Request, Response } from "express";
import { prisma } from "../config/db";
import { AuthRequest } from "../types/custom";

export const getAllPayments = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [payments, totalCount] = await Promise.all([
      prisma.payment.findMany({
        skip,
        take: limit,
        orderBy: { paymentDate: "desc" },
        include: {
          application: {
            select: {
              ticketNo: true,
              user: { select: { fullName: true, email: true } },
            },
          },
          service: {
            select: { name: true },
          },
        },
      }),
      prisma.payment.count(),
    ]);

    return res.status(200).json({
      success: true,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      totalRecords: totalCount,
      payments,
    });
  } catch (err: any) {
    console.error("Get All Payments Error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message,
    });
  }
};


export const getUserPayments = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  const user = (req as AuthRequest).auth;

  if (!user || !user.id) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: User not authenticated",
    });
  }

  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [payments, totalCount] = await Promise.all([
      prisma.payment.findMany({
        where: {
          application: {
            userId: user.id,
          },
        },
        skip,
        take: limit,
        orderBy: { paymentDate: "desc" },
        include: {
          application: {
            select: {
              ticketNo: true,
              service: { select: { name: true } },
            },
          },
          service: { select: { name: true } },
        },
      }),
      prisma.payment.count({
        where: {
          application: {
            userId: user.id,
          },
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      totalRecords: totalCount,
      payments,
    });
  } catch (err: any) {
    console.error("Get User Payments Error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message,
    });
  }
};


export const getPaymentById = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  const user = (req as AuthRequest).auth;
  const paymentId = req.params.id;

  if (!user || !user.id) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: User not authenticated",
    });
  }

  if (!paymentId) {
    return res.status(400).json({
      success: false,
      message: "Payment ID is required in the URL",
    });
  }

  try {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        application: {
          select: {
            id: true,
            ticketNo: true,
            userId: true,
            service: { select: { name: true } },
          },
        },
        service: {
          select: {
            id: true,
            name: true,
          },
        },
        parentTransaction: {
          select: {
            id: true,
            transactionId: true,
            amount: true,
          },
        },
        refunds: {
          select: {
            id: true,
            transactionId: true,
            amount: true,
            status: true,
          },
        },
      },
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    const isOwner = payment.application.userId === user.id;
    const isAdmin = user.role === "ADMIN" || user.role === "COADMIN";

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Not authorized to access this payment",
      });
    }

    return res.status(200).json({
      success: true,
      payment,
    });
  } catch (err: any) {
    console.error("Get Payment Error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message,
    });
  }
};
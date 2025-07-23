import { Request, Response } from "express";
import { prisma } from "../config/db";
import { AuthRequest } from "../types/custom";
import PhonePe from "../services/PhonePe";
import { Prisma, PaymentType, PaymentStatus, ApplicationStatus } from "@prisma/client";
import { logger } from "../utils/logger";

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



export const phonepeCallbackForApplication = async (req: Request, res: Response) => {
  try {
    const rawBody = (req as any).rawBody;
    const authorization = req.headers['authorization'] || req.headers['Authorization'] as string;

    if (!authorization || !rawBody) {
      return res.status(400).json({ error: 'Missing authorization or raw body' });
    }

    const callbackResponse = await PhonePe.validateCallback(authorization, rawBody);
    const { merchantOrderId, paymentDetails, state } = callbackResponse.payload;
    const payment = paymentDetails?.[0];

    if (!payment) {
      return res.status(400).json({ error: 'Invalid payment data' });
    }

    const transaction = await prisma.payment.findUnique({
      where: { id: merchantOrderId },
      include: { application: true },
    });

    if (!transaction) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const splitInstrument = payment?.splitInstruments?.[0];
    const utr = payment?.transactionId;
    const gatewayFees =
      (splitInstrument as any)?.gatewayCharges?.amount ||
      (payment as any)?.gatewayCharges?.amount;

    const status =
      state === 'COMPLETED'
        ? PaymentStatus.SUCCESS
        : PaymentStatus.FAILED;

    // Update payment record
    await prisma.payment.update({
      where: { id: transaction.id },
      data: {
        paymentGatewayResponse: callbackResponse.payload as unknown as Prisma.InputJsonValue,
        status,
        transactionId: utr,
        paymentType: transaction.paymentType,
        expiresAt: new Date(callbackResponse.payload.expireAt),
      },
    });

    // Update application status
    const updatedAppStatus =
      state === 'COMPLETED'
        ? ApplicationStatus.UNDER_REVIEW
        : ApplicationStatus.PENDING;

    await prisma.application.update({
      where: { id: transaction.applicationId },
      data: {
        applicationStatus: updatedAppStatus,
      },
    });

    return res.status(200).send(
      getThankYouPage(
        state === 'COMPLETED' ? 'Payment Successful' : 'Payment Failed',
        state === 'COMPLETED'
          ? 'Your application has been successfully paid.'
          : 'Payment failed. Please try again.',
        state === 'COMPLETED'
      )
    );
  } catch (error) {
    logger.error('PhonePe Callback Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

function getThankYouPage(title: string, message: string, success: boolean) {
  const color = success ? '#2ecc71' : '#e74c3c';
  const icon = success ? '✅' : '❌';
  const bg = success ? '#f0fff0' : '#fff0f0';

  return `
    <html><head><title>${title}</title><style>
      body { background:${bg}; font-family:sans-serif; display:flex; justify-content:center; align-items:center; height:100vh; flex-direction:column; }
      h1 { font-size:2.5rem; color:${color}; }
      p { font-size:1.2rem; color:#444; }
    </style></head>
    <body>
      <h1>${icon} ${title}</h1>
      <p>${message}</p>
    </body></html>`;
}


export const getResponsePage = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    const { applicationId } = req.params;

    if (!applicationId || typeof applicationId !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing order ID',
      });
    }

    const orderResponse = await PhonePe.checkOrderStatus(applicationId);
    logger.info('OrderResponseAfterPayment:', orderResponse)
    if (!orderResponse || !orderResponse.state) {
      return res.status(502).json({
        success: false,
        message: 'Failed to fetch transaction status from payment gateway',
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Payment response fetched successfully',
      phonpeResponse: orderResponse,
    });
  } catch (error) {
    console.error('Error in getResponsePage:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};

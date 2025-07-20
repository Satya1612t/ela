import { Request, Response } from "express";
import { isUuid } from 'uuidv4'; // or use 'validator' if you're using that package
import { v4 as uuidv4 } from 'uuid';
import { prisma } from "../config/db";
import {
  applicationSchema,
  updateApplicationSchema,
  applicationUpdateSchema
} from "../zodSchema/application.schema";
import { AuthRequest } from "../types/custom";
import { Decimal } from '@prisma/client/runtime/library';
import { generateTicketNumber } from "../utils/ticketGenerator";
import PhonePe from "../services/PhonePe";
import { logger } from "../utils/logger";


export const createApplication = async (
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

  const parsed = applicationSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
    });
  }

  const { serviceId, ServiceName } = parsed.data;

  try {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
    });

    if (!service || !service.isActive) {
      return res.status(404).json({
        success: false,
        message: "Service not found or inactive",
      });
    }

    const userRecord = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!userRecord) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const ticketNo = generateTicketNumber();

    const newApplication = await prisma.application.create({
      data: {
        ticketNo,
        userId: user.id,
        serviceId,
        ServiceName: ServiceName ?? service.name,
        createdAt: new Date(),
      },
    });

    return res.status(201).json({
      success: true,
      message: "Application created successfully",
      application: newApplication,
    });
  } catch (err: any) {
    console.error("Create Application Error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message,
    });
  }
};

// Newly Added For Initiate Payment
export const initiatePayment = async (req: Request, res: Response) => {
  // const { applicationId } = req.params;
  const { paymentMethodCode, amount, applicationId, paymentType } = req.body;
  const user = (req as AuthRequest)?.auth;

  // update according to Zod
  if (!isUuid(applicationId)) {
    return res.status(400).json({ message: 'Invalid application ID format' });
  }

  if (!amount || isNaN(amount)) {
    return res.status(400).json({ message: 'Invalid or missing amount' });
  }

  try {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.userId !== user?.id && application.id !== applicationId) {
      return res.status(403).json({ message: 'Unauthorized access or Incorrect Application Details' });
    }

    const method = await prisma.paymentMethod.findUnique({
      where: { code: paymentMethodCode }
    });

    if (!method) {
      return res.status(400).json({ message: 'Invalid payment method' });
    }

    const amountInRupee = new Decimal(amount);
    const amountInPaise = amountInRupee.mul(100).toNumber();
    
    const transactionId = uuidv4(); // Secure transaction ID

    const transaction = await prisma.payment.create({
      data: {
        applicationId,
        serviceId: application.serviceId,
        paymentMethod: method.code,
        amount: amountInRupee,
        purpose: 'SERVICE_PAYMENT',
        paymentType,
        transactionId,
      }
    });

    const redirectUrl = `http://localhost:5173/payment-response?applicationId=${transactionId}`;

    const phonepeResponse: any = await PhonePe.initiatePayment(
      amountInPaise,
      transactionId,
      redirectUrl
    );

    await prisma.payment.update({
      where: { id: transaction.id }, 
      data: {
        paymentGatewayResponse: phonepeResponse,
        transactionId: phonepeResponse.orderId,
        expiresAt: new Date(phonepeResponse.expireAt)
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Payment initiated successfully',
      redirectUrl: phonepeResponse.redirectUrl
    });

  } catch (error) {
    logger.error('PhonePe Payment Initiation Error:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


export const updateApplication = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  const appId = req.params.id;
  const parsed = updateApplicationSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
    });
  }

  const { applicationStatus, objectionReason, autoCloseAt } = parsed.data;

  try {
    const existingApplication = await prisma.application.findUnique({
      where: { id: appId },
    });

    if (!existingApplication) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    const updatedApplication = await prisma.application.update({
      where: { id: appId },
      data: {
        applicationStatus,
        objectionReason,
        autoCloseAt: autoCloseAt ? new Date(autoCloseAt) : undefined,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Application updated successfully",
      application: updatedApplication,
    });
  } catch (err: any) {
    console.error("Update Application Error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};


export const deleteApplication = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  const appId = req.params.id;

  try {
    const application = await prisma.application.findUnique({
      where: { id: appId },
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    await prisma.application.delete({
      where: { id: appId },
    });

    return res.status(200).json({
      success: true,
      message: "Application deleted successfully",
    });
  } catch (err: any) {
    console.error("Delete Application Error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};


export const getApplicationById = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  const appId = req.params.id;
  const user = (req as AuthRequest).auth;

  if (!user || !user.id) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: User not found in request context",
    });
  }

  try {
    const application = await prisma.application.findUnique({
      where: { id: appId },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
            phone: true,
          },
        },
        service: {
          select: {
            name: true,
            description: true,
          },
        },
        updates: true,
        payments: true,
      },
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    if (user.role !== "ADMIN" && application.userId !== user.id) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Not authorized to view this application",
      });
    }

    return res.status(200).json({
      success: true,
      application,
    });
  } catch (err: any) {
    console.error("Get Application Error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};


export const getAllApplications = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
          service: {
            select: {
              id: true,
              name: true,
              isActive: true,
            },
          },
        },
      }),
      prisma.application.count(),
    ]);

    return res.status(200).json({
      success: true,
      message: "Applications fetched successfully",
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      totalApplications: total,
      data: applications,
    });
  } catch (err: any) {
    console.error("Get All Applications Error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message,
    });
  }
};


export const getUserApplications = async (
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

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where: {
          userId: user.id,
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          service: {
            select: {
              id: true,
              name: true,
              isActive: true,
            },
          },
        },
      }),
      prisma.application.count({
        where: {
          userId: user.id,
        },
      }),
    ]);

    return res.status(200).json({
      success: true,
      message: "User applications fetched successfully",
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      totalApplications: total,
      data: applications,
    });
  } catch (err: any) {
    console.error("Get User Applications Error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};


export const createApplicationUpdate = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  const applicationId = req.params.id;

  const parsed = applicationUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
    });
  }

  const { message } = parsed.data;

  try {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        user: true,
      },
    });

    if (!application || !application.user) {
      return res.status(404).json({
        success: false,
        message: "Application or associated user not found",
      });
    }

    const updaterName = application.user.fullName;

    const newUpdate = await prisma.applicationUpdate.create({
      data: {
        applicationId,
        updaterBy: updaterName,
        message,
        createdAt: new Date(),
      },
    });

    return res.status(201).json({
      success: true,
      message: "Update added successfully",
      update: newUpdate,
    });
  } catch (err: any) {
    console.error("Create Update Error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message,
    });
  }
};


export const getApplicationUpdates = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  const applicationId = req.params.id;
  const user = (req as AuthRequest).auth;

  if (!applicationId) {
    return res.status(400).json({
      success: false,
      message: "Application ID is required in the URL",
    });
  }

  if (!user || !user.id) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: User not authenticated",
    });
  }

  try {
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      return res.status(404).json({
        success: false,
        message: "Application not found",
      });
    }

    if (application.userId !== user.id && user.role === "USER") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: You are not authorized to view these updates",
      });
    }

    const updates = await prisma.applicationUpdate.findMany({
      where: { applicationId },
      orderBy: { createdAt: "desc" },
      include: {
        updater: {
          select: {
            id: true,
            fullName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    return res.status(200).json({
      success: true,
      message: "Application updates fetched successfully",
      updates,
    });
  } catch (err: any) {
    console.error("Get Application Updates Error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};
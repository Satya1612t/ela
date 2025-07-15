import { Request, Response } from "express";
import { prisma } from "../config/db";
import { serviceSchema, updateServiceSchema } from "../zodSchema/service.schema";
import { AuthRequest } from "../types/custom";


export const createService = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  const parsed = serviceSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
    });
  }

  const { name, note, description } = parsed.data;

  try {
    const existing = await prisma.service.findFirst({ where: { name } });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "A service with this name already exists",
      });
    }

    const service = await prisma.service.create({
      data: {
        name,
        note,
        description,
        isActive: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Service created successfully",
      service,
    });
  } catch (err: any) {
    console.error("Create Service Error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message,
    });
  }
};


export const updateService = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Service ID is required",
    });
  }

  const parsed = updateServiceSchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    });
  }

  try {
    const existingService = await prisma.service.findUnique({
      where: { id },
    });

    if (!existingService) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    const updated = await prisma.service.update({
      where: { id },
      data: {
        ...parsed.data,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Service updated successfully",
      service: updated,
    });
  } catch (err: any) {
    console.error("Update Service Error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message,
    });
  }
};


export const deleteService = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Service ID is required",
    });
  }

  try {
    const service = await prisma.service.findUnique({
      where: { id },
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    if (!service.isActive) {
      return res.status(400).json({
        success: false,
        message: "Service is already inactive",
      });
    }

    const updatedService = await prisma.service.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Service soft-deleted successfully",
      service: updatedService,
    });
  } catch (err: any) {
    console.error("Soft delete error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message,
    });
  }
};


export const getService = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  const { id } = req.params;
  const user = (req as AuthRequest).auth;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Service ID is required",
    });
  }

  try {
    const service = await prisma.service.findUnique({
      where: { id },
      include: {
        applications: true,
        payments: true,
      },
    });

    if (!service) {
      return res.status(404).json({
        success: false,
        message: "Service not found",
      });
    }

    // If user is not ADMIN or COADMIN, remove restricted fields
    if (user?.role === "USER") {
      const { id, applications, payments, ...publicService } = service;
      return res.status(200).json({
        success: true,
        service: publicService,
      });
    }

    // Admins and Coadmins get full data
    return res.status(200).json({
      success: true,
      service,
    });
  } catch (err: any) {
    console.error("Get service error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message,
    });
  }
};


export const getAllServices = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  try {
    const [services, total] = await Promise.all([
      prisma.service.findMany({
        where: { isActive: true },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.service.count({
        where: { isActive: true },
      }),
    ]);

    return res.status(200).json({
      success: true,
      page,
      totalPages: Math.ceil(total / limit),
      totalServices: total,
      services,
    });
  } catch (err: any) {
    console.error("Get all services error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message,
    });
  }
};

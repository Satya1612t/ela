import { Request, Response } from "express";
import { prisma } from "../config/db";
import { AuthRequest } from "../types/custom";
import { userQuerySchema, resolveQuerySchema } from "../zodSchema/query.schema"; 

export const createUserQuery = async (
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

  const parsed = userQuerySchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
    });
  }

  const { subject, message } = parsed.data;

  try {
    const newQuery = await prisma.userQuery.create({
      data: {
        userId: user.id,
        subject,
        message,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Query submitted successfully",
      query: newQuery,
    });
  } catch (err: any) {
    console.error("Create User Query Error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message,
    });
  }
};


export const getAllUserQueries = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const skip = (page - 1) * limit;

  try {
    const [queries, totalCount] = await Promise.all([
      prisma.userQuery.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phone: true,
            },
          },
        },
      }),
      prisma.userQuery.count(),
    ]);

    return res.status(200).json({
      success: true,
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      queries,
    });
  } catch (err: any) {
    console.error("Get All User Queries Error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message,
    });
  }
};


export const getQueryById = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Query ID is required",
    });
  }

  try {
    const query = await prisma.userQuery.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!query) {
      return res.status(404).json({
        success: false,
        message: "Query not found",
      });
    }

    return res.status(200).json({
      success: true,
      query,
    });
  } catch (err: any) {
    console.error("Get Query By ID Error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message,
    });
  }
};


export const resolveQueryById = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({
      success: false,
      message: "Query ID is required in the URL",
    });
  }

  const parsed = resolveQuerySchema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
    });
  }

  const { response: adminResponse } = parsed.data;

  try {
    const existingQuery = await prisma.userQuery.findUnique({
      where: { id },
    });

    if (!existingQuery) {
      return res.status(404).json({
        success: false,
        message: "Query not found",
      });
    }

    if (existingQuery.isResolved) {
      return res.status(400).json({
        success: false,
        message: "Query is already resolved",
      });
    }

    const updatedQuery = await prisma.userQuery.update({
      where: { id },
      data: {
        response: adminResponse,
        isResolved: true,
        resolvedAt: new Date(),
      },
    });

    return res.status(200).json({
      success: true,
      message: "Query resolved successfully",
      query: updatedQuery,
    });
  } catch (err: any) {
    console.error("Resolve Query Error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message,
    });
  }
};

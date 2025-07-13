import { Request, Response } from "express";
import { prisma } from "../config/db";
import { updateUserProfileSchema } from "../zodSchema/user.schema";
import { AuthRequest } from "../types/custom";

export const getAllUsers = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const page = parseInt(req.query.page as string) || 1;

    if (limit <= 0 || page <= 0) {
      return res.status(400).json({
        success: false,
        message: "Page and limit must be greater than 0",
      });
    }

    const skip = (page - 1) * limit;

    const [users, totalUsers] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          uid: true,
          fullName: true,
          email: true,
          phone: true,
          city: true,
          gender: true,
          dob: true,
          role: true,
          isActive: true,
          emailVerified: true,
          createdAt: true,
        },
      }),
      prisma.user.count(),
    ]);

    const totalPages = Math.ceil(totalUsers / limit);

    return res.status(200).json({
      success: true,
      data: users,
      meta: {
        totalUsers,
        totalPages,
        currentPage: page,
        limit,
      },
    });
  } catch (err: any) {
    console.error("Error in getAllUsers:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};


export const getUserById = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  const userId = req.params.id;

  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "User ID is required in the URL",
    });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        fullName: true,
        email: true,
        phone: true,
        dob: true,
        gender: true,
        role: true,
        emailVerified: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (err: any) {
    console.error("Error fetching user by ID:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};


export const updateUser = async (
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

  const parsed = updateUserProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Validation failed",
    });
  }

  const { fullName, phone, dob, gender, city } = parsed.data;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        fullName: fullName ?? existingUser.fullName,
        phone: phone ?? existingUser.phone,
        dob: dob ? new Date(dob) : existingUser.dob,
        gender: gender ?? existingUser.gender,
        city: city ?? existingUser.city,
        updatedAt: new Date(),
      },
      select: {
        fullName: true,
        email: true,
        phone: true,
        dob: true,
        gender: true,
        city: true,
      },
    });

    return res.status(200).json({
      success: true,
      message: "User profile updated successfully",
      user: updatedUser,
    });
  } catch (err: any) {
    console.error("Update user error:", err.message);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: err.message,
    });
  }
};



// export const deleteUser = async (
//   req: Request,
//   res: Response
// ): Promise<Response | void> => {
//   const userId = req.params.id;

//   if (!userId) {
//     return res.status(400).json({
//       success: false,
//       message: "User ID is required in the URL",
//     });
//   }

//   try {
//     const existingUser = await prisma.user.findUnique({
//       where: { id: userId },
//     });

//     if (!existingUser) {
//       return res.status(404).json({
//         success: false,
//         message: "User not found",
//       });
//     }

//     if (!existingUser.isActive) {
//       return res.status(400).json({
//         success: false,
//         message: "User is already deactivated",
//       });
//     }

//     const updatedUser = await prisma.user.update({
//       where: { id: userId },
//       data: {
//         isActive: false,
//         updatedAt: new Date(),
//       },
//       select: {
//         id: true,
//         fullName: true,
//         email: true,
//         phone: true,
//         isActive: true,
//         role: true,
//       },
//     });

//     return res.status(200).json({
//       success: true,
//       message: "User soft-deleted (deactivated) successfully",
//       user: updatedUser,
//     });
//   } catch (err: any) {
//     console.error("Soft delete error:", err.message);
//     return res.status(500).json({
//       success: false,
//       message: "Internal server error",
//       error: err.message,
//     });
//   }
// };
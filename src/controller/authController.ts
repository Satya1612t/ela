import { Request, Response, NextFunction } from "express";
import { prisma } from "../config/db";
import { decryptRSA, encryptRSA } from "../config/encryption";
import { firebaseAdmin, verifyFirebaseToken } from "../config/firebase";
import { formatToIndianNumber } from "../utils/lib";
import JWT from 'jsonwebtoken'
import { AuthPayload, AuthRequest } from "../types/custom";

// -- Admin Specifice Routes
//Create Admin Seed
export const createAdminFromFirebaseUser = async () => {
    try {
        const user = {
            phoneNumber: '+919876543210',
            email: 'sample@gmail.com',
            displayName: 'Sample Name',
        };

        // Step 1: Create or fetch Firebase user
        let userRecord;
        try {
            userRecord = await firebaseAdmin.auth().createUser({
                phoneNumber: user.phoneNumber,
                email: user.email,
                displayName: user.displayName,
            });
        } catch (err: any) {
            if (err.code === 'auth/phone-number-already-exists') {
                userRecord = await firebaseAdmin.auth().getUserByPhoneNumber(user.phoneNumber);
            } else if (err.code === 'auth/email-already-exists') {
                userRecord = await firebaseAdmin.auth().getUserByEmail(user.email);
            } else {
                throw new Error(`Firebase user creation failed: ${err.message}`);
            }
        }

        if (!userRecord?.uid || !userRecord?.phoneNumber) {
            throw new Error("Firebase user record is incomplete.");
        }

        const uid = userRecord.uid;
        // const token = userRecord.
        // Step 2: Check if user already exists in DB
        const existingAccount = await prisma.user.findUnique({
            where: { uid },
        });

        if (existingAccount) {
            return existingAccount;
        }

        // Step 3: Create new Account and Admin
        const newAccount = await prisma.user.create({
            data: {
                uid,
                fullName: userRecord.displayName ?? user.displayName,
                email: userRecord.email ?? user.email,
                phone: userRecord.phoneNumber,
                role: "ADMIN",
                termsAccepted: true,
                termsAcceptedAt: new Date(),
                emailVerified: userRecord.emailVerified ?? false,
                lastLogin: new Date(),
            },
        });

        console.log("Admin account created:", newAccount);
        return newAccount;

    } catch (error: any) {
        console.error("Error in createAdminFromFirebaseUser:", error);
        throw new Error(`Failed to create admin: ${error.message}`);
    }
};

//LocalHost Testing
export const localhost = async (req: Request, res: Response): Promise<Response | void> => {
    const phoneNumber = req.body.phone;
    const phone = formatToIndianNumber(phoneNumber);

    try {
        const account = await prisma.user.findFirst({
            where: {
                phone,
                // uid, // For Production
                role: { in: ["ADMIN", "COADMIN"] }, // GlobalRole enum
            },
        });

        if (!account) {
            return res.status(403).json({ success: false, error: "Unauthorized Access" });
        }

        // Step 3: Create JWT with account + admin info
        const jwtPayload = {
            domain: 'www.nexashopping.in',
            id: account.id,
            sub: account.uid,
            phone: account.phone,
            email: account.email,
            name: account.fullName,
            role: account.role,
        };

        const payload = encryptRSA(jwtPayload);

        const token = JWT.sign({ data: payload }, process.env.JWT_SECRET!, { algorithm: 'HS256', expiresIn: '1d' });
        return res.status(201).json({ success: true, token, phone });
    } catch (error: any) {
        return res.status(401).json({ error: error.message });
    }
}

// Admin Related
export const validateAdmin = async (req: Request, res: Response): Promise<Response | void> => {
    const authHeader = req.headers.authorization;
    const firebaseToken = authHeader?.split(' ')[1];

    if (!firebaseToken) {
        return res.status(401).json({ success: false, message: 'Unauthorized: No token provided' });
    }

    const phoneNumber = req.body.phone;
    const phone = formatToIndianNumber(phoneNumber);

    let uid: string | undefined;

    // For Production
    // if (!firebaseToken) {
    //   return res.status(400).json({ success: false, error: "Token is required" });
    // }

    try {
        // Step 1: Verify Firebase token and extract phone
        if (firebaseToken) {
            // Try Firebase first
            try {
                const firebaseData = await verifyFirebaseToken(firebaseToken);
                uid = firebaseData.uid;

                if (firebaseData.phone !== phone) {
                    return res.status(401).json({ success: false, error: "Phone mismatch in Firebase token" });
                }

            } catch (firebaseError) {
                // If Firebase fails, try verifying as JWT
                try {
                    const decoded: any = JWT.verify(firebaseToken, process.env.JWT_SECRET!);
                    const decrypted = decryptRSA(decoded.data);

                    if (!decrypted || decrypted.phone !== phone) {
                        return res.status(401).json({ success: false, error: "Invalid JWT token or phone mismatch" });
                    }

                    uid = decrypted.sub; // Use UID from decrypted payload
                } catch (jwtError) {
                    return res.status(401).json({ success: false, error: "Invalid token" });
                }
            }
        } else {
            // No token — reject
            return res.status(400).json({ success: false, error: "Token is required" });
        }
        // Step 2: Find account with role = ADMIN or COADMIN
        const user = await prisma.user.findFirst({
            where: {
                phone,
                // uid, // For Production
                role: { in: ["ADMIN", "COADMIN"] }, // GlobalRole enum
            }
        });

        if (!user) {
            return res.status(403).json({ success: false, error: "Unauthorized Access" });
        }

        // Step 3: Create JWT with user + admin info
        const jwtPayload = {
            domain: 'www.example.in',
            id: user.id,
            sub: user.uid,
            phone: user.phone,
            email: user.email,
            name: user.fullName,
            role: user.role,
        };

        const payload = encryptRSA(jwtPayload);

        const token = JWT.sign({ data: payload }, process.env.JWT_SECRET!, { algorithm: 'HS256', expiresIn: '1d' });
        const refreshToken = JWT.sign({ data: payload }, process.env.JWT_REFRESH_SECRET!, { algorithm: 'HS256', expiresIn: '7d' });

        // Step 4: Upsert Token
        await prisma.token.upsert({
            where: {
                token: refreshToken,
            },
            update: {},
            create: {
                userId: user.id,
                token: refreshToken,
                role: user.role,
                type: "REFRESH", // Make sure this matches your TokenType enum
                expiredAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            },
        });

        // Optional: Update last login
        const tx: any[] = [
            prisma.user.update({
                where: { id: user.id },
                data: {
                    lastLogin: new Date(),
                    loginAttempts: {
                        increment: 1
                    },
                },
            }),
        ];

        await prisma.$transaction(tx);

        // Step 5: Set cookies
        res.cookie("idToken", token, {
            // domain: 'www.example.in',
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 24 * 60 * 60 * 1000,
        });

        res.cookie("refreshToken", refreshToken, {
            // domain: 'www.example.in',
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        // Step 6: Return response
        const adminData = {
            name: user.fullName,
            phone: user.phone,
            email: user.email,
            role: user.role,
        };

        return res.status(200).json({
            success: true,
            message: "Admin login successful.",
            user: adminData,
        });

    } catch (err: any) {
        return res.status(401).json({ error: err.message });
    }
};


// User Related 
export const validateUser = async (req: Request, res: Response): Promise<Response | void> => {
    const authHeader = req.headers.authorization;
    const firebaseToken = authHeader?.split(' ')[1];

    if (!firebaseToken) {
        return res.status(401).json({ success: false, message: 'Unauthorized: No token provided' });
    }

    const phoneNumber = req.body.phone;
    const phone = formatToIndianNumber(phoneNumber);

    let uid: string | undefined;
    // For Production
    // if (!firebaseToken) {
    //   return res.status(400).json({ success: false, error: "Token is required" });
    // }

    try {
        if (firebaseToken) {
            // Try Firebase first
            try {
                const firebaseData = await verifyFirebaseToken(firebaseToken);
                uid = firebaseData.uid;

                if (firebaseData.phone !== phone) {
                    return res.status(401).json({ success: false, error: "Phone mismatch in Firebase token" });
                }

            } catch (firebaseError) {
                // If Firebase fails, try verifying as JWT
                try {
                    const decoded: any = JWT.verify(firebaseToken, process.env.JWT_SECRET!);
                    const decrypted = decryptRSA(decoded.data);

                    if (!decrypted || decrypted.phone !== phone) {
                        return res.status(401).json({ success: false, error: "Invalid JWT token or phone mismatch" });
                    }

                    uid = decrypted.sub; // Use UID from decrypted payload
                } catch (jwtError) {
                    return res.status(401).json({ success: false, error: "Invalid token" });
                }
            }
        } else {
            // No token — reject
            return res.status(400).json({ success: false, error: "Token is required" });
        }

        // Step 2: Find account with role = ADMIN or COADMIN
        const user = await prisma.user.findFirst({
            where: {
                phone,
                ...(uid ? { uid } : {}),
                role: 'USER', // GlobalRole enum
            }
        });

        if (!user) {
            return res.status(403).json({ success: false, message: "No user found" });
        }

        // Step 3: Create JWT with user + distributor info
        const jwtPayload = {
            domain: 'www.example.in',
            id: user.id,
            sub: user.uid,
            phone: user.phone,
            email: user.email,
            name: user.fullName,
            role: user.role,
        };

        const payload = encryptRSA(jwtPayload);

        const token = JWT.sign({ data: payload }, process.env.JWT_SECRET!, { algorithm: 'HS256', expiresIn: '1d' });
        const refreshToken = JWT.sign({ data: payload }, process.env.JWT_REFRESH_SECRET!, { algorithm: 'HS256', expiresIn: '7d' });

        // Step 4: Upsert Token
        await prisma.token.upsert({
            where: {
                token: refreshToken,
            },
            update: {},
            create: {
                userId: user.id,
                token: refreshToken,
                role: user.role,
                type: "REFRESH", // Make sure this matches your TokenType enum
                expiredAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
            },
        });

        // Optional: Update last login
        const tx: any[] = [
            prisma.user.update({
                where: { id: user.id },
                data: {
                    lastLogin: new Date(),
                    loginAttempts: {
                        increment: 1
                    },
                },
            }),
        ];

        await prisma.$transaction(tx);
        
        // Step 5: Set cookies
        res.cookie("idToken", token, {
            // domain: 'www.example.in',
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 24 * 60 * 60 * 1000,
        });

        res.cookie("refreshToken", refreshToken, {
            // domain: 'www.example.in',
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        const data = {
            name: user.fullName,
            phone: user.phone,
            email: user.email,
            role: user.role,
        };

        return res.status(200).json({
            success: true,
            message: "User login successful.",
            user: data,
        });

    } catch (err: any) {
        return res.status(401).json({ error: err.message });
    }
};

// Validate Session
export const authSession = async (req: Request, res: Response): Promise<Response | void> => {
  const user = (req as AuthRequest)?.auth;

  if (!user || !user.id || !user.role) {
    return res.status(401).json({
      success: false,
      error: "Invalid session or token payload",
    });
  }

  return res.status(200).json({
    success: true,
    message: "Verified",
    user: {
      email: user.email,
      phone: user.phone,
      role: user.role,
      name: user.name
    },
  });
};


// Logging Out
export const logout = async (req: Request, res: Response): Promise<Response | void> => {
  try {
    // Step 1: Clear cookies
    res.clearCookie("idToken", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    res.clearCookie("refreshToken", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
    });

    // Step 2: Get userId or any identifier from the authenticated user (e.g., from the JWT token)
    const userId = (req as AuthRequest)?.auth?.id;

    if (!userId) {
      return res.status(400).json({ message: "Account ID not found." });
    }

    // Step 3: If no refresh token is present in the cookies, delete the refresh token based on userId
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      // Delete refresh token from the database using userId
      await prisma.token.deleteMany({
        where: {
          userId: userId, // Use userId to identify the token to delete
        },
      });
    } else {
      // If refresh token is present in the cookies, delete the token using its value
      await prisma.token.deleteMany({
        where: {
          token: refreshToken,
        },
      });
    }

    return res.status(200).json({ message: "Logged out successfully." });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      error: err.message,
    });
  }
};

//Refresh Session
export const refreshSession = async (req: Request, res: Response): Promise<Response | void> => {
  const oldRefreshToken = req.cookies?.refreshToken;

  if (!oldRefreshToken) {
    return res.status(401).json({ success: false, error: "Refresh token missing" });
  }

  try {
    // Step 1: Verify old refresh token
    const decoded = JWT.verify(oldRefreshToken, process.env.JWT_REFRESH_SECRET!) as { data: string };
    if (!decoded?.data) {
      return res.status(401).json({ success: false, error: "Invalid token payload" });
    }

    const payload = decryptRSA(decoded.data) as AuthPayload;

    // Step 2: Find token in DB
    const existingToken = await prisma.token.findUnique({
      where: { token: oldRefreshToken },
      include: { user: true },
    });


    if (!existingToken || new Date(existingToken.expiredAt) < new Date()) {
      return res.status(401).json({ success: false, error: "Refresh token is invalid or expired" });
    }

    if (payload.id !== existingToken?.userId) {
      return res.status(401).json({ success: false, error: "Token account mismatch" });
    }
    // Step 3: Rotate tokens – generate new access and refresh tokens
    const jwtPayload = {
      domain: 'www.nexashopping.in',
      id: existingToken.userId,
      sub: existingToken.user.uid,
      phone: existingToken.user.phone,
      email: existingToken.user.email,
      name: existingToken.user.fullName,
      role: existingToken.role,
    };

    const encryptedPayload = encryptRSA(jwtPayload);

    const newIdToken = JWT.sign({ data: encryptedPayload }, process.env.JWT_SECRET!, {
      algorithm: 'HS256',
      expiresIn: '1d',
    });

    const newRefreshToken = JWT.sign({ data: encryptedPayload }, process.env.JWT_REFRESH_SECRET!, {
      algorithm: 'HS256',
      expiresIn: '7d',
    });

    const expiredAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Step 4: Transaction to delete old token and insert new one
    await prisma.$transaction([
      prisma.token.delete({
        where: { token: oldRefreshToken },
      }),
      prisma.token.create({
        data: {
          userId: existingToken.userId,
          token: newRefreshToken,
          role: existingToken.role,
          type: "REFRESH",
          expiredAt,
        },
      }),
    ]);

    // Step 5: Set cookies
    res.cookie("idToken", newIdToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.cookie("refreshToken", newRefreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Step 6: Return response
    return res.status(200).json({
      success: true,
      message: "Session refreshed successfully",
      user: {
        name: existingToken.user.fullName,
        phone: existingToken.user.phone,
        email: existingToken.user.email,
        role: existingToken.role,
      },
    });

  } catch (err: any) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, error: "Refresh token expired. Please login again." });
    }
    console.error("Refresh session error:", err.message);
    return res.status(401).json({ success: false, error: "Invalid or corrupted refresh token" });
  }
};

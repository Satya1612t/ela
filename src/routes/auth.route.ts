import express from "express";
import { asyncHandler } from "../utils/lib";
import {
  authSession,
  localhost,
  logout,
  refreshSession,
  validateAdmin,
  validateUser,
  userRegister,
//   getUserProfile,
//   updateUserProfile,
  registerCoadmin,
} from "../controller/auth.controller";
import { authenticate } from "../middleware/authMiddleware";
import { authorize } from "../middleware/authorize";

const authRouter = express.Router();

authRouter.post('/validate', asyncHandler(localhost));

authRouter.post('/admin/login', asyncHandler(validateAdmin));
authRouter.post('/user/login', asyncHandler(validateUser));

authRouter.post('/refresh', asyncHandler(refreshSession));
authRouter.post("/user/register", asyncHandler(userRegister));

authRouter.use(authenticate);

authRouter.get('/session', asyncHandler(authSession));


// --- Profile Related
// authRouter.get("/user/get-profile", asyncHandler(getUserProfile));
// authRouter.put("/user/update-profile", asyncHandler(updateUserProfile));

// --- Admin Related

// --- CoAdmin Related
authRouter.use(authorize("ADMIN"));
authRouter.post("/coadmin/register", asyncHandler(registerCoadmin));

authRouter.post('/logout', asyncHandler(logout));

export default authRouter;

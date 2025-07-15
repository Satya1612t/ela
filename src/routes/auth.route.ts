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

const router = express.Router();

router.post('/validate', asyncHandler(localhost));

router.post('/admin/login', asyncHandler(validateAdmin));
router.post('/user/login', asyncHandler(validateUser));

router.post('/refresh', asyncHandler(refreshSession));

router.use(authenticate);

router.get('/session', asyncHandler(authSession));


// --- Profile Related
router.post("/user/register", asyncHandler(userRegister));
// router.get("/user/get-profile", asyncHandler(getUserProfile));
// router.put("/user/update-profile", asyncHandler(updateUserProfile));

// --- Admin Related

// --- CoAdmin Related
router.use(authorize("ADMIN"));
router.post("/coadmin/register", asyncHandler(registerCoadmin));

router.post('/logout', asyncHandler(logout));

export default router;

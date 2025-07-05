import express from "express";
import { asyncHandler } from "../utils/lib";
import { authSession, localhost, logout, refreshSession, validateAdmin, validateUser } from "../controller/authController";
import { authenticate } from "../middleware/authMiddleware";

const router = express.Router();

router.post('/validate', asyncHandler(localhost));

router.post('/admin/login', asyncHandler(validateAdmin));
router.post('/user/login', asyncHandler(validateUser));

router.post('/refresh', asyncHandler(refreshSession));

router.use(authenticate);

router.get('/session', asyncHandler(authSession));


// --- Profile Related

// --- Admin Related

// --- CoAdmin Related

router.post('/logout', asyncHandler(logout));

export default router;

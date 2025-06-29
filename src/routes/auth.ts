import express from "express";
import { asyncHandler } from "../utils/lib";
import { localhost, validateAdmin, validateUser } from "../controller/authController";

const router = express.Router();

router.post('/validate', asyncHandler(localhost));

router.post('/admin/login', asyncHandler(validateAdmin));

router.post('/user/login', asyncHandler(validateUser));

export default router;

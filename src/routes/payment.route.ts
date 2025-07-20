import express from "express";
import { asyncHandler } from "../utils/lib";
import { authenticate } from "../middleware/authMiddleware";
import { authorize } from "../middleware/authorize";
import { getAllPayments, getPaymentById, getUserPayments, getResponsePage } from "../controller/payment.controller";

const router = express.Router();

router.use(authenticate);
router.get("/payments/user", asyncHandler(getUserPayments));

router.get("/payment/:id", asyncHandler(getPaymentById));

router.get('/payment/response', asyncHandler(getResponsePage));

router.use(authorize("ADMIN","COADMIN"));
router.get("/payment/allpayments", asyncHandler(getAllPayments));


export default router;

import express from "express";
import { asyncHandler } from "../utils/lib";
import { authenticate } from "../middleware/authMiddleware";
import { authorize } from "../middleware/authorize";
import { createApplication, initiatePayment, createApplicationUpdate, deleteApplication, getAllApplications, getApplicationById, getApplicationUpdates, getUserApplications, updateApplication } from "../controller/application.controller";

const router = express.Router();

router.use(authenticate);
router.post("/application/create", asyncHandler(createApplication));
router.post('/application/pay', asyncHandler(initiatePayment));
router.get("/application/:id", asyncHandler(getApplicationById));
router.get("/application/user-applications", asyncHandler(getUserApplications));
router.get("/application/getupdates/:id", asyncHandler(getApplicationUpdates));



router.use(authorize("ADMIN","COADMIN"));


router.put("/application/:id", asyncHandler(updateApplication));
router.delete("/application/:id", asyncHandler(deleteApplication));
router.get("/application/all-applications", asyncHandler(getAllApplications));
router.post("/application/updates/:id", asyncHandler(createApplicationUpdate));


export default router;

import express from "express";
import { asyncHandler } from "../utils/lib";
import { authenticate } from "../middleware/authMiddleware";
import { authorize } from "../middleware/authorize";
import {
  createService,
  updateService,
  deleteService,
  getService,
  getAllServices,
} from "../controller/service.controller";

const router = express.Router();

router.use(authenticate);
router.get("/service/:id", asyncHandler(getService));
router.get("/services", asyncHandler(getAllServices));

router.use(authorize("ADMIN","COADMIN"));
router.post("/service/create", asyncHandler(createService));
router.put("/service/:id", asyncHandler(updateService));
router.delete("/service/:id", asyncHandler(deleteService));


export default router;

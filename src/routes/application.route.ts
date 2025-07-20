import express from "express";
import { asyncHandler } from "../utils/lib";
import { authenticate } from "../middleware/authMiddleware";
import { authorize } from "../middleware/authorize";
import { createApplication, createApplicationUpdate, deleteApplication, getAllApplications, getApplicationById, getApplicationUpdates, getUserApplications, updateApplication } from "../controller/application.controller";

const applicationRouter = express.Router();

applicationRouter.use(authenticate);
applicationRouter.post("/create", asyncHandler(createApplication));
applicationRouter.get("/userapplications", asyncHandler(getUserApplications));
applicationRouter.get("/getapplication/:id", asyncHandler(getApplicationById));
applicationRouter.get("/updates/:id", asyncHandler(getApplicationUpdates));

applicationRouter.use(authorize("ADMIN","COADMIN"));
applicationRouter.get("/allapplications", asyncHandler(getAllApplications));
applicationRouter.put("/updateapplication/:id", asyncHandler(updateApplication));
applicationRouter.delete("/deleteapplication/:id", asyncHandler(deleteApplication));
applicationRouter.post("/updates/:id", asyncHandler(createApplicationUpdate));


export default applicationRouter;

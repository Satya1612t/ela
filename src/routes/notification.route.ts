import express from "express";
import { asyncHandler } from "../utils/lib";
import { authenticate } from "../middleware/authMiddleware";
import { saveFCMToken } from "../controller/notification.controller";

const notificationRouter = express.Router();

notificationRouter.use(authenticate);

notificationRouter.post('/save-token', asyncHandler(saveFCMToken));

export default notificationRouter;

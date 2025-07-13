import express from "express";
import { asyncHandler } from "../utils/lib";

import { authenticate } from "../middleware/authMiddleware";
import { authorize } from "../middleware/authorize";
import { getAllUsers, getUserById, updateUser } from "../controller/user.controller";

const router = express.Router();

router.use(authenticate);
router.put("/user/update", asyncHandler(updateUser));
// router.delete("/user/:id", asyncHandler(deleteUser));

router.use(authorize("ADMIN","COADMIN"));
router.get("/user/getallusers", asyncHandler(getAllUsers));
router.get("/user/:id", asyncHandler(getUserById));

export default router;

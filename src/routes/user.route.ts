import express from "express";
import { asyncHandler } from "../utils/lib";

import { authenticate } from "../middleware/authMiddleware";
import { authorize } from "../middleware/authorize";
import { getAllUsers, getUserById, updateUser } from "../controller/user.controller";

const userRouter = express.Router();

userRouter.use(authenticate);
userRouter.put("/update", asyncHandler(updateUser));
// userRouter.delete("/user/:id", asyncHandler(deleteUser));

userRouter.use(authorize("ADMIN","COADMIN"));
userRouter.get("/getallusers", asyncHandler(getAllUsers));
userRouter.get("/:id", asyncHandler(getUserById));

export default userRouter;

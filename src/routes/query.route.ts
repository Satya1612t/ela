import express from "express";
import { asyncHandler } from "../utils/lib";
import { authenticate } from "../middleware/authMiddleware";
import { authorize } from "../middleware/authorize";
import { createUserQuery, getAllUserQueries, getQueryById, resolveQueryById } from "../controller/query.controller";

const queryRouter = express.Router();

queryRouter.use(authenticate);
queryRouter.post("/postquery", asyncHandler(createUserQuery));

queryRouter.use(authorize("ADMIN","COADMIN"));
queryRouter.get("/allqueries", asyncHandler(getAllUserQueries));
queryRouter.get("/:id", asyncHandler(getQueryById));
queryRouter.put("/resolve/:id", asyncHandler(resolveQueryById))

export default queryRouter;

import express from "express";
import { asyncHandler } from "../utils/lib";
import { authenticate } from "../middleware/authMiddleware";
import { authorize } from "../middleware/authorize";
import { createUserQuery, getAllUserQueries, getQueryById, resolveQueryById } from "../controller/query.controller";

const router = express.Router();

router.use(authenticate);
router.post("/query/postquery", asyncHandler(createUserQuery));

router.use(authorize("ADMIN","COADMIN"));
router.get("/query/allqueries", asyncHandler(getAllUserQueries));
router.get("/query/:id", asyncHandler(getQueryById));
router.put("/query/resolve/:id", asyncHandler(resolveQueryById))

export default router;

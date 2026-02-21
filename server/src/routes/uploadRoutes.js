import express from "express";
import { protectRoute } from "../middlewares/authMiddleware.js";
import { orgMiddleware } from "../middlewares/organizationMiddleware.js";
import { ingestUploadedInvoice } from "../controllers/uploadController.js";
const router = express.Router();

router.post("/ingest", protectRoute, orgMiddleware, ingestUploadedInvoice);
export default router;

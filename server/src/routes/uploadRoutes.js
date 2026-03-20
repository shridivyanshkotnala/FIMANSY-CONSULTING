import express from "express";
import { protectRoute } from "../middlewares/authMiddleware.js";
import { orgMiddleware } from "../middlewares/organizationMiddleware.js";
import { ingestUploadedInvoice } from "../controllers/uploadController.js";
import {
	initCompanyDocumentUpload,
	completeCompanyDocumentUpload,
	listOrganizationCompanyDocuments,
} from "../controllers/companyDocumentController.js";
const router = express.Router();

router.post("/ingest", protectRoute, orgMiddleware, ingestUploadedInvoice);
router.post("/company-documents/init-upload", protectRoute, orgMiddleware, initCompanyDocumentUpload);
router.post("/company-documents/complete-upload", protectRoute, orgMiddleware, completeCompanyDocumentUpload);
router.get("/company-documents", protectRoute, orgMiddleware, listOrganizationCompanyDocuments);
export default router;

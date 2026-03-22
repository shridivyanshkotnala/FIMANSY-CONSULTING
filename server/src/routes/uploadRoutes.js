import express from "express";
import { protectRoute } from "../middlewares/authMiddleware.js";
import { orgMiddleware } from "../middlewares/organizationMiddleware.js";
import { ingestUploadedInvoice, initInvoiceUpload } from "../controllers/uploadController.js";
import {
  initCompanyDocumentUpload,
  completeCompanyDocumentUpload,
  listOrganizationCompanyDocuments,
} from "../controllers/companyDocumentController.js";
import {
  getOrganizationFinancialReportAccessUrl,
  listOrganizationFinancialReports,
} from "../controllers/financialReportsController.js";

const router = express.Router();

router.post("/invoice/init-upload", protectRoute, orgMiddleware, initInvoiceUpload);
router.post("/ingest", protectRoute, orgMiddleware, ingestUploadedInvoice);
router.post("/company-documents/init-upload", protectRoute, orgMiddleware, initCompanyDocumentUpload);
router.post("/company-documents/complete-upload", protectRoute, orgMiddleware, completeCompanyDocumentUpload);
router.get("/company-documents", protectRoute, orgMiddleware, listOrganizationCompanyDocuments);
router.get("/financial-reports", protectRoute, orgMiddleware, listOrganizationFinancialReports);
router.get("/financial-reports/:reportId/view-url", protectRoute, orgMiddleware, getOrganizationFinancialReportAccessUrl);

export default router;

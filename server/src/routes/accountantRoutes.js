import express from "express";
import { getDashboardMetrics, getOrganizationsSummary } from "../controllers/accountant/accountantController.js";
import { getOrganizationSummary } from "../controllers/accountant/accountantOrgDetailController.js";
import { getOrganizationTickets, getOrganizationCompany } from "../controllers/accountant/accountantOrgDetailController.js";
import {
  getOrganizationReconciliationQueries,
  resolveOrganizationReconciliationQueryController,
} from "../controllers/accountant/accountantOrgDetailController.js";
import {
  getComplianceRequests,
  getComplianceRequestDetail,
  getTicketComments,
  markTicketAsRead,
  postComment,
  getTicketMeta,
  updateTicketStatus,
  getTicketStatusHistory,
} from "../controllers/accountant/complianceRequestController.js";
import { protectRoute } from "../middlewares/authMiddleware.js";
import { isAdmin } from "../middlewares/isAdminMiddleware.js";
import { getOrgDirectors } from "../controllers/accountant/accountantOrgDetailController.js";
import {
  listComplianceTemplates,
  listAllOrganizations,
  createTicket,
} from "../controllers/accountant/ticketCreationController.js";
import { getFinalVerifiedDocumentsReport } from "../controllers/accountant/complianceReportController.js";
import {
  initTicketDocumentUpload,
  completeTicketDocumentUpload,
  listTicketDocuments,
  markTicketDocumentFinalVerified,
} from "../controllers/accountant/complianceDocumentController.js";
import {
  initAccountantCompanyDocumentUpload,
  completeAccountantCompanyDocumentUpload,
  listAccountantOrganizationCompanyDocuments,
} from "../controllers/companyDocumentController.js";
import {
  completeAccountantFinancialReportUpload,
  getAccountantFinancialReportAccessUrl,
  initAccountantFinancialReportUpload,
  listAccountantOrganizationFinancialReports,
} from "../controllers/financialReportsController.js";

const accountantRoutes = express.Router();

accountantRoutes.get("/dashboard-metrics", protectRoute, isAdmin, getDashboardMetrics);
accountantRoutes.get("/organizations", protectRoute, isAdmin, getOrganizationsSummary);

accountantRoutes.get("/organizations/:orgId/summary", protectRoute, isAdmin, getOrganizationSummary);
accountantRoutes.get("/organizations/:orgId/tickets", protectRoute, isAdmin, getOrganizationTickets);
accountantRoutes.get("/organizations/:orgId/company", protectRoute, isAdmin, getOrganizationCompany);
accountantRoutes.get(
  "/organizations/:orgId/reconciliation-queries",
  protectRoute,
  isAdmin,
  getOrganizationReconciliationQueries
);
accountantRoutes.patch(
  "/organizations/:orgId/reconciliation-queries/:queryId/resolve",
  protectRoute,
  isAdmin,
  resolveOrganizationReconciliationQueryController
);

accountantRoutes.get("/compliance-requests", protectRoute, isAdmin, getComplianceRequests);
accountantRoutes.get("/reports/final-verified-documents", protectRoute, isAdmin, getFinalVerifiedDocumentsReport);
accountantRoutes.get("/compliance-requests/:ticketId", protectRoute, isAdmin, getComplianceRequestDetail);
accountantRoutes.get("/compliance-requests/:ticketId/comments", protectRoute, isAdmin, getTicketComments);
accountantRoutes.patch("/compliance-requests/:ticketId/mark-read", protectRoute, isAdmin, markTicketAsRead);
accountantRoutes.post("/compliance-requests/:ticketId/comments", protectRoute, isAdmin, postComment);
accountantRoutes.get("/compliance-requests/:ticketId/meta", protectRoute, isAdmin, getTicketMeta);
accountantRoutes.patch("/compliance-requests/:ticketId/status", protectRoute, isAdmin, updateTicketStatus);
accountantRoutes.get("/compliance-requests/:ticketId/status-history", protectRoute, isAdmin, getTicketStatusHistory);
accountantRoutes.post("/compliance-requests/:ticketId/documents/init-upload", protectRoute, isAdmin, initTicketDocumentUpload);
accountantRoutes.post("/compliance-requests/:ticketId/documents/complete-upload", protectRoute, isAdmin, completeTicketDocumentUpload);
accountantRoutes.get("/compliance-requests/:ticketId/documents", protectRoute, isAdmin, listTicketDocuments);
accountantRoutes.patch("/compliance-requests/:ticketId/documents/:documentId/mark-final-verified", protectRoute, isAdmin, markTicketDocumentFinalVerified);
accountantRoutes.get("/organizations/:orgId/directors", protectRoute, isAdmin, getOrgDirectors);
accountantRoutes.get("/organizations/:orgId/company-documents", protectRoute, isAdmin, listAccountantOrganizationCompanyDocuments);
accountantRoutes.post("/organizations/:orgId/company-documents/init-upload", protectRoute, isAdmin, initAccountantCompanyDocumentUpload);
accountantRoutes.post("/organizations/:orgId/company-documents/complete-upload", protectRoute, isAdmin, completeAccountantCompanyDocumentUpload);
accountantRoutes.get("/organizations/:orgId/financial-reports", protectRoute, isAdmin, listAccountantOrganizationFinancialReports);
accountantRoutes.get("/organizations/:orgId/financial-reports/:reportId/view-url", protectRoute, isAdmin, getAccountantFinancialReportAccessUrl);
accountantRoutes.post("/organizations/:orgId/financial-reports/init-upload", protectRoute, isAdmin, initAccountantFinancialReportUpload);
accountantRoutes.post("/organizations/:orgId/financial-reports/complete-upload", protectRoute, isAdmin, completeAccountantFinancialReportUpload);

accountantRoutes.get("/compliance-templates", protectRoute, isAdmin, listComplianceTemplates);
accountantRoutes.get("/all-organizations", protectRoute, isAdmin, listAllOrganizations);
accountantRoutes.post("/compliance-requests/create", protectRoute, isAdmin, createTicket);

export default accountantRoutes;

// routes/accountant.routes.js
import express from "express";
import { getDashboardMetrics, getOrganizationsSummary } from "../controllers/accountant/accountantController.js";
import { getOrganizationSummary } from "../controllers/accountant/accountantOrgDetailController.js";
import { getOrganizationTickets, getOrganizationCompany } from "../controllers/accountant/accountantOrgDetailController.js";
import {
  getOrganizationReconciliationQueries,
  resolveOrganizationReconciliationQueryController,
} from "../controllers/accountant/accountantOrgDetailController.js";
import { getComplianceRequests } from "../controllers/accountant/complianceRequestController.js";
import { protectRoute } from "../middlewares/authMiddleware.js";
import { isAdmin } from "../middlewares/isAdminMiddleware.js";
import { getComplianceRequestDetail } from "../controllers/accountant/complianceRequestController.js";
import { getTicketComments } from "../controllers/accountant/complianceRequestController.js";
import { markTicketAsRead } from "../controllers/accountant/complianceRequestController.js";
import { postComment } from "../controllers/accountant/complianceRequestController.js";
import { getTicketMeta } from "../controllers/accountant/complianceRequestController.js";
import { updateTicketStatus } from "../controllers/accountant/complianceRequestController.js";
import { getTicketStatusHistory } from "../controllers/accountant/complianceRequestController.js";
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


const accountantRoutes = express.Router();


//All organizations summary and dashboard metrics
accountantRoutes.get("/dashboard-metrics",protectRoute, isAdmin, getDashboardMetrics);
accountantRoutes.get("/organizations", protectRoute, isAdmin, getOrganizationsSummary);

//Organization Detail Routes
accountantRoutes.get("/organizations/:orgId/summary", protectRoute, isAdmin, getOrganizationSummary);
/*
{
  "organization_id": "65f...",
  "organization_name": "Stratzi Pvt Ltd",
  "cin": "U12345MH2020PTC123456",
  "total_active": 3,
  "overdue_count": 1,
  "upcoming_7d": 1,
  "pending_docs_count": 1,
  "filed_count": 2,
  "closed_count": 4,
  "health_score": 72,
  "health_status": "attention",
  "assigned_since": "2026-01-10T08:00:00Z",
  "last_activity": "2026-02-28T09:45:00Z"
}
*/



accountantRoutes.get(
  "/organizations/:orgId/tickets",
    protectRoute,
    isAdmin,
  getOrganizationTickets
);

accountantRoutes.get(
  "/organizations/:orgId/company",
    protectRoute,
    isAdmin,
  getOrganizationCompany
);

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


//tickets 
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

// ─── Manual Ticket Creation ───────────────────────────────────────────────
// Fetch dropdown data
accountantRoutes.get("/compliance-templates",  protectRoute, isAdmin, listComplianceTemplates);
accountantRoutes.get("/all-organizations",     protectRoute, isAdmin, listAllOrganizations);
// Create a manual ticket
accountantRoutes.post("/compliance-requests/create", protectRoute, isAdmin, createTicket);


export default accountantRoutes;
// routes/accountant.routes.js
import express from "express";
import { getDashboardMetrics, getOrganizationsSummary } from "../controllers/accountant/accountantController.js";
import { getOrganizationSummary } from "../controllers/accountant/accountantOrgDetailController.js";
import { getOrganizationTickets, getOrganizationCompany } from "../controllers/accountant/accountantOrgDetailController.js";
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


//tickets 
accountantRoutes.get("/compliance-requests", protectRoute, isAdmin, getComplianceRequests);
accountantRoutes.get("/compliance-requests/:ticketId", protectRoute, isAdmin, getComplianceRequestDetail);
accountantRoutes.get("/compliance-requests/:ticketId/comments", protectRoute, isAdmin, getTicketComments);
accountantRoutes.patch("/compliance-requests/:ticketId/mark-read", protectRoute, isAdmin, markTicketAsRead);
accountantRoutes.post("/compliance-requests/:ticketId/comments", protectRoute, isAdmin, postComment);
accountantRoutes.get("/compliance-requests/:ticketId/meta", protectRoute, isAdmin, getTicketMeta);
accountantRoutes.patch("/compliance-requests/:ticketId/status", protectRoute, isAdmin, updateTicketStatus);
accountantRoutes.get("/compliance-requests/:ticketId/status-history", protectRoute, isAdmin, getTicketStatusHistory);
accountantRoutes.get("/organizations/:orgId/directors", protectRoute, isAdmin, getOrgDirectors);

// ─── Manual Ticket Creation ───────────────────────────────────────────────
// Fetch dropdown data
accountantRoutes.get("/compliance-templates",  protectRoute, isAdmin, listComplianceTemplates);
accountantRoutes.get("/all-organizations",     protectRoute, isAdmin, listAllOrganizations);
// Create a manual ticket
accountantRoutes.post("/compliance-requests/create", protectRoute, isAdmin, createTicket);


export default accountantRoutes;
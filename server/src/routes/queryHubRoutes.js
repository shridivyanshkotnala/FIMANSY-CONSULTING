import express from "express";
import { protectRoute } from "../middlewares/authMiddleware.js";
import { orgMiddleware } from "../middlewares/organizationMiddleware.js";
import {
  getClientQueryHubStats,
  getClientQueryHubTickets,
  createClientQueryHubTicket,
  getClientQueryHubTicketDetail,
  getClientQueryHubComments,
  postClientQueryHubComment,
  initClientQueryHubDocumentUpload,
  completeClientQueryHubDocumentUpload,
  listClientQueryHubDocuments,
} from "../controllers/queryHub/queryHubController.js";

const queryHubRoutes = express.Router();

queryHubRoutes.get("/stats", protectRoute, orgMiddleware, getClientQueryHubStats);
queryHubRoutes.get("/tickets", protectRoute, orgMiddleware, getClientQueryHubTickets);
queryHubRoutes.post("/tickets", protectRoute, orgMiddleware, createClientQueryHubTicket);
queryHubRoutes.get("/tickets/:ticketId", protectRoute, orgMiddleware, getClientQueryHubTicketDetail);
queryHubRoutes.get("/tickets/:ticketId/comments", protectRoute, orgMiddleware, getClientQueryHubComments);
queryHubRoutes.post("/tickets/:ticketId/comments", protectRoute, orgMiddleware, postClientQueryHubComment);
queryHubRoutes.post("/tickets/:ticketId/documents/init-upload", protectRoute, orgMiddleware, initClientQueryHubDocumentUpload);
queryHubRoutes.post("/tickets/:ticketId/documents/complete-upload", protectRoute, orgMiddleware, completeClientQueryHubDocumentUpload);
queryHubRoutes.get("/tickets/:ticketId/documents", protectRoute, orgMiddleware, listClientQueryHubDocuments);

export default queryHubRoutes;

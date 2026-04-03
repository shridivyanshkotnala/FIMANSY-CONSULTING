import express from "express";
import {
	connectZoho,
	zohoCallback,
	getZohoStatus,
	getZohoOauthOrganizations,
	selectZohoOrganization,
} from "../controllers/zohoController.js";
import { protectRoute } from "../middlewares/authMiddleware.js";
import { orgMiddleware } from "../middlewares/organizationMiddleware.js";

// ----------------   Zoho Route  -------------------- //
const zohoRoutes = express.Router();

zohoRoutes.get("/connect", protectRoute, orgMiddleware, connectZoho);
zohoRoutes.get("/callback", zohoCallback);
zohoRoutes.get("/status", protectRoute, orgMiddleware, getZohoStatus);
zohoRoutes.get("/oauth/session/:sessionId/organizations", protectRoute, getZohoOauthOrganizations);
zohoRoutes.post("/oauth/select-organization", protectRoute, selectZohoOrganization);

export default zohoRoutes;
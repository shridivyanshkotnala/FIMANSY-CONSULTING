import express from "express";
import { connectZoho, zohoCallback, getZohoStatus } from "../controllers/zohoController.js";
import { protectRoute } from "../middlewares/authMiddleware.js";
import { orgMiddleware } from "../middlewares/organizationMiddleware.js";

// ----------------   Zoho Route  -------------------- //
const zohoRoutes = express.Router();

zohoRoutes.get("/connect", protectRoute, orgMiddleware, connectZoho);
zohoRoutes.get("/callback", zohoCallback);
zohoRoutes.get("/status", protectRoute, orgMiddleware, getZohoStatus);

export default zohoRoutes;
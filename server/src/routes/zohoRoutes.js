import express from "express";
import { connectZoho, zohoCallback } from "../controllers/zohoController.js";
import { protectRoute } from "../middlewares/authMiddleware.js";
import { getZohoStatus } from "../controllers/zohoController.js";

// ----------------   Zoho Route  -------------------- //
const zohoRoutes = express.Router();

zohoRoutes.get("/connect",protectRoute, connectZoho);
zohoRoutes.get("/callback", zohoCallback);
zohoRoutes.get("/status", protectRoute, getZohoStatus);

export default zohoRoutes;
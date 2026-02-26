import express from 'express';
import { fetchAgingAlerts } from '../controllers/agingController.js';
import { protectRoute } from '../middlewares/authMiddleware.js';
import { orgMiddleware } from '../middlewares/organizationMiddleware.js';
import { fetchAgingDashboard } from '../controllers/agingController.js';
import { getDSOData } from "../controllers/cashIntelligenceController.js";

const cashIntelligenceRoutes = express.Router();

cashIntelligenceRoutes.get("/aging-alerts", protectRoute, orgMiddleware, fetchAgingAlerts);
cashIntelligenceRoutes.get("/aging-buckets", protectRoute, orgMiddleware, fetchAgingDashboard);

cashIntelligenceRoutes.get("/dso", protectRoute, orgMiddleware, getDSOData);

export default cashIntelligenceRoutes;
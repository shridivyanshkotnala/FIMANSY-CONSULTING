import express from "express";

import { getAllTemplates,generateFY,
  getCalendarObligations } from "../controllers/complianceTemplate.controller.js";

const complianceRoutes = express.Router();

complianceRoutes.get("/", getAllTemplates);

complianceRoutes.post("/generate-fy", generateFY);
complianceRoutes.get("/calendar", getCalendarObligations);
//complianceRoutes.get("/dashboard-summary", getDashboardSummary);
//complianceRoutes.post("/complete", markCompleted);
//complianceRoutes.post("/ignore", ignoreObligation);

export default complianceRoutes;
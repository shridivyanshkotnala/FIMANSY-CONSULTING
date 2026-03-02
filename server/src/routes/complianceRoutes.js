import express from "express";

import { getAllTemplates, //generateFy getCalendarObligations 
  } from "../controllers/compliance/complianceTemplate.controller.js";
import { protectRoute } from "../middlewares/authMiddleware.js";
import { 
  createCompanyProfile, 
  getCompanyProfile, 
  updateCompanyProfile, 
  getOnboardingStatus 
} from "../controllers/compliance/complianceOnboarding.controller.js";

const complianceRoutes = express.Router();

complianceRoutes.get("/", getAllTemplates);

//complianceRoutes.post("/generate-fy", generateFY);
//complianceRoutes.get("/calendar", getCalendarObligations);
//complianceRoutes.get("/dashboard-summary", getDashboardSummary);
//complianceRoutes.post("/complete", markCompleted);
//complianceRoutes.post("/ignore", ignoreObligation);

// Apply protectRoute to ensure req.user exists
complianceRoutes.post("/organization/:organization_id/profile", protectRoute, createCompanyProfile); // create
complianceRoutes.get("/organization/:organization_id/profile", protectRoute, getCompanyProfile); // read
complianceRoutes.put("/organization/:organization_id/profile", protectRoute, updateCompanyProfile); // update
complianceRoutes.get("/organization/:organization_id/onboarding-status", protectRoute, getOnboardingStatus); // onboarding status

export default complianceRoutes;
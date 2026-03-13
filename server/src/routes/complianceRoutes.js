import express from "express";
import { getAllTemplates } from "../controllers/compliance/complianceTemplate.controller.js";
import { protectRoute } from "../middlewares/authMiddleware.js";
import { 
  createCompanyProfile, 
  getCompanyProfile, 
  updateCompanyProfile, 
  getOnboardingStatus 
} from "../controllers/compliance/complianceOnboarding.controller.js";

import { getDirectors, createDirector, updateDirector, deleteDirector} from "../controllers/compliance/complianceDirectors.controller.js";
import { 
  getEvents,
  createEvent,
  updateEvent,
  acknowledgeEvent,
  deleteEvent
} from "../controllers/compliance/complianceEvents.controller.js";

import {
  getObligations,
  updateObligationStatus,
  deleteObligation,
  generateFY,
  getDashboardSummary
} from "../controllers/compliance/complianceCalendar.controller.js";

import {
  createTicket,
  getTickets,
  getTicketById,
  updateTicketStatus,
  addComment,
  getTicketComments
} from "../controllers/compliance/complianceTicket.controller.js";

import { 
  getConditionalCompliances,      // was: getConditionalCompliances
  generateConditionalObligation,  // was: generateConditionalObligation (singular)
  checkApplicability
} from "../controllers/compliance/conditionalCompliance.controller.js";


const complianceRoutes = express.Router();

complianceRoutes.get("/", getAllTemplates);
//complianceRoutes.post("/generate-fy", generateFY);
//complianceRoutes.get("/calendar", getCalendarObligations);
//complianceRoutes.get("/dashboard-summary", getDashboardSummary);
//complianceRoutes.post("/complete", markCompleted);
//complianceRoutes.post("/ignore", ignoreObligation);

complianceRoutes.post("/profile", protectRoute, createCompanyProfile);
complianceRoutes.get("/profile", protectRoute, getCompanyProfile);
complianceRoutes.patch("/profile/:id", protectRoute, updateCompanyProfile);
complianceRoutes.get("/profile/onboarding-status", protectRoute, getOnboardingStatus);

complianceRoutes.get("/obligations", getObligations);
complianceRoutes.patch("/obligations/:id", updateObligationStatus);
complianceRoutes.delete("/obligations/:id", deleteObligation);
complianceRoutes.post("/generate-fy", generateFY);
complianceRoutes.get("/dashboard-summary", getDashboardSummary);

complianceRoutes.get("/directors", getDirectors); 
complianceRoutes.post("/directors", createDirector);
complianceRoutes.patch("/directors/:id", updateDirector); 
complianceRoutes.delete("/directors/:id", deleteDirector);

complianceRoutes.get("/events", getEvents);                    
complianceRoutes.post("/events", createEvent);                
complianceRoutes.patch("/events/:id", updateEvent);           
complianceRoutes.patch("/events/:id/acknowledge", acknowledgeEvent);
complianceRoutes.delete("/events/:id", deleteEvent); 

//NEW TICKET ROUTES
// Compliance Ticket System
complianceRoutes.post("/tickets", protectRoute, createTicket);
complianceRoutes.get("/tickets", protectRoute, getTickets);
complianceRoutes.get("/tickets/:id", protectRoute, getTicketById);
complianceRoutes.patch("/tickets/:id/status", protectRoute, updateTicketStatus);
complianceRoutes.post("/tickets/:id/comments", protectRoute, addComment);
complianceRoutes.get("/tickets/:id/comments", protectRoute, getTicketComments);


complianceRoutes.get("/conditional", protectRoute, getConditionalCompliances);
complianceRoutes.post("/conditional/generate", protectRoute, generateConditionalObligation);
complianceRoutes.get("/conditional/:template_id/check", protectRoute, checkApplicability);
export default complianceRoutes;
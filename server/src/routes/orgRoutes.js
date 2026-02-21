import express from "express";
import {
  getMyOrganizations,
  inviteMember,
  acceptInvite,
  removeMember,
} from "../controllers/orgController.js";

import { protectRoute } from "../middlewares/authMiddleware.js";
import { orgMiddleware } from "../middlewares/organizationMiddleware.js";

const router = express.Router();

router.get("/myorg", protectRoute, getMyOrganizations);

router.post("/invite", protectRoute, orgMiddleware, inviteMember);
router.post("/accept", protectRoute, acceptInvite);
router.delete("/member/:id", protectRoute, orgMiddleware, removeMember);

export default router;

import express from "express";
import { extractInvoice } from "../Functions/invoice-extractor";
import { protectRoute } from "../middlewares/authMiddleware.js";
import { orgMiddleware } from "../middlewares/organizationMiddleware.js";

const extractRoutes = express.Router();

extractRoutes.post("/extract-invoice", protectRoute, orgMiddleware, extractInvoice);

export default extractRoutes;
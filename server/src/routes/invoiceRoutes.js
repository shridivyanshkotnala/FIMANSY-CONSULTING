import express from "express";
import { syncInvoiceToZoho } from "../controllers/invoiceController.js";
import { protectRoute as authMiddleware } from "../middlewares/authMiddleware.js";
import { orgMiddleware } from "../middlewares/organizationMiddleware.js";
import { zohoMiddleware } from "../middlewares/zohoMiddleware.js";

const invoiceRoutes = express.Router();

invoiceRoutes.post(
  "/sync",
  authMiddleware,
  orgMiddleware,
  zohoMiddleware,
  syncInvoiceToZoho
);

export default invoiceRoutes;
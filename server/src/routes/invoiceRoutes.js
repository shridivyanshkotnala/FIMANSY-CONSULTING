import express from "express";
import {
  syncInvoiceToZoho,
  listZohoCustomers,
  createZohoCustomer,
  listZohoTaxes,
  createSalesInvoiceInZoho,
} from "../controllers/invoiceController.js";
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

invoiceRoutes.get(
  "/customers",
  authMiddleware,
  orgMiddleware,
  zohoMiddleware,
  listZohoCustomers
);

invoiceRoutes.post(
  "/customers",
  authMiddleware,
  orgMiddleware,
  zohoMiddleware,
  createZohoCustomer
);

invoiceRoutes.get(
  "/taxes",
  authMiddleware,
  orgMiddleware,
  zohoMiddleware,
  listZohoTaxes
);

invoiceRoutes.post(
  "/sales/create",
  authMiddleware,
  orgMiddleware,
  zohoMiddleware,
  createSalesInvoiceInZoho
);

export default invoiceRoutes;
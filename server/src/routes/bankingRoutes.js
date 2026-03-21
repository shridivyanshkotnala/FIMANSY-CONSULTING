import express from "express";
import {
  getBankDashboardController,
  updateTransactionCategoryController,
  forceVendorPaymentSyncController,
  acceptTransactionController,
  reportTransactionIssueController,
  resolveBankReconQueryController,
} from "../controllers/bankingController.js";
import { protectRoute } from "../middlewares/authMiddleware.js";
import { getPaymentTimelineController } from "../controllers/vendorPaymentController.js";

const bankRoutes = express.Router();

// GET /api/banking/dashboard
bankRoutes.get("/dashboard", protectRoute, getBankDashboardController);
bankRoutes.get("/payments", protectRoute, getPaymentTimelineController);
bankRoutes.post("/payments/force-sync", protectRoute, forceVendorPaymentSyncController);

bankRoutes.patch(
  "/transaction/:id/category",
  protectRoute,
  updateTransactionCategoryController
);

bankRoutes.patch(
  "/transaction/:id/accept",
  protectRoute,
  acceptTransactionController
);

bankRoutes.post(
  "/transaction/:id/report-issue",
  protectRoute,
  reportTransactionIssueController
);

bankRoutes.patch(
  "/recon-query/:queryId/resolve",
  protectRoute,
  resolveBankReconQueryController
);
export default bankRoutes;
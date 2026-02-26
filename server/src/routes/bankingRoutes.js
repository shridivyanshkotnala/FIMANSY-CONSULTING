import express from "express";
import {
  getBankDashboardController,
  updateTransactionCategoryController,
  forceVendorPaymentSyncController,
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
export default bankRoutes;
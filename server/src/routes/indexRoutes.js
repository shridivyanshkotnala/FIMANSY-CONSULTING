import express from 'express';
import userRoute from './userRoutes.js';
import zohoRoutes from './zohoRoutes.js';
import orgRoutes from './orgRoutes.js';
import uploadRoutes from './uploadRoutes.js';
import invoiceRoutes from './invoiceRoutes.js';
import cashIntelligenceRoutes from './cashIntelligence.js';
import bankRoutes from './bankingRoutes.js';
import complianceRoutes from './complianceRoutes.js';
import accountantRoutes from './accountantRoutes.js';

const router = express.Router();

router.use("/user", userRoute)
router.use("/zoho", zohoRoutes)
router.use("/org", orgRoutes)
router.use("/upload", uploadRoutes);
router.use("/invoice", invoiceRoutes);
router.use("/cash-intelligence", cashIntelligenceRoutes);
router.use("/banking", bankRoutes);
router.use("/compliance", complianceRoutes);
router.use("/accountant", accountantRoutes);

export default router;
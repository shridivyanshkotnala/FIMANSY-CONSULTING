import express from 'express';
import userRoute from './userRoutes.js';
import zohoRoutes from './zohoRoutes.js';
import orgRoutes from './orgRoutes.js';
import uploadRoutes from './uploadRoutes.js';
import invoiceRoutes from './invoiceRoutes.js';
const router = express.Router();

router.use("/user", userRoute)
router.use("/zoho", zohoRoutes)
router.use("/org", orgRoutes)
router.use("/upload", uploadRoutes);
router.use("/invoice", invoiceRoutes);
export default router;
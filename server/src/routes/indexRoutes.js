import express from 'express';
import userRoute from './userRoutes.js';
import zohoRoutes from './zohoRoutes.js';

const router = express.Router();

router.use("/user", userRoute)
router.use("/zoho", zohoRoutes)

export default router;
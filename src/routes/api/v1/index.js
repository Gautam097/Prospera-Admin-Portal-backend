import express from 'express';
import authRoutes from './auth.routes.js';
import adminRoutes from './admin.routes.js';

const router = express.Router();

// Use routes
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);

export default router;

import express from 'express';
import authRoutes from './auth.routes.js';
import adminRoutes from './admin.routes.js';
import seonRoutes from './seonRule.route.js';
import limitConfigRoutes from './limitConfig.route.js';
import tokenRoutes from './token.routes.js';

const router = express.Router();

// Use routes
router.use('/auth', authRoutes);
router.use('/admin', adminRoutes);
router.use('/seon', seonRoutes);
router.use('/limitConfig', limitConfigRoutes);
router.use('/token', tokenRoutes);

export default router;

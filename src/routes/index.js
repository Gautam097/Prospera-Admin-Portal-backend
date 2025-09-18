import express from 'express';
import v1Routes from './api/v1/index.js';

const router = express.Router();

// API version 1 routes
router.use('/v1', v1Routes);

export default router;

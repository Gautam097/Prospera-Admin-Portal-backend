import express from 'express';
import * as limitConfigController from '../../../controllers/limitConfig/limitConfig.js';
import {userAuth, adminAuth} from '../../../middleware/user.auth.js';

const router = express.Router();

// POST ROUTES
router.route('/add').post( userAuth, adminAuth, limitConfigController.createLimit);

// UPDATE ROUTES   
router.route('/edit').put( userAuth, adminAuth, limitConfigController.updateLimit);

// GET ROUTES
router.route('/list').get(userAuth, adminAuth, limitConfigController.getLimits);

// GET ROUTES BY PARAMS
router.route('/:type').get(userAuth, adminAuth, limitConfigController.getLimitByType);

// DELETE ROUTES
router.route('/remove/:type').delete(userAuth, adminAuth, limitConfigController.deleteLimit);

export default router;

import express from 'express';
import * as SeonController from '../../../controllers/seonRule/seonRule.js';
import {userAuth, adminAuth} from '../../../middleware/user.auth.js';

const router = express.Router();

// POST ROUTES
router.route('/addRule').post( userAuth, adminAuth, SeonController.createSeonRule);

// GET ROUTES
router.route('/getRule').get(userAuth, adminAuth, SeonController.listSeonRules);

// POST ROUTES
router.route('/edit/:id').put(userAuth, adminAuth, SeonController.updateSeonRule);

// DELETE ROUTES
router.route('/remove/:id').delete(userAuth, adminAuth, SeonController.deleteSeonRule);

export default router;

import express from 'express';

const router = express.Router();

import * as adminController from '../../../controllers/admin/admin.controller.js';

router.route('/users/list').get(adminController.listUsers);
router.route('/userdetail/:id').get(adminController.getUserDetails);

export default router;
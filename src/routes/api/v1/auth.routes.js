import express from 'express';
import * as AuthController from '../../../controllers/auth/auth.controller.js';
import passport from 'passport';
import userAuth from '../../../middleware/user.auth.js';

const router = express.Router();

// POST ROUTES
// router.route('/register/init').post(AuthController.registerInit);   //create route like this 

// GET ROUTES

// PUT ROUTES

// DELETE ROUTES

export default router;

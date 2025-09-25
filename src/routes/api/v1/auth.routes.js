import express from 'express';
import * as AuthController from '../../../controllers/auth/auth.controller.js';
import {userAuth} from '../../../middleware/user.auth.js';

const router = express.Router();

// POST ROUTES
router.route('/admin/register/init').post(AuthController.registerAdmin);
router.route('/admin/register/mfaSetup').post(AuthController.setupAdminMFA);

router.route('/admin/login/init').post(AuthController.loginInit);
router.route('/admin/login/resend-otp').post(AuthController.resendLoginOtp);
router.route('/admin/login/verify-otp').post(AuthController.verifyLoginOtp);
router.route('/admin/login/mfa-verify').post(AuthController.verifyMfaAndLogin);

router.route('/admin/forgot-password/init').post(AuthController.forgotPasswordInit);
router.route('/admin/forgot-password/resend-otp').post(AuthController.resendForgotPasswordOtp);
router.route('/admin/forgot-password/verify-otp').post(AuthController.verifyForgotPasswordOtp);
router.route('/admin/forgot-password/reset').post(AuthController.resetPassword);

// GET ROUTES
router.route('/admin/refresh-token').get(AuthController.refreshAccessToken);
router.route('/admin/sessions').get(userAuth, AuthController.getUserSessions);

// DELETE ROUTES
router.route('/admin/sessions/remove').delete(userAuth, AuthController.removeUserSession);
router.route('/admin/sessions/remove-others').delete(userAuth, AuthController.logoutAllOtherSessions);
router.route('/admin/delete').delete(userAuth, AuthController.deleteAdminComplete);

router.route('/admin/logout').get(userAuth, AuthController.logout);
export default router;

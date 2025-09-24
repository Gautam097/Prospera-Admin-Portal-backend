import express from 'express';

const router = express.Router();

import * as tokenController from '../../../controllers/token/token.controller.js';

// Create a new token
router.post("/crypto/create", tokenController.createToken);

// List tokens (with pagination)
router.get("/crypto/list", tokenController.listToken);

// View single token by ID
router.get("/crypto/:id", tokenController.viewToken);

// Edit token (all fields)
router.put("/crypto/edit/:id", tokenController.editToken);

// Update only active status
router.patch("/crypto/:id/status", tokenController.updateTokenStatus);

// Soft delete token
router.delete("/crypto/delete/:id", tokenController.softDeleteToken);


// fiat 

// List fiat (with pagination)
router.get("/fiat", tokenController.listFiat);

// // View single fiat by ID
router.get("/fiat/:id", tokenController.viewFiat);

// // Edit fiat (all fields)
router.put("/fiat/:id", tokenController.editFiat);

// // Update only active status
router.patch("/fiat/:id/status", tokenController.updateFiatStatus);

// // Soft delete fiat
router.delete("/fiat/:id", tokenController.softDeleteFiat);

// // Create fiat data
router.post("/fiat/create", tokenController.CreateFiat);


// Network 

// List fiat (with pagination)
router.get("/network/list", tokenController.listNetwork);

// // View single fiat by ID
router.get("/network/detail/:id", tokenController.viewNetwork);

// // // Edit fiat (all fields)
router.put("/network/edit/:id", tokenController.editNetwork);

// // // Update only active status
router.patch("/network/:id/status", tokenController.updateNetworkStatus);

// // // Soft delete fiat
router.delete("/network/:id", tokenController.softDeleteNetwork);

// // // Create fiat data
// router.post("/fiat/create", tokenController.CreateFiat);



export default router;
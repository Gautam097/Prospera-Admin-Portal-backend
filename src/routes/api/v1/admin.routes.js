import express from 'express';
import { userAuth, adminAuth } from '../../../middleware/user.auth.js';

const router = express.Router();

import * as userController from '../../../controllers/users/users.controller.js';
import * as cityController from '../../../controllers/master/city.controller.js';
import * as countryController from '../../../controllers/master/country.controller.js';
import * as stateController from '../../../controllers/master/state.controller.js';
import * as stakeConfigController from '../../../controllers/master/stakingConfig.controller.js';

router.route('/users/list').get(userAuth, adminAuth, userController.listUsers);
router.route('/userdetail/:id').get(userAuth, adminAuth, userController.getUserDetails);
router.route('/userfreeze/:id').post(userAuth, adminAuth, userController.toggleUserFreeze);


//staking config
router.route('/staking-configs').post(userAuth, adminAuth, stakeConfigController.createStakingConfig);
router.route('/staking-configs').get(userAuth, adminAuth, stakeConfigController.listStakingConfigs);
router.route('/staking-configs/:id').get(userAuth, adminAuth, stakeConfigController.getStakingConfig);
router.route('/staking-configs/:id').put(userAuth, adminAuth, stakeConfigController.updateStakingConfig);
router.route('/staking-configs/:id').delete(userAuth, adminAuth, stakeConfigController.deleteStakingConfig);
router.route('/staking-configs/:id/toggle').patch(userAuth, adminAuth, stakeConfigController.toggleStakingConfig);

// country
router.post("/countries", userAuth, adminAuth, countryController.createCountry);
router.get("/countries", userAuth, adminAuth, countryController.listCountries);
router.put("/countries/:id", userAuth, adminAuth, countryController.updateCountry);
router.patch("/countries/:id/status", userAuth, adminAuth, countryController.toggleCountryStatus);
router.delete('/countries/:id', userAuth, adminAuth, countryController.deleteCountry);

// State
router.post("/states", userAuth, adminAuth, stateController.createState);
router.get("/states", userAuth, adminAuth, stateController.listStates);
router.put("/states/:id", userAuth, adminAuth, stateController.updateState);
router.patch("/states/:id/status", userAuth, adminAuth, stateController.toggleStateStatus);
router.delete('/states/:id', userAuth, adminAuth, stateController.deleteState);

// City
router.post("/cities", userAuth, adminAuth, cityController.createCity);
router.get("/cities", userAuth, adminAuth, cityController.listCities);
router.put("/cities/:id", userAuth, adminAuth, cityController.updateCity);
router.patch("/cities/:id/status", userAuth, adminAuth, cityController.toggleCityStatus);
router.delete('/cities/:id', userAuth, adminAuth, cityController.deleteCity);

export default router;
import express from 'express';

const router = express.Router();

import * as userController from '../../../controllers/users/users.controller.js';
import * as cityController from '../../../controllers/common/city.controller.js';
import * as countryController from '../../../controllers/common/country.controller.js';
import * as stateController from '../../../controllers/common/state.controller.js';

router.route('/users/list').get(userController.listUsers);
router.route('/userdetail/:id').get(userController.getUserDetails);

// country
router.post("/countries", countryController.createCountry);
router.get("/countries", countryController.listCountries);
router.put("/countries/:id", countryController.updateCountry);
router.patch("/countries/:id/status", countryController.toggleCountryStatus);
router.delete('/countries/:id', countryController.deleteCountry);


// State
router.post("/states", stateController.createState);
router.get("/states", stateController.listStates);
router.put("/states/:id", stateController.updateState);
router.patch("/states/:id/status", stateController.toggleStateStatus);
router.delete('/states/:id', stateController.deleteState);

// City
router.post("/cities", cityController.createCity);
router.get("/cities", cityController.listCities);
router.put("/cities/:id", cityController.updateCity);
router.patch("/cities/:id/status", cityController.toggleCityStatus);
router.delete('/cities/:id', cityController.deleteCity);

export default router;
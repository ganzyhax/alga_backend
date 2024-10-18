const express = require("express");
const router = express.Router();
const {
  registerDriver,
  loginDriver,
  refreshToken,
  makeVerified,
  updateLocation,
  makeOnline,
  makeOffline,
} = require("../controllers/driver/driverController");

router.post("/driver/register", registerDriver);
router.post("/driver/login", loginDriver);
router.post("/driver/refresh-token", refreshToken);
router.post("/driver/update-location", updateLocation);
router.post("/driver/make-verified", makeVerified); // Route to verify driver
router.post("/driver/make-online", makeOnline); // Route to set driver online
router.post("/driver/make-offline", makeOffline); // Route to set driver online

module.exports = router;

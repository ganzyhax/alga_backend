// services/driverService.js
const Driver = require("../models/driverModel"); // Adjust the path if needed

/**
 * Continuously tries to find the nearest available driver within a specified distance.
 * @param {Object} pickupLocation - The pickup location (GeoJSON point)
 * @param {Number} maxAttempts - Maximum number of attempts to find a driver
 * @param {Number} delay - Time delay between each search attempt (in milliseconds)
 * @returns {Object|null} - Returns the nearest driver object or null if not found
 */
const findNearestDriverContinuously = async (
  pickupLocation,
  maxAttempts = 12,
  delay = 5000
) => {
  let attempts = 0;
  let nearestDriver = null;

  while (attempts < maxAttempts && !nearestDriver) {
    nearestDriver = await Driver.findOne({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: pickupLocation.coordinates,
          },
          $maxDistance: 10000, // Max distance in meters (adjust if needed)
        },
      },
      isOnline: true, // Only consider drivers who are online
      isVerified: true, // Only consider verified drivers
    });

    if (nearestDriver) {
      break; // Exit the loop if a driver is found
    }
    console.log("Not founded \n tryng again...");

    // Wait for the specified delay before attempting the search again
    await new Promise((resolve) => setTimeout(resolve, delay));
    attempts++;
  }

  return nearestDriver;
};

module.exports = {
  findNearestDriverContinuously,
};

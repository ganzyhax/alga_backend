const jwt = require("jsonwebtoken");
const authenticateToken = require("../../middleware/authMiddleware"); // Import token middleware
const bcrypt = require("bcryptjs");
const Driver = require("../../models/driverModel");
require("dotenv").config();

// Function to retrieve driver from token
const getDriverFromToken = async (req, res) => {
  console.log(req.user);
  const driverId = req.user.userId; // Extract userId from the token
  const driver = await Driver.findById(driverId);
  if (!driver) {
    return res.status(404).json({ message: "Driver not found" });
  }
  return driver; // Return the found driver
};

exports.registerDriver = async (req, res) => {
  try {
    const { phone } = req.body;

    let driver = await Driver.findOne({ phone });
    if (driver) {
      return res.status(400).json({ message: "Driver already exists" });
    }

    driver = new Driver({ phone });
    await driver.save();

    const token = jwt.sign(
      { id: driver._id, userId: driver._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    const refreshToken = jwt.sign(
      { id: driver._id, userId: driver._id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    // Save the refresh token to the database
    driver.refreshToken = refreshToken;
    await driver.save();

    res.status(201).json({ token, refreshToken, driver });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateLocation = [
  authenticateToken, // Middleware to authenticate
  async (req, res) => {
    try {
      const { coordinates } = req.body;

      const driver = await getDriverFromToken(req, res);
      if (!driver) return; // Driver not found, response already sent

      driver.location = {
        type: "Point",
        coordinates: coordinates,
      };

      await driver.save();
      res.status(200).json(driver);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  },
];

exports.loginDriver = async (req, res) => {
  try {
    const { phone } = req.body;
    const driver = await Driver.findOne({ phone });
    if (!driver) {
      return res.status(400).json({ message: "Invalid phone or password" });
    }

    const token = jwt.sign(
      { id: driver._id, userId: driver._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );
    const refreshToken = jwt.sign(
      { id: driver._id, userId: driver._id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    // Save refreshToken in the database
    driver.refreshToken = refreshToken;
    await driver.save();

    res.status(200).json({
      token,
      refreshToken,
      driver: {
        id: driver._id,
        phone: driver.phone,
        name: driver.name,
        isVerified: driver.isVerified,
        isOnline: driver.isOnline,
        balance: driver.balance,
        rating: driver.rating,
        location: driver.location,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(401).json({ message: "Refresh Token required" });
  }

  try {
    const driver = await Driver.findOne({ refreshToken });
    if (!driver) {
      return res.status(403).json({ message: "Invalid refresh token" });
    }

    // Verify the refresh token
    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err) => {
      if (err)
        return res.status(403).json({ message: "Invalid refresh token" });

      // Generate new access token
      const newAccessToken = jwt.sign(
        { id: driver._id, userId: driver._id },
        process.env.JWT_SECRET,
        { expiresIn: "1d" }
      );

      res.json({ accessToken: newAccessToken });
    });
  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });
  }
};

exports.cancelOrder = [
  authenticateToken,
  async (req, res) => {
    try {
      const { orderId } = req.body;

      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }

      // Set the order status to canceled
      order.status = "canceled";
      await order.save();

      // Start a new search for the next available driver
      const nearestDriver = await findNearestDriverContinuously(
        order.pickupLocation,
        12,
        5000
      ); // Retry for 1 minute

      if (nearestDriver) {
        // Reassign the order to the next driver
        order.driver = nearestDriver._id;
        order.status = "accepted";
        await order.save();

        nearestDriver.orders.push(order._id);
        await nearestDriver.save();

        return res.status(200).json({
          message: "Order reassigned to another driver",
          order,
          driver: nearestDriver,
        });
      } else {
        return res.status(404).json({
          message: "No other drivers available, please try again later.",
        });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
];

exports.makeVerified = [
  authenticateToken,
  async (req, res) => {
    try {
      const driver = await getDriverFromToken(req, res);
      if (!driver) return; // Driver not found, response already sent

      driver.isVerified = true;
      await driver.save();

      res.status(200).json({ message: "Driver verified successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
];

exports.makeOnline = [
  authenticateToken,
  async (req, res) => {
    try {
      const driver = await getDriverFromToken(req, res);
      if (!driver) return; // Driver not found, response already sent

      driver.isOnline = true;
      await driver.save();

      res.status(200).json({ message: "Driver is now online" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
];

exports.makeOffline = [
  authenticateToken,
  async (req, res) => {
    try {
      const driver = await getDriverFromToken(req, res);
      if (!driver) return; // Driver not found, response already sent

      driver.isOnline = false;
      await driver.save();

      res.status(200).json({ message: "Driver is now offline" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
];

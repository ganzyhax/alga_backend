const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const Passenger = require("../../models/passangerModel");
const Order = require("../../models/orderModel");
const authenticateToken = require("../../middleware/authMiddleware");
require("dotenv").config();

exports.createOrder = [
  authenticateToken,
  async (req, res) => {
    try {
      const { pickupLocation, dropoffLocation, orderType, fare } = req.body;

      const order = new Order({
        passenger: req.user.userId, // Get the passenger ID from the token
        pickupLocation,
        dropoffLocation,
        orderType,
        fare,
      });

      await order.save();

      // Add the order ID to the passenger's orders array
      const passenger = await Passenger.findById(req.user.userId);
      passenger.orders.push(order._id);
      await passenger.save();

      res.status(201).json({ message: "Order created successfully", order });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
];

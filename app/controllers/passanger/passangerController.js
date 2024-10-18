const jwt = require("jsonwebtoken");
const Passenger = require("../../models/passangerModel");
const Order = require("../../models/orderModel");
const authenticateToken = require("../../middleware/authMiddleware");
const { connectedDrivers } = require("../../sockets/driverSocketHandler"); // Ensure this path is correct
const {
  findNearestDriverContinuously,
} = require("../../services/driverService");
require("dotenv").config();
const { getIo } = require("../../sockets/socketInstance"); // Import the getIo function

exports.registerPassanger = async (req, res) => {
  try {
    const { phone } = req.body;

    let passenger = await Passenger.findOne({ phone });
    if (passenger) {
      return res.status(400).json({ message: "Passenger already exists" });
    }

    passenger = new Passenger({ phone });
    await passenger.save();

    const token = jwt.sign(
      { id: passenger._id, userId: passenger._id },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );
    const refreshToken = jwt.sign(
      { id: passenger._id, userId: passenger._id },
      process.env.REFRESH_TOKEN_SECRET,
      {
        expiresIn: "7d",
      }
    );

    // Save the refresh token to the database
    passenger.refreshToken = refreshToken;
    await passenger.save();

    res.status(201).json({ token, refreshToken, passenger });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { phone } = req.body; // Removed password as it was not used
    const passenger = await Passenger.findOne({ phone });

    if (!passenger) {
      return res.status(400).json({ message: "Invalid phone or password" });
    }

    const token = jwt.sign(
      { id: passenger._id, userId: passenger._id },
      process.env.JWT_SECRET,
      {
        expiresIn: "1d",
      }
    );
    const refreshToken = jwt.sign(
      { id: passenger._id, userId: passenger._id },
      process.env.REFRESH_TOKEN_SECRET,
      {
        expiresIn: "7d",
      }
    );

    // Save refreshToken in the database
    passenger.refreshToken = refreshToken;
    await passenger.save();

    res.status(200).json({
      accessToken: token,
      refreshToken: refreshToken,
      passenger: {
        id: passenger._id,
        phone: passenger.phone,
        name: passenger.name,
        isVerified: passenger.isVerified,
        balance: passenger.balance,
        rating: passenger.rating,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
exports.createOrder = [
  authenticateToken,
  async (req, res) => {
    const io = getIo(); // Get the io instance
    try {
      const { pickupLocation, dropoffLocation, orderType, fare } = req.body;

      // Find the passenger
      const passenger = await Passenger.findById(req.user.userId);
      if (!passenger) {
        return res.status(404).json({ message: "Passenger not found" });
      }

      // Create the order
      const order = new Order({
        passenger: passenger._id,
        pickupLocation,
        dropoffLocation,
        orderType,
        fare,
      });

      await order.save();
      passenger.orders.push(order._id);
      await passenger.save();

      io.to(req.user.socketId).emit("searching", {
        message: "Searching for a driver...",
      });

      // Search for the nearest driver (implement findNearestDriverContinuously)
      const nearestDriver = await findNearestDriverContinuously(
        pickupLocation,
        12,
        5000
      );

      if (nearestDriver) {
        order.driver = nearestDriver._id;
        await order.save();

        const nearestDriverSocketId = connectedDrivers[nearestDriver._id];

        if (nearestDriverSocketId) {
          console.log(
            "Sended new order suggest to driver " + nearestDriver._id
          );
          io.to(nearestDriverSocketId).emit("newOrder", {
            orderId: order._id,
            pickupLocation: order.pickupLocation,
            dropoffLocation: order.dropoffLocation,
            fare: order.fare,
            status: order.status,
          });
        }

        // Notify the passenger that a driver has been assigned
        io.to(req.user.socketId).emit("driverFound", {
          message: "Driver found!",
          driver: nearestDriver,
          order,
        });

        return res.status(201).json({
          message: "Order created and assigned to nearest driver",
          order,
          driver: nearestDriver,
        });
      } else {
        io.to(req.user.socketId).emit("noDrivers", {
          message: "No drivers available, please try again later.",
        });

        return res.status(404).json({
          message: "No drivers available, please try again later.",
        });
      }
    } catch (error) {
      console.error(error.message);
      return res.status(500).json({ message: error.message });
    }
  },
];
exports.cancelOrder = [
  authenticateToken,
  async (req, res) => {
    const io = getIo();
    try {
      const passengerId = req.user.userId;
      const { orderId } = req.body;
      console.log(orderId);
      // Find the order to be deleted
      const order = await Order.findOne({
        _id: orderId,
        passenger: passengerId,
      });
      console.log("Findedn cancel order");
      if (!order) {
        console.log("Not found Order to delte");
        return res.status(404).json({ message: "Order not found" });
      }

      // Check if the order is completed or already canceled
      if (order.status === "completed") {
        return res.status(400).json({
          message:
            "Order cannot be canceled, it's already completed or canceled",
        });
      }

      // Delete the order from the database
      await Order.deleteOne({ _id: orderId });

      // If a driver is already assigned, notify the driver
      if (order.driver) {
        const driverSocketId = connectedDrivers[order.driver];
        if (driverSocketId) {
          io.to(driverSocketId).emit("orderCanceled", {
            message: "Passenger has canceled the order",
            orderId: order._id,
          });
        }
      }

      // Notify the passenger of the cancellation
      io.to(req.user.socketId).emit("orderCanceled", {
        message: "Order canceled successfully",
      });

      return res.status(200).json({ message: "Order canceled successfully" });
    } catch (error) {
      console.error(error.message);
      return res.status(500).json({ message: error.message });
    }
  },
];
// Get all orders for the passenger
exports.getMyOrders = [
  authenticateToken,
  async (req, res) => {
    try {
      const passengerId = req.user.userId; // Get the passenger ID from the token

      // Fetch orders for the passenger
      const orders = await Order.find({ passenger: passengerId });
      if (!orders || orders.length === 0) {
        return res.status(404).json({ message: "No orders found" });
      }

      res.status(200).json({ orders });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
];

// Get current order if it exists
exports.getCurrentOrder = [
  authenticateToken,
  async (req, res) => {
    try {
      const passengerId = req.user.userId; // Get the passenger ID from the token

      // Assuming that "current" order means the last created order
      const currentOrder = await Order.findOne({ passenger: passengerId })
        .sort({ createdAt: -1 }) // Get the most recent order
        .limit(1);

      if (!currentOrder) {
        return res.status(404).json({ message: "No current order found" });
      }

      res.status(200).json({ currentOrder });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
];

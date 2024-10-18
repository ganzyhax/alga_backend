const express = require("express");
const router = express.Router();
const {
  registerPassanger,
  login,
  createOrder,
  getMyOrders,
  getCurrentOrder,
  cancelOrder,
} = require("../controllers/passanger/passangerController");
const authenticateToken = require("../middleware/authMiddleware");

// Add a leading slash to each route
router.post("/passanger/register", registerPassanger);
router.post("/passanger/login", login);
router.post("/passanger/create-order", createOrder);
router.post("/passanger/cancel-order", cancelOrder);
router.get("/passanger/orders", authenticateToken, getMyOrders);
router.get("/passanger/current-order", authenticateToken, getCurrentOrder);

module.exports = router;

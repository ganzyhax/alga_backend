const express = require("express");
const router = express.Router();
const orderController = require("../controllers/order/orderController"); // Import the order controller
const authenticateToken = require("../middleware/authMiddleware"); // Ensure to use the authentication middleware

router.post("/orders/create", authenticateToken, orderController.createOrder);

module.exports = router;

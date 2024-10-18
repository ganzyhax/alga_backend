const express = require("express");
const mongoose = require("mongoose");
const http = require("http");
const socketIo = require("socket.io");
const dotenv = require("dotenv");
const driverRoutes = require("./routes/driverRoutes");
const passengerRoutes = require("./routes/passangerRoutes");
const orderRoutes = require("./routes/orderRoutes");
const { initializeDriverSocket } = require("./sockets/driverSocketHandler");
const {
  initializePassengerSocket,
} = require("./sockets/passangerSocketHandler");
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server); // Initialize Socket.IO with the server

// Connect to MongoDB
mongoose
  .connect("mongodb://localhost:27017/alga", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error(err));

// Initialize socket connections
initializeDriverSocket(io);
initializePassengerSocket(io);
// Middleware for JSON
app.use(express.json());

// Define your API routes
app.use("/api", driverRoutes);
app.use("/api", passengerRoutes);
app.use("/api", orderRoutes);

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

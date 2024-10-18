const { setIo, getIo } = require("./socketInstance");
const Order = require("../models/orderModel");

let connectedPassengers = {}; // Stores passenger socket IDs

function initializePassengerSocket(socketIo) {
  setIo(socketIo); // Initialize the Socket.IO instance

  socketIo.on("connection", (socket) => {
    console.log("New passenger connection:", socket.id);

    // Register passenger
    socket.on("registerPassenger", async (passengerId) => {
      connectedPassengers[passengerId] = socket.id;
      console.log(
        `Passenger ${passengerId} registered with socket ID: ${socket.id}`
      );
      const activeOrder = await Order.findOne({
        passenger: passengerId,
        status: "accepted",
      });
      if (activeOrder) {
        socket.emit("ongoingOrder", {
          message: "Resuming your order",
          order: activeOrder,
        });
      }
    });

    // Handle passenger disconnection
    socket.on("disconnect", () => {
      console.log("Passenger disconnected:", socket.id);
      for (const passengerId in connectedPassengers) {
        if (connectedPassengers[passengerId] === socket.id) {
          delete connectedPassengers[passengerId];
          console.log(`Passenger ${passengerId} unregistered`);
          break;
        }
      }
    });

    socket.on("accepted", (data) => {
      const { orderId, driver, order } = data;

      socket.emit("accepted", {
        message: "Driver found!",
        driver,
        order,
      });
    });
    socket.on("arrived", (data) => {
      const { orderId, driver, order } = data;

      socket.emit("arrived", {
        message: "Driver Arrived!",
        driver,
        order,
      });
    });
    socket.on("completing", (data) => {
      const { orderId, driver, order } = data;

      socket.emit("completing", {
        message: "Driver started order!",
        driver,
        order,
      });
    });
    socket.on("completed", (data) => {
      const { orderId, driver, order } = data;

      socket.emit("completed", {
        message: "Driver completed the order!",
        driver,
        order,
      });
    });

    socket.on("noDrivers", (message) => {
      socket.emit("noDrivers", {
        message: "No drivers available, please try again later.",
      });
    });
  });
}

module.exports = { initializePassengerSocket, connectedPassengers };

const Order = require("../models/orderModel");
const { findNearestDriverContinuously } = require("../services/driverService");
const { setIo, getIo } = require("./socketInstance");
let connectedDrivers = {}; // Stores driver socket IDs

function initializeDriverSocket(socketIo) {
  setIo(socketIo); // Initialize the Socket.IO instance

  socketIo.on("connection", (socket) => {
    socket.on("registerDriver", async (driverId) => {
      connectedDrivers[driverId] = socket.id;
      console.log(`Driver ${driverId} registered with socket ID: ${socket.id}`);
      const activeOrder = await Order.findOne({
        driver: driverId,
        $or: [{ status: "accepted" }, { status: "completing" }],
      });
      if (activeOrder) {
        socket.emit("completingOrder", {
          message: "You have an ongoing accepted order",
          order: activeOrder,
        });
      }
    });

    // Handle driver disconnection
    socket.on("disconnect", () => {
      console.log("Driver disconnected:", socket.id);
      for (const driverId in connectedDrivers) {
        if (connectedDrivers[driverId] === socket.id) {
          delete connectedDrivers[driverId];
          console.log(`Driver ${driverId} unregistered`);
          break;
        }
      }
    });
    socket.on("accept", async (orderId) => {
      try {
        const order = await Order.findById(orderId);
        if (order && order.status === "pending") {
          order.status = "accepted";
          await order.save();

          console.log(`Order ${orderId} accepted by driver`);

          const passengerSocketId = getPassengerSocketId(order.passenger);
          if (passengerSocketId) {
            socketIo.to(passengerSocketId).emit("accepted", { orderId });
            console.log(
              `Notified passenger ${order.passenger} of order acceptance`
            );
          }
        }
      } catch (error) {
        console.error(`Error accepting order ${orderId}:`, error);
      }
    });

    socket.on("reject", async (orderId) => {
      try {
        const order = await Order.findById(orderId);
        if (order && order.status === "pending") {
          order.status = "pending";
          await order.save();

          console.log(`Order ${orderId} rejected by driver`);

          const nextNearestDriver = await findNearestDriverContinuously(
            order.pickupLocation,
            12,
            5000
          );
          if (nextNearestDriver) {
            const nextDriverSocketId = connectedDrivers[nextNearestDriver._id];

            await nextNearestDriver.save();
            if (nextDriverSocketId) {
              socketIo.to(nextDriverSocketId).emit("newOrder", {
                orderId: order._id,
                pickupLocation: order.pickupLocation,
                dropoffLocation: order.dropoffLocation,
                fare: order.fare,
                status: order.status,
              });
            }
          }
        }
      } catch (error) {
        console.error(`Error rejecting order ${orderId}:`, error);
      }
    });

    socket.on("arrived", async (orderId) => {
      try {
        const order = await Order.findById(orderId);
        if (order) {
          order.status = "arrived";
          await order.save();

          console.log(`Order ${orderId} rejected by driver`);
          const passengerSocketId = getPassengerSocketId(order.passenger);
          if (passengerSocketId) {
            socketIo.to(passengerSocketId).emit("arrived", { orderId });
            console.log(
              `Notified passenger ${order.passenger} of order ARRIVED`
            );
          }
        }
      } catch (error) {
        console.error(`Error rejecting order ${orderId}:`, error);
      }
    });

    socket.on("completing", async (orderId) => {
      try {
        const order = await Order.findById(orderId);
        if (order) {
          order.status = "completing";
          await order.save();
          const passengerSocketId = getPassengerSocketId(order.passenger);
          if (passengerSocketId) {
            socketIo.to(passengerSocketId).emit("completing", { orderId });
            console.log(
              `Notified passenger ${order.passenger} of order COMPLETING`
            );
          }
        }
      } catch (error) {
        console.error(`Error rejecting order ${orderId}:`, error);
      }
    });
    socket.on("completed", async (orderId) => {
      try {
        const order = await Order.findById(orderId);
        if (order) {
          order.status = "completed";
          await order.save();

          console.log(`Order ${orderId} rejected by driver`);
          const passengerSocketId = getPassengerSocketId(order.passenger);
          if (passengerSocketId) {
            socketIo.to(passengerSocketId).emit("completed", { orderId });
            console.log(
              `Notified passenger ${order.passenger} of order FINISHED`
            );
          }
        }
      } catch (error) {
        console.error(`Error rejecting order ${orderId}:`, error);
      }
    });
  });
}

function getPassengerSocketId(passengerId) {
  const { connectedPassengers } = require("./passangerSocketHandler"); // Import connectedPassengers from passengerSocket
  return connectedPassengers[passengerId] || null;
}

module.exports = { initializeDriverSocket, connectedDrivers };

const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    passenger: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Passenger",
      required: true,
    }, // Reference to the Passenger model
    driver: { type: mongoose.Schema.Types.ObjectId, ref: "Driver" }, // Reference to the Driver model (optional, can be null if not assigned yet)
    pickupLocation: {
      type: { type: String, enum: ["Point"], required: true }, // Geometric type
      coordinates: { type: [Number], required: true }, // Coordinates [longitude, latitude]
    },
    dropoffLocation: {
      type: { type: String, enum: ["Point"], required: true }, // Geometric type
      coordinates: { type: [Number], required: true }, // Coordinates [longitude, latitude]
    },
    orderType: {
      type: String,
      enum: ["Econom", "Comfort", "Business"], // Define types of orders available
      default: "Econom", // Default order type
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "completing", "completed", "canceled"],
      default: "pending", // Default status of the order
    },
    fare: { type: Number, required: true }, // Fare for the ride
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending", // Default payment status
    },
    createdAt: { type: Date, default: Date.now }, // Order creation date
    updatedAt: { type: Date, default: Date.now }, // Order update date
    rating: {
      type: Number,
      min: 1,
      max: 5,
      default: null, // Rating can be null until rated by the passenger
    },
    feedback: { type: String }, // Optional feedback from the passenger
  },
  {
    timestamps: true, // Automatically add createdAt and updatedAt timestamps
  }
);

// Create a geospatial index for pickup and dropoff locations
orderSchema.index({ pickupLocation: "2dsphere" });
orderSchema.index({ dropoffLocation: "2dsphere" });

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;

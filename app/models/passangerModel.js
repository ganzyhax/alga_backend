const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const passengerSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true },
    name: { type: String },
    refreshToken: { type: String }, // For refresh token
    isVerified: { type: Boolean, default: false },
    balance: { type: Number, default: 0 },
    rating: { type: Number, default: 5, min: 1, max: 5 },
    location: {
      type: { type: String, enum: ["Point"] },
      coordinates: { type: [Number] },
    },
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }], // Reference to orders
  },
  {
    timestamps: true,
  }
);

// Create a geospatial index for location
passengerSchema.index({ location: "2dsphere" });

const Passenger = mongoose.model("Passenger", passengerSchema);
module.exports = Passenger;

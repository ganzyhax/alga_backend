const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const driverSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true, unique: true },
    name: { type: String },
    refreshToken: { type: String }, // Add this line
    documents: {
      carImage: { type: String },
      carPassport: { type: String },
      idPhoto: { type: String },
      driverPhoto: { type: String },
    },
    isVerified: { type: Boolean, default: false },
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: "Order" }],
    balance: { type: Number, default: 0 },
    isOnline: { type: Boolean, default: false },
    rating: { type: Number, default: 5, min: 1, max: 5 },
    location: {
      type: { type: String, enum: ["Point"] }, // тип геометрической фигуры
      coordinates: { type: [Number] }, // координаты [долгота, широта]
    },
  },
  {
    timestamps: true,
  }
);

driverSchema.index({ location: "2dsphere" });

const Driver = mongoose.model("Driver", driverSchema);
module.exports = Driver;

const jwt = require("jsonwebtoken");

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer <token>

  if (!token) {
    return res.status(400).json({ message: "Access token is required!" });
  }

  // Verify the token
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Invalid token!" });
    }

    // Attach user data (including userId) to request object
    req.user = decoded; // `decoded` contains the payload from the token
    next(); // Proceed to the next middleware or route handler
  });
};

module.exports = authenticateToken;

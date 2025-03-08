const getAuth0Token = require("../utils/getAuth0Token");
const jwt = require("jsonwebtoken");
const jwks = require("jwks-rsa");
require("dotenv").config();

const { auth } = require("express-oauth2-jwt-bearer");

const checkJwt = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ message: "Authorization header required" });
  }

  const token = authHeader.split(" ")[1];

  try {
    // For JWE tokens from Auth0
    const tokenParts = token.split(".");
    if (tokenParts.length === 5) {
      // Validate token header contains correct issuer
      const header = JSON.parse(
        Buffer.from(tokenParts[0], "base64").toString()
      );

      if (header.iss === process.env.AUTH0_DOMAIN) {
        req.user = { token };
        return next();
      }
    }

    return res.status(401).json({ message: "Invalid token" });
  } catch (error) {
    return res.status(401).json({ message: "Invalid token", error });
  }
};

// Export both middleware functions
module.exports = { checkJwt };

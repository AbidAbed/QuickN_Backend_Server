const jwt = require("jsonwebtoken");
const createError = require("../utils/createError");
const User = require("../models/userModel");

const auth = async (req, res, next) => {
  const authHeader = req.headers.token_header;
  const adminHeader = req.headers.admin_header;

  // If the header is empty (no token value) , or the token don't starts with Bearer word

  // If user is not an admin and not a user then 401
  if (
    (!authHeader || !authHeader.startsWith("Bearer")) &&
    (!adminHeader || !adminHeader.startsWith("admin"))
  ) {
    return next(createError(401, "you are not authorized"));
  }

  let token;

  // Check what header to use if admin or user
  if (adminHeader && adminHeader.startsWith("admin"))
    token = adminHeader.split(" ")[1];

  if (authHeader && authHeader.startsWith("Bearer"))
    token = authHeader.split(" ")[1];

  // verify the token and check its value
  jwt.verify(token, process.env.JWT_SECRET, (err, decodedToken) => {
    if (err) {
      return next(createError(403, "Invalid token"));
    }

    // if everything ok . create a key inside the req object contain the payload obj that contains all response keys
    req.userId = decodedToken.userId;

    next();
  });
};

module.exports = auth;

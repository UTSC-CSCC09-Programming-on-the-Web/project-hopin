import jwt from "jsonwebtoken";

export const signJWT = (userId, email) => {
  const payload = { id: userId, email };
  const options = { expiresIn: "1h" };
  const token = jwt.sign(payload, process.env.JWT_SECRET, options);
  return token;
};

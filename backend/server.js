import "dotenv/config";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import corsOptions from "./utils/corsOptions.js";
import { prisma } from "./lib/prisma.js";
// import bcrypt from "bcrypt";
// import session from "express-session";
import { authRouter } from "./routes/user-router.js";

const PORT = 8080;
export const app = express();
app.use(bodyParser.json());
app.use(cors(corsOptions));

app.use(express.static("static"));

// Router for authentication
app.use("/api/auth", authRouter);

app.get("/api/home", (req, res) => {
  res.json({ message: "Testing" });
});

app.listen(PORT, "0.0.0.0", (err) => {
  if (err) console.log(err);
  else console.log("HTTP server on http://localhost:%s", PORT);
});

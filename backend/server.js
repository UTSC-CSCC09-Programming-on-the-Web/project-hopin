import "dotenv/config";
import express from "express";
import cors from "cors";
import { authRouter } from "./routes/auth-router.js";
import { userRouter } from "./routes/user-router.js";
import { subscriptionRouter } from "./routes/subscription-router.js";
import { fareRouter } from "./routes/fare-router.js";
import { webhookRouter } from "./routes/webhook-router.js";
import corsOptions from "./utils/corsOptions.js";

const PORT = 8080;
export const app = express();

// Use raw body parser for webhook endpoint
app.use(
  "/api/webhooks",
  express.raw({ type: "application/json" }),
  webhookRouter,
);

// Use JSON parser for other routes
app.use(express.json());
app.use(cors(corsOptions));
app.use(express.static("static"));

app.use((req, res, next) => {
  console.log(`[Express] ${req.method} ${req.url}`);
  next();
});

app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/subscriptions", subscriptionRouter);
// TODO: move fareRouter to /api/groups/:groupId/fares
app.use("/api/fares", fareRouter);

app.listen(PORT, "0.0.0.0", (err) => {
  if (err) console.log(err);
  else console.log("HTTP server on http://localhost:%s", PORT);
});

import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { authRouter } from "./routes/auth-router.js";
import { userRouter } from "./routes/user-router.js";
import { subscriptionRouter } from "./routes/subscription-router.js";
import { fareRouter } from "./routes/fare-router.js";
import { webhookRouter } from "./routes/webhook-router.js";
import corsOptions from "./utils/corsOptions.js";

const PORT = 8080;
export const app = express();

// Security headers with Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.stripe.com"],
      frameSrc: ["'self'", "https://js.stripe.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === "production" ? [] : undefined,
    },
  },
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  frameguard: { action: "sameorigin" },
  crossOriginResourcePolicy: { policy: "same-origin" },
  crossOriginEmbedderPolicy: process.env.NODE_ENV === "production", // Disable for development compatibility
  // TODO: Enable hsts when served over hsts
  // hsts: {
  //   maxAge: 31536000, // 1 year
  //   includeSubDomains: true,
  //   preload: true
  // }
}));

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

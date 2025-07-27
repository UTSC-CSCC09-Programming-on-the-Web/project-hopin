import { Router } from "express";
import { handleWebhook } from "../controllers/webhook-controller.js";

export const webhookRouter = Router();

webhookRouter.post("/", handleWebhook);

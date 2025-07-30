import { Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import {
  createGroup,
  joinGroup,
  leaveGroup,
  getGroup,
  becomeDriver,
  unbecomeDriver,
  updateGroupRoute,
} from "../controllers/group-controller.js";
// import { createRateLimiter } from "../middleware/rate-limit.js";
// import { createLock } from "../middleware/lock.js";
// import { validateRequestSchema } from "../middleware/validate-request-schema.js";
// import { requireSubscription } from "../middleware/subscription-check.js";
// import { handleMiddlewareErrors } from "../middleware/error-handler.js";

const groupRouter = Router();

groupRouter.post(
  "/:id/join",
  authenticateToken,
  // requireSubscription,
  // createRateLimiter("joinGroupRL", {
  //   maxAttemptsIP: 20,
  //   durationIP: 60 * 10,
  //   maxAttemptsUserIP: 10,
  //   durationUserIP: 60 * 10,
  //   enableProgressive: true,
  // }),
  // createLock("joinGroupLock"),
  // validateRequestSchema({
  //   paramsSchema: {
  //     id: { required: true, type: "string" },
  //   },
  // }),
  // handleMiddlewareErrors,
  joinGroup,
);

groupRouter.post(
  "/:id/leave",
  authenticateToken,
  // requireSubscription,
  // createRateLimiter("leaveGroupRL", {
  //   maxAttemptsIP: 30,
  //   durationIP: 60 * 10,
  //   maxAttemptsUserIP: 15,
  //   durationUserIP: 60 * 10,
  //   enableProgressive: true,
  // }),
  // createLock("leaveGroupLock"),
  // validateRequestSchema({
  //   paramsSchema: {
  //     id: { required: true, type: "string" },
  //   },
  // }),
  // handleMiddlewareErrors,
  leaveGroup,
);

groupRouter.post(
  "/:id/become-driver",
  authenticateToken,
  // requireSubscription,
  // createRateLimiter("becomeDriverRL", {
  //   maxAttemptsIP: 30,
  //   durationIP: 60 * 10,
  //   maxAttemptsUserIP: 15,
  //   durationUserIP: 60 * 10,
  //   enableProgressive: true,
  // }),
  // createLock("becomeDriverLock"),
  // validateRequestSchema({
  //   paramsSchema: {
  //     id: { required: true, type: "string" },
  //   },
  // }),
  // handleMiddlewareErrors,
  becomeDriver,
);

groupRouter.post(
  "/:id/unbecome-driver",
  authenticateToken,
  // createRateLimiter("unbecomeDriverRL", {
  //   maxAttemptsIP: 30,
  //   durationIP: 60 * 10,
  //   maxAttemptsUserIP: 15,
  //   durationUserIP: 60 * 10,
  //   enableProgressive: true,
  // }),
  // createLock("unbecomeDriverLock"),
  // requireSubscription,
  // validateRequestSchema({
  //   paramsSchema: {
  //     id: { required: true, type: "string" },
  //   },
  // }),
  // handleMiddlewareErrors,
  unbecomeDriver,
);

groupRouter.post(
  "/",
  authenticateToken,
  // requireSubscription,
  // createRateLimiter("createGroupRL", {
  //   maxAttemptsIP: 30,
  //   durationIP: 60 * 10,
  //   maxAttemptsUserIP: 15,
  //   durationUserIP: 60 * 10,
  //   enableProgressive: true,
  // }),
  // createLock("createGroupLock"),
  // handleMiddlewareErrors,
  createGroup,
);

groupRouter.get(
  "/:id",
  authenticateToken,
  // requireSubscription,
  // validateRequestSchema({
  //   paramsSchema: {
  //     id: { required: true, type: "string" },
  //   },
  // }),
  // handleMiddlewareErrors,
  getGroup,
);

groupRouter.put("/:id/route", authenticateToken, updateGroupRoute);

export default groupRouter;

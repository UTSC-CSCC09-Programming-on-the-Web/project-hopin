import { Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import {
  createGroup,
  joinGroup,
  leaveGroup,
  getGroup,
  becomeDriver,
  unbecomeDriver,
} from "../controllers/group-controller.js";

const groupRouter = Router();

groupRouter.post("/:id/join", authenticateToken, joinGroup);

groupRouter.post("/:id/leave", authenticateToken, leaveGroup);

groupRouter.post("/:id/become-driver", authenticateToken, becomeDriver);
groupRouter.post("/:id/unbecome-driver", authenticateToken, unbecomeDriver);

groupRouter.post("/", authenticateToken, createGroup);
groupRouter.get("/:id", authenticateToken, getGroup);

export default groupRouter;

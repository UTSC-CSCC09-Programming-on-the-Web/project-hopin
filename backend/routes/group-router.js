import { Router } from "express";
import { authenticateToken } from "../middleware/auth.js";
import {
  createGroup,
  joinGroup,
  leaveGroup,
  getGroup,
  becomeDriver,
} from "../controllers/group-controller.js";

const groupRouter = Router();

groupRouter.post("/", authenticateToken, createGroup);

groupRouter.post("/:id/join", authenticateToken, joinGroup);

groupRouter.get("/:id/leave", authenticateToken, leaveGroup);

groupRouter.get("/:id", authenticateToken, getGroup);

groupRouter.post("/:id/driver", authenticateToken, becomeDriver);

export default groupRouter;

import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { validateBody, validateParams, validateQuery } from "../../middlewares/validate.middleware.js";
import { UserController } from "./user.controller.js";
import { presenceBodySchema, searchQuerySchema, userIdParamSchema } from "./user.schema.js";

export const userRouter = Router();

userRouter.use(authenticate);

userRouter.get("/me", UserController.getMe);
userRouter.get("/search", validateQuery(searchQuerySchema), UserController.searchUsers);
userRouter.put("/presence", validateBody(presenceBodySchema), UserController.updatePresence);
userRouter.get("/:userId/last-seen", validateParams(userIdParamSchema), UserController.getLastSeen);

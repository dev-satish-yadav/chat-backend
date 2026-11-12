import { Router } from "express";
import { validateBody } from "../../middlewares/validate.middleware.js";
import { AuthController } from "./auth.controller.js";
import { loginSchema, registerSchema } from "./auth.schema.js";

export const authRouter = Router();

authRouter.post("/register", validateBody(registerSchema), AuthController.register);
authRouter.post("/login", validateBody(loginSchema), AuthController.login);

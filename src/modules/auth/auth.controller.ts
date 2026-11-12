import type { NextFunction, Request, Response } from "express";
import { AuthService } from "./auth.service.js";

export class AuthController {
  static async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.register(req.body);
      res.status(201).json({
        message: "User registered successfully",
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await AuthService.login(req.body);
      res.status(200).json({
        message: "Login successful",
        ...result,
      });
    } catch (error) {
      next(error);
    }
  }
}

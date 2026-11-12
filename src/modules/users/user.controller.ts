import type { NextFunction, Request, Response } from "express";
import { UserService } from "./user.service.js";

export class UserController {
  static async getMe(req: Request, res: Response, next: NextFunction) {
    try {
      const user = await UserService.getCurrentUser(req.user!.userId);
      res.json(user);
    } catch (error) {
      next(error);
    }
  }

  static async searchUsers(req: Request, res: Response, next: NextFunction) {
    try {
      const query = (req.query.q as string) || "";
      const users = await UserService.searchUsers(query, req.user!.userId);
      res.json(users);
    } catch (error) {
      next(error);
    }
  }

  static async updatePresence(req: Request, res: Response, next: NextFunction) {
    try {
      const isOnline = req.body.isOnline !== undefined ? Boolean(req.body.isOnline) : true;
      const presence = await UserService.updatePresence(req.user!.userId, isOnline);
      res.json(presence);
    } catch (error) {
      next(error);
    }
  }

  static async getLastSeen(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = String(req.params.userId);
      const user = await UserService.getUserLastSeen(userId);
      res.json(user);
    } catch (error) {
      next(error);
    }
  }
}

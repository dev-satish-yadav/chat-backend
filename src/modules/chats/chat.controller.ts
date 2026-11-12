import type { NextFunction, Request, Response } from "express";
import { ChatService } from "./chat.service.js";

export class ChatController {
  // 1. POST /chat/create
  static async createOrGetDirectChat(req: Request, res: Response, next: NextFunction) {
    try {
      const { senderId, receiverId } = req.body;
      const result = await ChatService.getOrCreateDirectChat(senderId, receiverId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getUserChats(req: Request, res: Response, next: NextFunction) {
    try {
      const chats = await ChatService.getUserChats(req.user!.userId);
      res.json(chats);
    } catch (error) {
      next(error);
    }
  }

  static async getChatById(req: Request, res: Response, next: NextFunction) {
    try {
      const chatId = String(req.params.chatId);
      const chat = await ChatService.getChatById(chatId, req.user!.userId);
      res.json(chat);
    } catch (error) {
      next(error);
    }
  }
}

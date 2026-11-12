import type { NextFunction, Request, Response } from "express";
import { MessageService } from "./message.service.js";

export class MessageController {
  static async sendMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const chatId = String(req.params.chatId);
      const { content, type } = req.body;
      const message = await MessageService.sendMessage(
        chatId,
        req.user?.userId || "",
        content,
        type
      );
      res.status(201).json(message);
    } catch (error) {
      next(error);
    }
  }

  static async getMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const chatId = String(req.params.chatId);
      const limit = typeof req.query.limit === "number" ? req.query.limit : (req.query.limit ? parseInt(String(req.query.limit), 10) : 30);
      const before = req.query.before as string | undefined;

      const messages = await MessageService.getMessages(
        chatId,
        req.user?.userId || "",
        limit,
        before
      );
      res.json(messages);
    } catch (error) {
      next(error);
    }
  }

  static async markAsRead(req: Request, res: Response, next: NextFunction) {
    try {
      const chatId = String(req.params.chatId);
      const { lastReadMessageId } = req.body;

      const receipt = await MessageService.markChatAsRead(
        chatId,
        req.user?.userId || "",
        lastReadMessageId
      );
      res.json(receipt);
    } catch (error) {
      next(error);
    }
  }

  static async getReadReceipts(req: Request, res: Response, next: NextFunction) {
    try {
      const chatId = String(req.params.chatId);
      const receipts = await MessageService.getReadReceipts(chatId, req.user!.userId);
      res.json(receipts);
    } catch (error) {
      next(error);
    }
  }
}

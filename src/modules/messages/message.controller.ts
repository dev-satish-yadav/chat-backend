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
      const limit = typeof req.query.limit === "number" ? req.query.limit : (req.query.limit ? parseInt(String(req.query.limit), 10) : 50);
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

  // 4. POST /api/chats/:chatId/message/:messageId/read
  static async markMessageRead(req: Request, res: Response, next: NextFunction) {
    try {
      const chatId = String(req.params.chatId);
      const messageId = String(req.params.messageId);
      const userId = (req.body.userId as string) || req.user?.userId;

      if (!userId) {
        res.status(400).json({ error: "ValidationError", message: "userId is required." });
        return;
      }

      const result = await MessageService.markMessageRead(chatId, messageId, userId);
      res.status(200).json(result);
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

  // 5. POST /chat/:chatId/lastseen
  static async updateLastSeen(req: Request, res: Response, next: NextFunction) {
    try {
      const chatId = String(req.params.chatId);
      const userId = (req.body.userId as string) || req.user?.userId;
      const { messageId } = req.body;

      if (!userId) {
        res.status(400).json({ error: "ValidationError", message: "userId is required." });
        return;
      }

      const result = await MessageService.updateLastSeen(chatId, userId, messageId);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Update Message: PUT /api/chats/:chatId/messages/:messageId
  static async updateMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const chatId = String(req.params.chatId);
      const messageId = String(req.params.messageId);
      const userId = (req.body.userId as string) || req.user?.userId;
      const content = req.body.content || req.body.text;

      if (!userId) {
        res.status(400).json({ error: "ValidationError", message: "userId is required." });
        return;
      }

      if (!content) {
        res.status(400).json({
          error: "ValidationError",
          message: "Field 'content' is required.",
        });
        return;
      }

      const result = await MessageService.updateMessage(chatId, messageId, userId, content);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  // Delete Message: DELETE /api/chats/:chatId/messages/:messageId
  static async deleteMessage(req: Request, res: Response, next: NextFunction) {
    try {
      const chatId = String(req.params.chatId);
      const messageId = String(req.params.messageId);
      const userId = (req.body?.userId as string) || req.user?.userId;
      const hardDelete = req.query.hard === "true" || req.body?.hard === true;

      if (!userId) {
        res.status(400).json({ error: "ValidationError", message: "userId is required." });
        return;
      }

      const result = await MessageService.deleteMessage(chatId, messageId, userId, hardDelete);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}

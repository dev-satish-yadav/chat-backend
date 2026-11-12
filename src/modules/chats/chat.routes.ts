import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { validateBody, validateParams, validateQuery } from "../../middlewares/validate.middleware.js";
import { MessageController } from "../messages/message.controller.js";
import { getMessagesQuerySchema, markReadSchema, sendMessageSchema } from "../messages/message.schema.js";
import { ChatController } from "./chat.controller.js";
import { chatIdParamSchema, createChatSchema } from "./chat.schema.js";

export const chatRouter = Router();

// Protect all chat & message routes with JWT authentication
chatRouter.use(authenticate);
// 1. Create or Get Chat: POST /chat/create (Public, accepts senderId and receiverId, returns { chatId })
chatRouter.post(
  "/create",
  validateBody(createChatSchema),
  ChatController.createOrGetDirectChat
);

// Backward compatibility alias
chatRouter.post(
  "/direct",
  validateBody(createChatSchema),
  ChatController.createOrGetDirectChat
);


chatRouter.get("/", ChatController.getUserChats);

chatRouter.get(
  "/:chatId",
  validateParams(chatIdParamSchema),
  ChatController.getChatById
);

// Generic Messaging & Read Receipts
chatRouter.post(
  "/:chatId/message/send",
  validateParams(chatIdParamSchema),
  validateBody(sendMessageSchema),
  MessageController.sendMessage
);

chatRouter.get(
  "/:chatId/messages",
  validateParams(chatIdParamSchema),
  validateQuery(getMessagesQuerySchema),
  MessageController.getMessages
);

// Read Receipts
chatRouter.post(
  "/:chatId/read",
  validateParams(chatIdParamSchema),
  validateBody(markReadSchema),
  MessageController.markAsRead
);

chatRouter.get(
  "/:chatId/read-receipts",
  validateParams(chatIdParamSchema),
  MessageController.getReadReceipts
);

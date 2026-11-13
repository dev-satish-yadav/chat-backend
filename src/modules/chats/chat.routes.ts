import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware.js";
import { validateBody, validateParams, validateQuery } from "../../middlewares/validate.middleware.js";
import { MessageController } from "../messages/message.controller.js";
import {
  getMessagesQuerySchema,
  markReadSchema,
  sendMessageSchema,
  updateMessageSchema,
} from "../messages/message.schema.js";
import { ChatController } from "./chat.controller.js";
import {
  chatIdParamSchema,
  createChatSchema,
  markMessageReadBodySchema,
  markMessageReadParamsSchema,
  updateLastSeenBodySchema,
} from "./chat.schema.js";

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

// 4. Mark Message Read: POST /api/chats/:chatId/message/:messageId/read
chatRouter.post(
  "/:chatId/message/:messageId/read",
  validateParams(markMessageReadParamsSchema),
  validateBody(markMessageReadBodySchema),
  MessageController.markMessageRead
);

// Read Receipts (Legacy)
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

//Update Last Seen Message: POST /chat/:chatId/lastseen
chatRouter.post(
  "/:chatId/lastseen",
  validateParams(chatIdParamSchema),
  validateBody(updateLastSeenBodySchema),
  MessageController.updateLastSeen
);

// Update Message: PUT /api/chats/:chatId/messages/:messageId
chatRouter.put(
  "/:chatId/messages/:messageId",
  validateParams(markMessageReadParamsSchema),
  validateBody(updateMessageSchema),
  MessageController.updateMessage
);

// Delete Message: DELETE /api/chats/:chatId/messages/:messageId
chatRouter.delete(
  "/:chatId/messages/:messageId",
  validateParams(markMessageReadParamsSchema),
  MessageController.deleteMessage
);

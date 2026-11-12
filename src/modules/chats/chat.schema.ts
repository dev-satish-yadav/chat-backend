import { z } from "zod";

// 1. Create or Get Chat
export const createChatSchema = z.object({
  senderId: z.string().uuid("senderId must be a valid UUID."),
  receiverId: z.string().uuid("receiverId must be a valid UUID."),
});

// Common Chat ID Param
export const chatIdParamSchema = z.object({
  chatId: z.string().uuid("chatId must be a valid UUID."),
});

// 2. Send Message
export const sendChatMessageSchema = z.object({
  senderId: z.string().uuid("senderId must be a valid UUID."),
  text: z
    .string()
    .trim()
    .min(1, "text cannot be empty.")
    .max(4000, "text cannot exceed 4000 characters."),
});

// 3. Get Messages Query
export const getMessagesQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 50))
    .refine((val) => !isNaN(val) && val >= 1 && val <= 100, {
      message: "limit must be an integer between 1 and 100.",
    }),
});

// 4. Mark Message Read
export const markMessageReadParamsSchema = z.object({
  chatId: z.string().uuid("chatId must be a valid UUID."),
  messageId: z.string().trim().min(1, "messageId cannot be empty."),
});

export const markMessageReadBodySchema = z.object({
  userId: z.string().uuid("userId must be a valid UUID."),
});

// 5. Update Last Seen Message
export const updateLastSeenBodySchema = z.object({
  userId: z.string().uuid("userId must be a valid UUID."),
  messageId: z.string().trim().min(1, "messageId cannot be empty."),
});

// 6. List User Chats
export const userChatsParamsSchema = z.object({
  userId: z.string().uuid("userId must be a valid UUID."),
});

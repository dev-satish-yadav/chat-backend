import { z } from "zod";

export const sendMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Message content cannot be empty.")
    .max(4000, "Message content cannot exceed 4000 characters."),
  type: z.enum(["text", "image", "file"]).default("text"),
});

export const markReadSchema = z.object({
  lastReadMessageId: z
    .string()
    .trim()
    .min(1, "lastReadMessageId cannot be empty."),
});

export const getMessagesQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 50))
    .refine((val) => !isNaN(val) && val >= 1 && val <= 100, {
      message: "Limit must be an integer between 1 and 100.",
    }),
  before: z
    .string()
    .datetime({ message: "Invalid date format for 'before'. Must be an ISO 8601 string." })
    .optional(),
});

export type SendMessageInput = z.infer<typeof sendMessageSchema>;
export type MarkReadInput = z.infer<typeof markReadSchema>;

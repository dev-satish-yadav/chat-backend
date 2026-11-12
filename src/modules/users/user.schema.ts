import { z } from "zod";

export const userIdParamSchema = z.object({
  userId: z.string().uuid("Invalid user ID format. Must be a valid UUID."),
});

export const searchQuerySchema = z.object({
  q: z
    .string()
    .min(1, "Search query 'q' cannot be empty.")
    .max(100, "Search query too long."),
});

export const presenceBodySchema = z.object({
  isOnline: z.boolean().default(true),
});

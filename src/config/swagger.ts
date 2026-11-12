export const swaggerSpec = {
  openapi: "3.0.3",
  info: {
    title: "Chat Backend API",
    version: "1.0.0",
    description:
      "Chat Backend API built with Node.js, TypeScript, PostgreSQL (Prisma), and Firebase Firestore.\n\nNow supporting `POST /chat/create` with `senderId` and `receiverId` returning `{ chatId }`.",
  },
  servers: [
    {
      url: "http://localhost:3000",
      description: "Local Development Server",
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Enter your JWT token obtained from `/api/auth/login` or `/api/auth/register`",
      },
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          error: { type: "string", example: "ValidationError" },
          message: { type: "string", example: "Invalid request payload" },
          details: {
            type: "array",
            items: {
              type: "object",
              properties: {
                field: { type: "string" },
                message: { type: "string" },
              },
            },
          },
        },
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string", format: "uuid" },
          email: { type: "string", format: "email" },
          username: { type: "string" },
          displayName: { type: "string", nullable: true },
          avatarUrl: { type: "string", nullable: true },
          isOnline: { type: "boolean" },
          lastSeenAt: { type: "string", format: "date-time" },
          createdAt: { type: "string", format: "date-time" },
        },
      },
      RegisterInput: {
        type: "object",
        required: ["email", "username", "password"],
        properties: {
          email: { type: "string", format: "email", example: "alice@example.com" },
          username: { type: "string", minLength: 3, maxLength: 30, example: "alice" },
          password: { type: "string", minLength: 6, example: "Secret123" },
          displayName: { type: "string", example: "Alice Johnson" },
          avatarUrl: { type: "string", example: "https://example.com/avatar.png" },
        },
      },
      LoginInput: {
        type: "object",
        required: ["login", "password"],
        properties: {
          login: { type: "string", example: "alice" },
          password: { type: "string", example: "Secret123" },
        },
      },
      AuthResponse: {
        type: "object",
        properties: {
          message: { type: "string" },
          token: { type: "string" },
          user: { $ref: "#/components/schemas/User" },
        },
      },
      CreateChatInput: {
        type: "object",
        required: ["senderId", "receiverId"],
        properties: {
          senderId: { type: "string", format: "uuid", example: "e31fde0b-26b6-40fe-992d-350dbebe4986" },
          receiverId: { type: "string", format: "uuid", example: "70738d4f-daea-485b-8ac7-42063d0695aa" },
        },
      },
      CreateChatOutput: {
        type: "object",
        properties: {
          chatId: { type: "string", format: "uuid", example: "9e795f47-f501-4d89-b48d-ea056710f658" },
        },
      },
      SendMessageInput: {
        type: "object",
        required: ["content"],
        properties: {
          content: { type: "string", example: "Hello! How are you?" },
          type: { type: "string", enum: ["text", "image", "file"], default: "text" },
        },
      },
      MarkReadInput: {
        type: "object",
        required: ["lastReadMessageId"],
        properties: {
          lastReadMessageId: { type: "string", example: "msg_firestore_id_123" },
        },
      },
      PresenceInput: {
        type: "object",
        properties: {
          isOnline: { type: "boolean", default: true },
        },
      },
      Message: {
        type: "object",
        properties: {
          id: { type: "string", example: "msg_firestore_id_123" },
          chatId: { type: "string", format: "uuid", example: "9e795f47-f501-4d89-b48d-ea056710f658" },
          senderId: { type: "string", format: "uuid", example: "e31fde0b-26b6-40fe-992d-350dbebe4986" },
          content: { type: "string", example: "Hello! How are you?" },
          type: { type: "string", enum: ["text", "image", "file"], example: "text" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
          isDeleted: { type: "boolean", example: false },
          readBy: {
            type: "object",
            additionalProperties: { type: "string", format: "date-time" },
            description: "Map of userId to timestamp when the message was read",
          },
        },
      },
    },
  },
  paths: {
    "/health": {
      get: {
        summary: "Live System & Database Health Check",
        tags: ["System"],
        responses: {
          200: { description: "Both PostgreSQL and Firestore are healthy" },
          503: { description: "One or more databases are degraded/unreachable" },
        },
      },
    },
    "/api/chats/create": {
      post: {
        summary: "1. Create or Get Chat",
        description: "Creates or fetches an existing 1:1 chat between senderId and receiverId in PostgreSQL. Returns chatId only.",
        tags: ["Chats"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/CreateChatInput" },
            },
          },
        },
        responses: {
          200: {
            description: "Chat created or fetched",
            content: { "application/json": { schema: { $ref: "#/components/schemas/CreateChatOutput" } } },
          },
          400: { description: "Validation error or senderId and receiverId are identical" },
          404: { description: "senderId or receiverId does not exist in PostgreSQL" },
        },
      },
    },
    "/api/auth/register": {
      post: {
        summary: "Register a new user account",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/RegisterInput" },
            },
          },
        },
        responses: {
          201: {
            description: "User registered successfully",
            content: { "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } } },
          },
          400: { description: "Validation error on body", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          409: { description: "Conflict: Email or username already exists", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/auth/login": {
      post: {
        summary: "Authenticate with email/username and password",
        tags: ["Authentication"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/LoginInput" },
            },
          },
        },
        responses: {
          200: {
            description: "Login successful",
            content: { "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } } },
          },
          400: { description: "Missing login credentials" },
          401: { description: "Invalid email/username or password", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
        },
      },
    },
    "/api/users/me": {
      get: {
        summary: "Get current authenticated user profile",
        tags: ["Users"],
        security: [{ BearerAuth: [] }],
        responses: {
          200: {
            description: "User profile",
            content: { "application/json": { schema: { $ref: "#/components/schemas/User" } } },
          },
          401: { description: "Unauthorized" },
          404: { description: "User account not found" },
        },
      },
    },
    "/api/users/search": {
      get: {
        summary: "Search users by username, email, or display name",
        tags: ["Users"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "q",
            in: "query",
            required: true,
            schema: { type: "string" },
            description: "Search keyword",
          },
        ],
        responses: {
          200: {
            description: "List of matched users",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/User" } },
              },
            },
          },
          400: { description: "Invalid search query parameter" },
        },
      },
    },
    "/api/users/presence": {
      put: {
        summary: "Update user online presence & last seen heartbeat",
        tags: ["Users"],
        security: [{ BearerAuth: [] }],
        requestBody: {
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/PresenceInput" },
            },
          },
        },
        responses: {
          200: { description: "Presence updated successfully" },
          400: { description: "Validation error" },
          404: { description: "User not found" },
        },
      },
    },
    "/api/users/{userId}/last-seen": {
      get: {
        summary: "Get a specific user's online state and last seen timestamp",
        tags: ["Users"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "userId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: { description: "Target user last seen status" },
          400: { description: "Invalid UUID format" },
          404: { description: "User not found" },
        },
      },
    },
    "/api/chats": {
      get: {
        summary: "List all chats for the authenticated user",
        tags: ["Chats"],
        security: [{ BearerAuth: [] }],
        responses: {
          200: { description: "Array of chats with recipient info, last message snippet, and unread flags" },
        },
      },
    },
    "/api/chats/{chatId}": {
      get: {
        summary: "Get single chat details",
        tags: ["Chats"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "chatId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: { description: "Chat details with participants" },
          400: { description: "Invalid UUID format" },
          403: { description: "Access denied (not a participant)" },
          404: { description: "Chat not found" },
        },
      },
    },
    "/api/chats/{chatId}/message/send": {
      post: {
        summary: "Send a message to a chat (persisted in Firestore)",
        tags: ["Messages"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "chatId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/SendMessageInput" },
            },
          },
        },
        responses: {
          201: {
            description: "Message created in Firestore and relational chat snippet updated",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/Message" },
              },
            },
          },
          400: { description: "Invalid UUID or empty message content" },
          403: { description: "Access denied (not a participant)" },
          404: { description: "Chat or sender user not found" },
        },
      },
    },
    "/api/chats/{chatId}/messages": {
      get: {
        summary: "Get chat message history (paginated)",
        description: "Fetches messages for a chat from Firestore in chronological order (oldest to newest). Requires participant access.",
        tags: ["Messages"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "chatId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "The unique ID of the chat",
          },
          {
            name: "limit",
            in: "query",
            required: false,
            schema: { type: "integer", minimum: 1, maximum: 100, default: 30 },
            description: "Maximum number of messages to return (between 1 and 100, default: 30)",
          },
          {
            name: "before",
            in: "query",
            required: false,
            schema: { type: "string", format: "date-time" },
            description: "Pagination cursor: fetch messages created before this ISO 8601 timestamp",
          },
        ],
        responses: {
          200: {
            description: "Array of messages in chronological order",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: { $ref: "#/components/schemas/Message" },
                },
              },
            },
          },
          400: { description: "Invalid UUID format or query parameters" },
          401: { description: "Unauthorized" },
          403: { description: "Access denied (not a participant)" },
          404: { description: "Chat or user not found" },
        },
      },
    },
    "/api/chats/{chatId}/read": {
      post: {
        summary: "Mark messages as read (updates Firestore read receipt and PostgreSQL participant)",
        tags: ["Messages"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "chatId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/MarkReadInput" },
            },
          },
        },
        responses: {
          200: { description: "Read receipt updated" },
          400: { description: "Invalid UUID or empty message ID" },
          403: { description: "Access denied" },
          404: { description: "Chat or target message not found in this chat" },
        },
      },
    },
    "/api/chats/{chatId}/read-receipts": {
      get: {
        summary: "Get all read receipts for a chat from Firestore",
        tags: ["Messages"],
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: "chatId",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
          },
        ],
        responses: {
          200: { description: "List of read receipts by participant" },
          400: { description: "Invalid UUID format" },
          403: { description: "Access denied" },
          404: { description: "Chat not found" },
        },
      },
    },
  },
};

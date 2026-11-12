import "dotenv/config";
import cors from "cors";
import express, { type Request, type Response } from "express";
import process from "node:process";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env.js";
import { swaggerSpec } from "./config/swagger.js";
import { getFirestore, initializeFirebase } from "./lib/firebase.js";
import { prisma } from "./lib/prisma.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { chatRouter } from "./modules/chats/chat.routes.js";
import { userRouter } from "./modules/users/user.routes.js";

const app = express();
const PORT = env.PORT;

// Core Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Firebase SDK
initializeFirebase();

// Interactive API Documentation (Swagger UI)
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health Check / Root Routes
app.get("/", (_req: Request, res: Response) => {
  res.json({
    name: "Chat Backend API",
    status: "healthy",
    version: "1.0.0",
    docs: `http://localhost:${PORT}/api-docs`,
    storage: {
      relationalDb: "PostgreSQL (Prisma)",
      messageDb: "Firebase Firestore",
    },
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", async (_req: Request, res: Response) => {
  const health: {
    status: "healthy" | "degraded";
    databases: {
      postgresql: { status: "connected" | "error"; error?: string };
      firestore: { status: "connected" | "error"; error?: string };
    };
    timestamp: string;
  } = {
    status: "healthy",
    databases: {
      postgresql: { status: "connected" },
      firestore: { status: "connected" },
    },
    timestamp: new Date().toISOString(),
  };

  try {
    await prisma.$queryRawUnsafe("SELECT 1");
  } catch (err) {
    health.status = "degraded";
    health.databases.postgresql = {
      status: "error",
      error: (err as Error).message,
    };
  }

  try {
    const firestore = getFirestore();
    await firestore.collection("_healthcheck").limit(1).get();
  } catch (err) {
    health.status = "degraded";
    health.databases.firestore = {
      status: "error",
      error: (err as Error).message,
    };
  }

  const statusCode = health.status === "healthy" ? 200 : 503;
  res.status(statusCode).json(health);
});

// Modular Routes
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/chats", chatRouter);

// Global Error Handler
app.use(errorHandler);

// Database connection verification helper on boot
const checkDatabaseConnections = async () => {
  console.log("\n--- Checking Database Connections ---");

  // 1. PostgreSQL check
  try {
    await prisma.$queryRawUnsafe("SELECT 1");
    console.log("✔ [PostgreSQL] Connected successfully.");
  } catch (err) {
    const lines = (err as Error).message.split("\n").map((l) => l.trim()).filter(Boolean);
    const summary = lines.find((l) => l.includes("failed") || l.includes("credentials") || l.includes("error")) || lines[0] || (err as Error).message;
    console.error(`✖ [PostgreSQL] Connection ERROR: ${summary}`);
    console.error("  👉 Please verify DATABASE_URL in your .env file.");
  }

  // 2. Firebase Firestore check
  try {
    const firestore = getFirestore();
    await firestore.collection("_healthcheck").limit(1).get();
    console.log("✔ [Firestore]  Connected successfully.");
  } catch (err) {
    console.error(`✖ [Firestore]  Connection ERROR: ${(err as Error).message}`);
    console.error("  👉 Please check Firebase credentials in your .env file.");
  }

  console.log("-------------------------------------\n");
};

// Start HTTP Server
const server = app.listen(PORT, async () => {
  console.log(`[SERVER] Chat Backend listening on http://localhost:${PORT}`);
  console.log(`[DOCS]   Swagger UI available at http://localhost:${PORT}/api-docs`);
  await checkDatabaseConnections();
});

// Graceful Shutdown
const shutdown = async () => {
  console.log("\n[SERVER] Shutting down gracefully...");
  server.close(async () => {
    await prisma.$disconnect();
    console.log("[SERVER] Closed all connections.");
    process.exit(0);
  });
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

export default app;

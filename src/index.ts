import "dotenv/config";
import express, { type Request, type Response } from "express";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check / Root Routes
app.get("/", (_req: Request, res: Response) => {
  res.json({
    message: "Chat Backend API is running",
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "healthy" });
});

// Start Server
app.listen(PORT, () => {
  console.log(`[SERVER] Running at http://localhost:${PORT}`);
});

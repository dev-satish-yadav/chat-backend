import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/errors.js";

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // 1. Handled Operational Errors (AppError, NotFoundError, ConflictError, etc.)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.name,
      message: err.message,
    });
    return;
  }

  // 2. Prisma Database Errors
  const prismaErr = err as { code?: string; meta?: Record<string, unknown> };
  if (prismaErr.code === "P2002") {
    const target = Array.isArray(prismaErr.meta?.target) ? prismaErr.meta?.target.join(", ") : "field";
    res.status(409).json({
      error: "ConflictError",
      message: `A record with this ${target} already exists.`,
    });
    return;
  }

  if (prismaErr.code === "P2025") {
    res.status(404).json({
      error: "NotFoundError",
      message: "The requested record was not found.",
    });
    return;
  }

  // 3. Fallback / Unexpected Server Errors
  console.error("[UNEXPECTED ERROR]", err);
  const status = (err as unknown as { status?: number }).status || 500;
  res.status(status).json({
    error: "InternalServerError",
    message: err.message || "An unexpected internal server error occurred",
  });
};

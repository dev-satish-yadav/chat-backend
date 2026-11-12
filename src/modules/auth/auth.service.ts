import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import type { JwtPayload } from "../../types/index.js";
import { ConflictError, UnauthorizedError } from "../../utils/errors.js";
import type { LoginInput, RegisterInput } from "./auth.schema.js";

export class AuthService {
  static async register(input: RegisterInput) {
    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ email: input.email.toLowerCase() }, { username: input.username.toLowerCase() }],
      },
    });

    if (existing) {
      if (existing.email === input.email.toLowerCase()) {
        throw new Error("Email is already registered");
      }
      throw new Error("Username is already taken");
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(input.password, salt);

    const user = await prisma.user.create({
      data: {
        email: input.email.toLowerCase(),
        username: input.username.toLowerCase(),
        displayName: input.displayName || input.username,
        avatarUrl: input.avatarUrl,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        isOnline: true,
        lastSeenAt: true,
        createdAt: true,
      },
    });

    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
    };

    const token = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    });

    return { token, user };
  }

  static async login(input: LoginInput) {
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: input.login.toLowerCase() }, { username: input.login.toLowerCase() }],
      },
    });

    if (!user) {
      throw new UnauthorizedError("Invalid email/username or password.");
    }

    // Verify password hash
    const isMatch = await bcrypt.compare(input.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError("Invalid email/username or password.");
    }

    // Update presence
    await prisma.user.update({
      where: { id: user.id },
      data: { isOnline: true, lastSeenAt: new Date() },
    });

    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      username: user.username,
    };

    const token = jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        isOnline: true,
        lastSeenAt: user.lastSeenAt,
        createdAt: user.createdAt,
      },
    };
  }
}

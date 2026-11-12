import { prisma } from "../../lib/prisma.js";
import { NotFoundError } from "../../utils/errors.js";

export class UserService {
  static async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
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

    if (!user) {
      throw new NotFoundError("Authenticated user account was not found.");
    }

    return user;
  }

  static async searchUsers(query: string, currentUserId: string) {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) {
      return [];
    }

    return prisma.user.findMany({
      where: {
        id: { not: currentUserId },
        OR: [
          { username: { contains: cleanQuery, mode: "insensitive" } },
          { email: { contains: cleanQuery, mode: "insensitive" } },
          { displayName: { contains: cleanQuery, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        isOnline: true,
        lastSeenAt: true,
      },
      take: 20,
    });
  }

  static async updatePresence(userId: string, isOnline: boolean) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundError("User account was not found.");
    }

    return prisma.user.update({
      where: { id: userId },
      data: {
        isOnline,
        lastSeenAt: new Date(),
      },
      select: {
        id: true,
        isOnline: true,
        lastSeenAt: true,
      },
    });
  }

  static async getUserLastSeen(targetUserId: string) {
    const user = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        username: true,
        displayName: true,
        isOnline: true,
        lastSeenAt: true,
      },
    });

    if (!user) {
      throw new NotFoundError(`User with ID '${targetUserId}' does not exist.`);
    }

    return user;
  }
}

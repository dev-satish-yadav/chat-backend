import { prisma } from "../../lib/prisma.js";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../utils/errors.js";

export class ChatService {
  /**
   * 1. Create or Get Chat
   * Input: senderId, receiverId
   * Output: { chatId }
   */
  static async getOrCreateDirectChat(senderId: string, receiverId: string): Promise<{ chatId: string }> {
    if (senderId === receiverId) {
      throw new BadRequestError("senderId and receiverId cannot be the same user.");
    }

    // Verify sender exists in PostgreSQL
    const sender = await prisma.user.findUnique({
      where: { id: senderId },
      select: { id: true },
    });

    if (!sender) {
      throw new NotFoundError(`Sender user with ID '${senderId}' does not exist.`);
    }

    // Verify receiver exists in PostgreSQL
    const receiver = await prisma.user.findUnique({
      where: { id: receiverId },
      select: { id: true },
    });

    if (!receiver) {
      throw new NotFoundError(`Receiver user with ID '${receiverId}' does not exist.`);
    }

    // Look for existing 1:1 chat containing both participants
    const existingChat = await prisma.chat.findFirst({
      where: {
        AND: [
          { participants: { some: { userId: senderId } } },
          { participants: { some: { userId: receiverId } } },
        ],
      },
      select: { id: true },
    });

    if (existingChat) {
      return { chatId: existingChat.id };
    }

    // Create new chat and attach both participants transactionally
    const newChat = await prisma.$transaction(async (tx) => {
      const chat = await tx.chat.create({
        data: {},
      });

      await tx.chatParticipant.createMany({
        data: [
          { chatId: chat.id, userId: senderId },
          { chatId: chat.id, userId: receiverId },
        ],
      });

      return chat;
    });

    return { chatId: newChat.id };
  }

  /**
   * List all chats for a given user, ordered by most recent message/update
   */
  static async getUserChats(userId: string) {
    const chats = await prisma.chat.findMany({
      where: {
        participants: {
          some: { userId },
        },
      },
      orderBy: [
        { lastMessageAt: { sort: "desc", nulls: "last" } },
        { updatedAt: "desc" },
      ],
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                isOnline: true,
                lastSeenAt: true,
              },
            },
          },
        },
      },
    });

    // Format chat preview for the requesting user
    return chats.map((chat) => {
      const otherParticipant = chat.participants.find((p) => p.userId !== userId)?.user;
      const currentParticipant = chat.participants.find((p) => p.userId === userId);

      const hasUnread =
        Boolean(chat.lastMessageAt && currentParticipant?.lastReadAt)
          ? chat.lastMessageAt! > currentParticipant!.lastReadAt!
          : Boolean(chat.lastMessageSnippet && !currentParticipant?.lastReadAt);

      return {
        id: chat.id,
        recipient: otherParticipant,
        lastMessageSnippet: chat.lastMessageSnippet,
        lastMessageSenderId: chat.lastMessageSenderId,
        lastMessageAt: chat.lastMessageAt,
        hasUnread,
        lastReadMessageId: currentParticipant?.lastReadMessageId,
        lastReadAt: currentParticipant?.lastReadAt,
        createdAt: chat.createdAt,
        updatedAt: chat.updatedAt,
      };
    });
  }

  /**
   * Retrieve a specific chat and verify participant membership
   */
  static async getChatById(chatId: string, userId: string) {
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                displayName: true,
                avatarUrl: true,
                isOnline: true,
                lastSeenAt: true,
              },
            },
          },
        },
      },
    });

    if (!chat) {
      throw new NotFoundError(`Chat with ID '${chatId}' does not exist.`);
    }

    const isParticipant = chat.participants.some((p) => p.userId === userId);
    if (!isParticipant) {
      throw new ForbiddenError("Access denied: You are not a participant in this chat.");
    }

    return chat;
  }
}

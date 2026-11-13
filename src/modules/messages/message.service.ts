import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getFirestore } from "../../lib/firebase.js";
import { prisma } from "../../lib/prisma.js";
import type { MessageType } from "../../types/index.js";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../utils/errors.js";

export class MessageService {
  /**
   * Helper to verify if user and chat exist and if the user is a valid participant
   */
  private static async assertParticipant(chatId: string, userId: string) {
    // 1. Check if user exists in database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundError(`User with ID '${userId}' does not exist.`);
    }

    // 2. Check if chat exists in database
    const chat = await prisma.chat.findUnique({
      where: { id: chatId },
      select: { id: true },
    });

    if (!chat) {
      throw new NotFoundError(`Chat with ID '${chatId}' does not exist.`);
    }

    // 3. Check if user is a participant of this chat
    const participant = await prisma.chatParticipant.findUnique({
      where: {
        chatId_userId: {
          chatId,
          userId,
        },
      },
    });

    if (!participant) {
      throw new ForbiddenError("Access denied: You are not a participant in this chat.");
    }

    return participant;
  }

  /**
   * Send a message to a chat
   */
  static async sendMessage(
    chatId: string,
    senderId: string,
    content: string,
    type: MessageType = "text"
  ) {
    // Verify user exists, chat exists, and user is a participant
    await this.assertParticipant(chatId, senderId);

    const firestore = getFirestore();
    const messagesCollection = firestore.collection("chats").doc(chatId).collection("messages");
    const messageDocRef = messagesCollection.doc();

    const now = Timestamp.now();
    const cleanContent = content.trim();

    const messagePayload = {
      id: messageDocRef.id,
      chatId,
      senderId,
      content: cleanContent,
      type,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      isDeleted: false,
      readBy: {
        [senderId]: now,
      },
    };

    // 1. Write to Firestore
    await messageDocRef.set(messagePayload);

    // 2. Update relational Chat summary in PostgreSQL
    const snippet = cleanContent.length > 80 ? `${cleanContent.slice(0, 77)}...` : cleanContent;
    await prisma.chat.update({
      where: { id: chatId },
      data: {
        lastMessageSnippet: snippet,
        lastMessageSenderId: senderId,
        lastMessageAt: new Date(),
      },
    });

    return {
      id: messageDocRef.id,
      chatId,
      senderId,
      content: cleanContent,
      type,
      createdAt: now.toDate().toISOString(),
      isDeleted: false,
      readBy: {
        [senderId]: now.toDate().toISOString(),
      },
    };
  }

  /**
   * Fetch paginated messages for a chat, ordered by creation time
   */
  static async getMessages(
    chatId: string,
    userId: string,
    limitCount: number = 50,
    beforeTimestamp?: string
  ) {
    await this.assertParticipant(chatId, userId);

    const firestore = getFirestore();
    let query: FirebaseFirestore.Query = firestore
      .collection("chats")
      .doc(chatId)
      .collection("messages")
      .orderBy("createdAt", "desc")
      .limit(Math.min(limitCount, 100));

    if (beforeTimestamp) {
      const cursorDate = new Date(beforeTimestamp);
      if (!isNaN(cursorDate.getTime())) {
        query = query.startAfter(Timestamp.fromDate(cursorDate));
      }
    }

    const snapshot = await query.get();

    const messages = snapshot.docs.map((doc) => {
      const data = doc.data();
      const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt;
      const updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt;

      const formattedReadBy: Record<string, string> = {};
      if (data.readBy && typeof data.readBy === "object") {
        for (const [uid, ts] of Object.entries(data.readBy)) {
          formattedReadBy[uid] = ts instanceof Timestamp ? ts.toDate().toISOString() : String(ts);
        }
      }

      return {
        id: doc.id,
        chatId: data.chatId,
        senderId: data.senderId,
        text: data.text || data.content,
        content: data.content || data.text,
        type: data.type,
        createdAt,
        updatedAt,
        isDeleted: data.isDeleted ?? false,
        readBy: formattedReadBy,
      };
    });

    // Return in chronological order (oldest to newest) for front-end rendering
    return messages.reverse();
  }

  /**
   * Mark messages as read by updating Firestore receipt and PostgreSQL participant
   */
  static async markChatAsRead(chatId: string, userId: string, lastReadMessageId: string) {
    await this.assertParticipant(chatId, userId);

    const firestore = getFirestore();
    const cleanMessageId = lastReadMessageId.trim();

    // Verify the target message exists in this chat's Firestore collection
    const targetMessageRef = firestore
      .collection("chats")
      .doc(chatId)
      .collection("messages")
      .doc(cleanMessageId);

    const targetDoc = await targetMessageRef.get();
    if (!targetDoc.exists) {
      throw new NotFoundError(`Message with ID '${cleanMessageId}' was not found in this chat.`);
    }

    const now = Timestamp.now();
    const readReceiptRef = firestore
      .collection("chats")
      .doc(chatId)
      .collection("readReceipts")
      .doc(userId);

    // 1. Update Firestore read receipt
    await readReceiptRef.set(
      {
        userId,
        chatId,
        lastReadMessageId: cleanMessageId,
        lastReadAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // 2. Update specific message readBy map in Firestore
    await targetMessageRef.update({
      [`readBy.${userId}`]: FieldValue.serverTimestamp(),
    });

    // 3. Update PostgreSQL participant read tracker
    await prisma.chatParticipant.update({
      where: {
        chatId_userId: {
          chatId,
          userId,
        },
      },
      data: {
        lastReadMessageId: cleanMessageId,
        lastReadAt: new Date(),
      },
    });

    return {
      userId,
      chatId,
      messageId: cleanMessageId,
      lastReadMessageId: cleanMessageId,
      readAt: now.toDate().toISOString(),
      lastReadAt: now.toDate().toISOString(),
    };
  }

  /**
   * 4. Mark Message Read
   * Input: chatId, messageId, userId
   * Update read receipt in Firestore and PostgreSQL
   */
  static async markMessageRead(chatId: string, messageId: string, userId: string) {
    const receipt = await this.markChatAsRead(chatId, userId, messageId);
    return {
      success: true,
      chatId: receipt.chatId,
      messageId: receipt.messageId,
      userId: receipt.userId,
      readAt: receipt.readAt,
    };
  }

  /**
   * Get all read receipts for a given chat
   */
  static async getReadReceipts(chatId: string, userId: string) {
    await this.assertParticipant(chatId, userId);

    const firestore = getFirestore();
    const snapshot = await firestore
      .collection("chats")
      .doc(chatId)
      .collection("readReceipts")
      .get();

    return snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        userId: doc.id,
        chatId: data.chatId,
        lastReadMessageId: data.lastReadMessageId,
        lastReadAt: data.lastReadAt instanceof Timestamp ? data.lastReadAt.toDate().toISOString() : data.lastReadAt,
      };
    });
  }

  /**
   * 5. Update Last Seen Message
   * Input: chatId, userId, messageId
   * Updates last seen message per user in Firestore and synchronizes with PostgreSQL ChatParticipant
   */
  static async updateLastSeen(chatId: string, userId: string, messageId: string) {
    await this.assertParticipant(chatId, userId);

    const firestore = getFirestore();
    const cleanMessageId = messageId.trim();

    // Verify the target message exists in this chat's Firestore collection
    const messageDocRef = firestore
      .collection("chats")
      .doc(chatId)
      .collection("messages")
      .doc(cleanMessageId);

    const messageDoc = await messageDocRef.get();
    if (!messageDoc.exists) {
      throw new NotFoundError(`Message with ID '${cleanMessageId}' was not found in chat '${chatId}'.`);
    }

    const now = Timestamp.now();

    // 1. Update last seen record in Firestore per user
    const lastSeenDocRef = firestore
      .collection("chats")
      .doc(chatId)
      .collection("lastSeen")
      .doc(userId);

    await lastSeenDocRef.set(
      {
        userId,
        chatId,
        messageId: cleanMessageId,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // 2. Synchronize with PostgreSQL ChatParticipant
    await prisma.chatParticipant.update({
      where: {
        chatId_userId: {
          chatId,
          userId,
        },
      },
      data: {
        lastReadMessageId: cleanMessageId,
        lastReadAt: new Date(),
      },
    });

    return {
      success: true,
      chatId,
      userId,
      messageId: cleanMessageId,
      updatedAt: now.toDate().toISOString(),
    };
  }

  /**
   * Update message content in Firestore
   */
  static async updateMessage(
    chatId: string,
    messageId: string,
    userId: string,
    newContent: string
  ) {
    await this.assertParticipant(chatId, userId);

    const firestore = getFirestore();
    const cleanMessageId = messageId.trim();
    const cleanContent = newContent.trim();

    const messageDocRef = firestore
      .collection("chats")
      .doc(chatId)
      .collection("messages")
      .doc(cleanMessageId);

    const messageDoc = await messageDocRef.get();
    if (!messageDoc.exists) {
      throw new NotFoundError(`Message with ID '${cleanMessageId}' was not found in chat '${chatId}'.`);
    }

    const messageData = messageDoc.data()!;

    // Verify ownership: only the original sender can edit their message
    if (messageData.senderId !== userId) {
      throw new ForbiddenError("Access denied: You can only edit your own messages.");
    }

    if (messageData.isDeleted) {
      throw new BadRequestError("Cannot edit a deleted message.");
    }

    const now = Timestamp.now();

    // 1. Update in Firestore
    await messageDocRef.update({
      text: cleanContent,
      content: cleanContent,
      isEdited: true,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // 2. Update relational snippet in PostgreSQL if applicable
    const snippet = cleanContent.length > 80 ? `${cleanContent.slice(0, 77)}...` : cleanContent;
    await prisma.chat.updateMany({
      where: {
        id: chatId,
        lastMessageSenderId: userId,
      },
      data: {
        lastMessageSnippet: snippet,
      },
    });

    const createdAt =
      messageData.createdAt instanceof Timestamp
        ? messageData.createdAt.toDate().toISOString()
        : messageData.createdAt;

    return {
      id: cleanMessageId,
      chatId,
      senderId: messageData.senderId,
      text: cleanContent,
      content: cleanContent,
      type: messageData.type,
      isEdited: true,
      isDeleted: false,
      createdAt,
      updatedAt: now.toDate().toISOString(),
    };
  }

  /**
   * Delete message in Firestore (soft delete by default, or hard delete)
   */
  static async deleteMessage(
    chatId: string,
    messageId: string,
    userId: string,
    hardDelete: boolean = false
  ) {
    await this.assertParticipant(chatId, userId);

    const firestore = getFirestore();
    const cleanMessageId = messageId.trim();

    const messageDocRef = firestore
      .collection("chats")
      .doc(chatId)
      .collection("messages")
      .doc(cleanMessageId);

    const messageDoc = await messageDocRef.get();
    if (!messageDoc.exists) {
      throw new NotFoundError(`Message with ID '${cleanMessageId}' was not found in chat '${chatId}'.`);
    }

    const messageData = messageDoc.data()!;

    // Verify ownership: only the original sender can delete their message
    if (messageData.senderId !== userId) {
      throw new ForbiddenError("Access denied: You can only delete your own messages.");
    }

    const now = Timestamp.now();

    if (hardDelete) {
      // Hard delete from Firestore collection
      await messageDocRef.delete();
    } else {
      // Soft delete: preserve document, replace text, mark isDeleted
      await messageDocRef.update({
        text: "This message was deleted",
        content: "This message was deleted",
        isDeleted: true,
        deletedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    // Update PostgreSQL lastMessageSnippet if this was the latest message
    await prisma.chat.updateMany({
      where: {
        id: chatId,
        lastMessageSenderId: userId,
      },
      data: {
        lastMessageSnippet: "This message was deleted",
      },
    });

    return {
      success: true,
      message: hardDelete ? "Message permanently deleted." : "Message deleted successfully.",
      chatId,
      messageId: cleanMessageId,
      deletedAt: now.toDate().toISOString(),
      hardDelete,
    };
  }
}

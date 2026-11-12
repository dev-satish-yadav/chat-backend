import type { Timestamp } from "firebase-admin/firestore";

export interface JwtPayload {
  userId: string;
  email: string;
  username: string;
}

export type MessageType = "text" | "image" | "file";

export interface FirestoreMessage {
  id: string;
  chatId: string;
  senderId: string;
  content: string;
  type: MessageType;
  createdAt: Timestamp | FirebaseFirestore.FieldValue;
  updatedAt?: Timestamp | FirebaseFirestore.FieldValue;
  isDeleted: boolean;
  readBy: Record<string, Timestamp | FirebaseFirestore.FieldValue>;
}

export interface FirestoreReadReceipt {
  userId: string;
  chatId: string;
  lastReadMessageId: string;
  lastReadAt: Timestamp | FirebaseFirestore.FieldValue;
}

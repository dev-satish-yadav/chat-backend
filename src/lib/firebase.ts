import admin from "firebase-admin";
import { env } from "../config/env.js";

let firestoreDb: FirebaseFirestore.Firestore | null = null;

export const initializeFirebase = (): FirebaseFirestore.Firestore => {
  if (firestoreDb) {
    return firestoreDb;
  }

  if (admin.apps.length > 0) {
    firestoreDb = admin.firestore();
    return firestoreDb;
  }

  let credential: admin.credential.Credential | undefined;

  // Authenticate directly via environment credentials
  if (env.FIREBASE_PROJECT_ID && env.FIREBASE_CLIENT_EMAIL && env.FIREBASE_PRIVATE_KEY) {
    credential = admin.credential.cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: env.FIREBASE_PRIVATE_KEY,
    });
  }

  // Application Default Credentials or warning
  if (!credential) {
    try {
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: env.FIREBASE_PROJECT_ID || "chat-backend-dev",
      });
      firestoreDb = admin.firestore();
      return firestoreDb;
    } catch {
      console.warn(
        "[FIREBASE WARNING] Firebase credentials not configured. Please supply FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in .env"
      );
      admin.initializeApp({
        projectId: env.FIREBASE_PROJECT_ID || "chat-backend-dev",
      });
      firestoreDb = admin.firestore();
      return firestoreDb;
    }
  }

  admin.initializeApp({
    credential,
    projectId: env.FIREBASE_PROJECT_ID,
  });

  firestoreDb = admin.firestore();
  return firestoreDb;
};

export const getFirestore = (): FirebaseFirestore.Firestore => {
  if (!firestoreDb) {
    return initializeFirebase();
  }
  return firestoreDb;
};

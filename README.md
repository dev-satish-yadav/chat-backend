# Chat Backend

A scalable, production-ready hybrid architecture Chat Backend built with **Node.js**, **Express**, **TypeScript**, **PostgreSQL (Prisma ORM)**, and **Firebase Firestore**.

---

## 🏛️ Architecture Overview

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Relational Database** | **PostgreSQL** (via **Prisma ORM**) | Relational entities & metadata:<br>• **Users**: Account credentials (bcrypt), profiles, presence (`isOnline`), last seen timestamps.<br>• **Chats**: 1:1 conversation metadata, last message snippet, last message timestamp.<br>• **Chat Participants**: Membership junction table, duplicate chat prevention, last read message pointer. |
| **NoSQL Stream** | **Firebase Cloud Firestore** | High-throughput, real-time message events:<br>• `chats/{chatId}/messages`: Chronological messages ordered by server timestamp.<br>• `chats/{chatId}/readReceipts/{userId}`: Per-user read receipt tracking.<br>• `chats/{chatId}/lastSeen/{userId}`: Per-user last seen status. |
| **API & Server** | **Express.js + TypeScript** | Strict typing, Zod schema validation, Swagger UI documentation (`/api-docs`), health checks. |

---

## 📋 Prerequisites

Ensure you have the following installed on your machine:
- **Node.js**: `v18.0.0` or higher (tested on Node v20 LTS)
- **npm**: `v9.0.0` or higher
- **PostgreSQL**: `v14+` or `v18+` running locally or remotely
- **Firebase Project**: A Firebase project with Cloud Firestore enabled (in Native Mode).

---

## 🚀 Step-by-Step Project Setup

### 1. Clone & Install Dependencies

```bash
git clone <repository-url>
cd chat-backend
npm install
```

---

### 2. Configure Environment Variables (`.env`)

Create a `.env` file in the project root by copying the template:

```bash
# On Linux / macOS:
cp .env.example .env

# On Windows PowerShell:
Copy-Item .env.example .env
```

Open `.env` and fill in the required keys:

```dotenv
# ==========================================
# 1. Server Configuration
# ==========================================
PORT=3000
NODE_ENV=development

# ==========================================
# 2. PostgreSQL Relational Database (Prisma)
# ==========================================
# Connection URL format:
# postgresql://<USERNAME>:<PASSWORD>@<HOST>:<PORT>/<DATABASE>?schema=<SCHEMA>
DATABASE_URL="postgresql://postgres:your_local_password@localhost:5432/chat_backend?schema=public"

# ==========================================
# 3. JWT Authentication
# ==========================================
JWT_SECRET="your_long_random_secure_jwt_secret_key"
JWT_EXPIRES_IN="7d"

# ==========================================
# 4. Firebase Admin SDK (Cloud Firestore)
# ==========================================
# Obtained from: Firebase Console > Project Settings > Service Accounts > Generate new private key
FIREBASE_PROJECT_ID="your-firebase-project-id"
FIREBASE_CLIENT_EMAIL="firebase-adminsdk-xxxxx@your-firebase-project-id.iam.gserviceaccount.com"
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQ...\n-----END PRIVATE KEY-----\n"
```

#### Detailed Explanation of `.env` Keys:

| Variable | Required | Default | Description |
| :--- | :---: | :---: | :--- |
| `PORT` | Optional | `3000` | Port on which the HTTP Express server listens. |
| `NODE_ENV` | Optional | `development` | Environment mode (`development`, `production`, `test`). |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string used by Prisma. |
| `JWT_SECRET` | **Yes** | — | Secret string used for signing and verifying JSON Web Tokens. |
| `JWT_EXPIRES_IN` | Optional | `7d` | Expiration lifespan of issued JWT tokens (e.g. `1d`, `7d`, `30d`). |
| `FIREBASE_PROJECT_ID` | **Yes** | — | Firebase project ID (from Firebase Console). |
| `FIREBASE_CLIENT_EMAIL` | **Yes** | — | Service Account client email from your downloaded JSON key. |
| `FIREBASE_PRIVATE_KEY` | **Yes** | — | RSA Private key from your Firebase service account (keep `\n` characters intact). |

> [!TIP]
> **How to get Firebase Credentials:**
> 1. Go to the [Firebase Console](https://console.firebase.google.com/).
> 2. Open **Project Settings** > **Service accounts** tab.
> 3. Click **Generate new private key** (downloads a `.json` file).
> 4. Copy `project_id`, `client_email`, and `private_key` directly into your `.env` file.

---

### 3. Initialize PostgreSQL Database

Run Prisma migrations to create the tables in your PostgreSQL database:

```bash
# Push schema directly to the database
npx prisma db push

# OR run migrations
npm run prisma:migrate
```

To view or manage database records via an interactive GUI:
```bash
npm run prisma:studio
```

---

### 4. Run the Application

#### Development Mode (Hot-Reload with TypeScript):
```bash
npm run dev
```

The server will automatically:
1. Initialize the Express application on `http://localhost:3000`.
2. Connect to the local PostgreSQL database via Prisma.
3. Authenticate with Cloud Firestore using your environment credentials.
4. Output connectivity status checks directly to the terminal.

#### Production Build & Run:
```bash
npm run build
npm start
```

---

## 📖 Interactive API Documentation (Swagger)

An interactive OpenAPI 3.0 Swagger interface is mounted and available at:

```text
http://localhost:3000/api-docs
```

You can test every endpoint directly inside the browser, inspect schemas, and pass input payloads.

---

## 🩺 System Health Check

```http
GET http://localhost:3000/health
```

**Response (200 OK):**
```json
{
  "status": "healthy",
  "databases": {
    "postgresql": { "status": "connected" },
    "firestore": { "status": "connected" }
  },
  "timestamp": "2026-11-12T19:30:00.000Z"
}
```

---

## 🎯 Core Chat APIs Specification

| # | Action | Method | Route | Input Payload | Output / Description |
| :-: | :--- | :--- | :--- | :--- | :--- |
| **1** | **Create or Get Direct Chat** | `POST` | `/api/chat/create` | Body: `{ "senderId": "uuid", "receiverId": "uuid" }` | Returns `{ "chatId": "uuid" }` from PostgreSQL (prevents duplicates). |
| **2** | **Send Message** | `POST` | `/api/chat/:chatId/message/send` | Params: `chatId`<br>Body: `{ "senderId": "uuid", "text": "Hello!" }` | Stores message in Firestore with timestamp; updates PostgreSQL snippet. |
| **3** | **Get Messages** | `GET` | `/api/chat/:chatId/messages?limit=50` | Params: `chatId`<br>Query: `limit` (default 50) | List of messages ordered by timestamp from Firestore. |
| **4** | **Mark Message as Read** | `POST` | `/api/chat/:chatId/message/:messageId/read` | Params: `chatId`, `messageId`<br>Body: `{ "userId": "uuid" }` | Updates read receipt in Firestore & PostgreSQL (`ChatParticipant`). |
| **5** | **Update Last Seen** | `POST` | `/api/chat/:chatId/lastseen` | Params: `chatId`<br>Body: `{ "userId": "uuid", "messageId": "string" }` | Updates last seen per user in Firestore & PostgreSQL. |
| **6** | **Get User Chats** | `GET` | `/api/user/:userId/chats` | Params: `userId` | Returns list of chats with member IDs from relational DB. |

---

## 🧪 Testing with cURL

### 1. Create 1:1 Chat
```bash
curl -X POST "http://localhost:3000/api/chat/create" \
  -H "Content-Type: application/json" \
  -d '{
    "senderId": "e31fde0b-26b6-40fe-992d-350dbebe4986",
    "receiverId": "70738d4f-daea-485b-8ac7-42063d0695aa"
  }'
```

### 2. Send a Message
```bash
curl -X POST "http://localhost:3000/api/chat/9e795f47-f501-4d89-b48d-ea056710f658/message/send" \
  -H "Content-Type: application/json" \
  -d '{
    "senderId": "e31fde0b-26b6-40fe-992d-350dbebe4986",
    "text": "Hello! How are you?"
  }'
```

### 3. Fetch Messages
```bash
curl -X GET "http://localhost:3000/api/chat/9e795f47-f501-4d89-b48d-ea056710f658/messages?limit=50"
```

---

## 📁 Project Directory Structure

```text
chat-backend/
├── prisma/
│   └── schema.prisma                # PostgreSQL models (User, Chat, ChatParticipant)
├── src/
│   ├── config/
│   │   ├── env.ts                   # Type-safe environment variable loader
│   │   └── swagger.ts               # OpenAPI 3.0 documentation spec
│   ├── lib/
│   │   ├── firebase.ts              # Firebase Admin SDK & Cloud Firestore instance
│   │   └── prisma.ts                # Prisma Client singleton
│   ├── middlewares/
│   │   ├── auth.middleware.ts       # JWT Bearer token authentication guard
│   │   ├── error.middleware.ts      # Centralized error handler
│   │   └── validate.middleware.ts   # Zod request validation middleware
│   ├── modules/
│   │   ├── auth/                    # Register, login, password hashing
│   │   ├── users/                   # Profile, search, presence & last-seen
│   │   ├── chats/                   # 1:1 chat creation & listing
│   │   └── messages/                # Firestore messaging & read receipts
│   ├── types/
│   │   └── index.ts                 # Shared TypeScript interfaces
│   └── index.ts                     # Express app initialization & server entry
├── .env.example                     # Environment template
├── package.json
└── tsconfig.json
```

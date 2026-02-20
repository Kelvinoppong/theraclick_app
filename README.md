# Theraklick Mobile

Cross-platform (iOS/Android) React Native mobile app for **Theraklick** — a student-focused mental health platform for Africa, starting with Ghana.

This mobile app reuses the same **Firebase project** and **Next.js API backend** as the [web app](https://github.com/Kelvinoppong/theraclick).

## Tech Stack

- **React Native** (Expo SDK 52)
- **TypeScript**
- **Firebase Auth + Firestore** (shared with web)
- **React Navigation** (native stack + bottom tabs)
- **Axios** (API client to Next.js backend)

## Getting Started

```bash
# Install dependencies
npm install

# Start Expo dev server
npx expo start
```

Scan the QR code with **Expo Go** on your phone, or press `a` for Android emulator / `i` for iOS simulator.

## Environment Variables

Copy `env.example` → `.env` and fill in your Firebase project keys + backend URL:

```
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
EXPO_PUBLIC_API_BASE_URL=https://your-deployed-web-app.vercel.app
```

If left empty, the app runs in **demo mode** (local-only session, no persistence).

## Project Structure

```
App.tsx                        # Entry point
src/
  context/AuthContext.tsx       # Auth state (mirrors web context/auth.tsx)
  navigation/
    RootStack.tsx               # Auth flow vs main app routing
    BottomTabs.tsx              # Dashboard | Chat | Forums | Booking
  screens/
    WelcomeScreen.tsx           # Landing
    RoleSelectionScreen.tsx     # Student / Peer Mentor / Counselor
    StudentSignupScreen.tsx     # Student registration
    MentorApplyScreen.tsx       # Mentor/Counselor application
    LoginScreen.tsx             # Email login
    PendingApprovalScreen.tsx   # Waiting for admin approval
    StudentDashboardScreen.tsx  # Home dashboard
    ChatScreen.tsx              # AI chat (calls POST /api/ai/chat)
    ForumsScreen.tsx            # Community forums (MVP)
    BookingScreen.tsx           # Counselor booking (MVP)
    EmergencyScreen.tsx         # Crisis resources (Ghana)
  services/
    firebase.ts                 # Firebase client init
    apiClient.ts                # HTTP client for Next.js API routes
    chatStore.ts                # Chat persistence (Firestore + AsyncStorage)
  components/
    MessageBubble.tsx           # Chat message bubble
    ChatInput.tsx               # Text input + send button
    LoadingIndicator.tsx        # Typing indicator (animated dots)
  shared/
    types.ts                    # Shared TypeScript types
    safety.ts                   # Crisis detection + emergency resources
```

## Backend API Endpoints (from web app)

| Method | Endpoint                         | Auth           | Description          |
|--------|----------------------------------|----------------|----------------------|
| POST   | `/api/ai/chat`                   | None (public)  | AI chat              |
| GET    | `/api/admin/pending`             | Bearer token   | List pending users   |
| POST   | `/api/admin/users/:uid/approve`  | Bearer token   | Approve user         |
| POST   | `/api/admin/users/:uid/reject`   | Bearer token   | Reject user          |

## Design Principles

- **Anonymity first** — students use the app without real names
- **Text-first** — chat is the default interaction mode
- **Layered support** — AI Chat → Peer Support → Counselor → Emergency
- **Low cognitive load** — calming UI, few choices at a time
- **Safety** — crisis keywords trigger Emergency screen instantly

## Roadmap

- **Phase 1** (done): Auth, AI Chat, Dashboard, Emergency
- **Phase 2** (next): Wire Forums + Booking to Firestore, push notifications
- **Phase 3**: Admin tools, moderation, analytics, store submission

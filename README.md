# Theraklick Mobile

Cross-platform (iOS/Android) React Native mobile app for **Theraklick** — a student-focused mental health platform for Africa, starting with Ghana.

This mobile app reuses the same **Firebase project** and **Next.js API backend** as the [web app](https://github.com/Kelvinoppong/theraclick).

## Tech Stack

- **React Native** (Expo SDK 52)
- **TypeScript**
- **Firebase Auth + Firestore** (shared with web)
- **React Navigation** (native stack + bottom tabs)
- **Axios** (API client to Next.js backend)
- **Expo Notifications** (push notifications)
- **Expo Secure Store** (admin token storage)

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
App.tsx                             # Entry point
src/
  context/
    AuthContext.tsx                  # Auth state (mirrors web context/auth.tsx)
  navigation/
    RootStack.tsx                   # Auth flow vs main app routing
    BottomTabs.tsx                  # Role-aware tab layout
  screens/
    WelcomeScreen.tsx               # Landing
    RoleSelectionScreen.tsx         # Student / Peer Mentor / Counselor
    StudentSignupScreen.tsx         # Student registration
    MentorApplyScreen.tsx           # Mentor/Counselor application
    LoginScreen.tsx                 # Email login
    PendingApprovalScreen.tsx       # Waiting for admin approval
    StudentDashboardScreen.tsx      # Student home
    MentorDashboardScreen.tsx       # Peer Mentor home (DM threads, stats)
    CounselorDashboardScreen.tsx    # Counselor home (bookings, DMs, stats)
    ChatScreen.tsx                  # AI chat (calls POST /api/ai/chat)
    ForumsScreen.tsx                # Community forums (Firestore-backed)
    BookingScreen.tsx               # Counselor booking (Firestore-backed)
    DirectMessageScreen.tsx         # Real-time DM (student ↔ mentor/counselor)
    EmergencyScreen.tsx             # Crisis resources (Ghana)
    AdminScreen.tsx                 # Admin panel (approve/reject users)
    ProfileScreen.tsx               # Profile & settings (anonymous toggle)
  services/
    firebase.ts                     # Firebase client init
    apiClient.ts                    # HTTP client for Next.js API routes
    chatStore.ts                    # AI chat persistence
    forumStore.ts                   # Forum CRUD + real-time
    bookingStore.ts                 # Booking CRUD + real-time
    messagingStore.ts               # Direct messaging (Firestore)
    notifications.ts                # Push notifications (Expo)
  components/
    MessageBubble.tsx               # Chat message bubble
    ChatInput.tsx                   # Text input + send button
    LoadingIndicator.tsx            # Typing indicator (animated dots)
  shared/
    types.ts                        # Shared TypeScript types
    safety.ts                       # Crisis detection + emergency resources
```

## Features

### Authentication & Roles
- Email/password signup and login
- Three roles: Student, Peer Mentor, Counselor
- Admin approval required for mentors/counselors
- Demo mode when Firebase is not configured

### AI Chat
- Calls the web backend's `POST /api/ai/chat` endpoint
- Crisis keyword detection (client-side + server-side)
- Chat history persisted to Firestore
- Typing indicator animation

### Community Forums
- Anonymous posting by category (Exams, Anxiety, Relationships, Vent)
- Real-time Firestore listeners
- Report/flag inappropriate posts

### Counselor Booking
- Browse active counselors and their availability
- Create bookings saved to Firestore
- Track booking status (pending → confirmed → completed)
- Cancel bookings

### Direct Messaging
- Real-time DM between students and mentors/counselors
- Uses Firestore `directMessages` collection (shared with web)
- Participant-locked security rules

### Role-Specific Dashboards
- **Student**: Quick actions, emergency button, privacy info
- **Peer Mentor**: Active chat threads, escalation stats
- **Counselor**: Upcoming sessions, student messages, stats

### Profile & Settings
- View/edit profile
- Toggle anonymous mode (students)
- Account status display

### Admin Panel
- Authenticate with admin token
- View pending mentor/counselor applications
- Approve or reject accounts

### Safety
- Client-side crisis keyword detection
- Emergency screen with Ghana crisis resources
- One-tap emergency calling

### Push Notifications
- Expo push token registration
- Token stored in Firestore for server-side triggers
- Local notification scheduling (booking reminders)

## Backend API Endpoints (from web app)

| Method | Endpoint                         | Auth           | Description          |
|--------|----------------------------------|----------------|----------------------|
| POST   | `/api/ai/chat`                   | None (public)  | AI chat              |
| POST   | `/api/admin/login`               | None           | Admin login          |
| POST   | `/api/admin/create`              | None           | Create admin account |
| GET    | `/api/admin/pending`             | Bearer token   | List pending users   |
| POST   | `/api/admin/users/:uid/approve`  | Bearer token   | Approve user         |
| POST   | `/api/admin/users/:uid/reject`   | Bearer token   | Reject user          |

## Firestore Collections

| Collection                                    | Description                    |
|-----------------------------------------------|--------------------------------|
| `users/{uid}`                                 | User profiles                  |
| `users/{uid}/aiThreads/{tid}/messages/{mid}`  | AI chat history                |
| `users/{uid}/devices/{did}`                   | Push notification tokens       |
| `forums/{fid}`                                | Forum posts                    |
| `bookings/{bid}`                              | Counselor bookings             |
| `directMessages/{cid}`                        | DM threads                     |
| `directMessages/{cid}/messages/{mid}`         | DM messages                    |
| `admins/{aid}`                                | Admin accounts                 |

## Design Principles

- **Anonymity first** — students use the app without real names
- **Text-first** — chat is the default interaction mode
- **Layered support** — AI Chat → Peer Support → Counselor → Emergency
- **Low cognitive load** — calming UI, few choices at a time
- **Safety** — crisis keywords trigger Emergency screen instantly

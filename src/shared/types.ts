/**
 * Shared types mirroring the web app's data model.
 * Keep in sync with Kelvinoppong/theraclick context/auth.tsx + firestore.rules.
 */

export type UserRole = "student" | "peer-mentor" | "counselor";
export type AccountStatus = "active" | "pending" | "disabled";

export type UserProfile = {
  uid: string;
  role: UserRole | null;
  status: AccountStatus;

  fullName: string | null;
  email: string | null;

  // Student-only anonymous display layer
  anonymousEnabled: boolean;
  anonymousId: string | null;

  student?: {
    schoolEmail: string | null;
    educationLevel: string | null;
    school: string | null;
  };

  application?: {
    specialization: string | null;
    about: string | null;
  };

  avatar?: string | null;
  profilePicture?: string | null;
};

export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type StoredChatMessage = {
  id: string;
  sender: "user" | "ai";
  text: string;
  createdAt: number;
};

export type UserContext = {
  role?: UserRole;
  displayName?: string;
  school?: string;
  educationLevel?: string;
  country?: string;
};

export type AiChatResponse = {
  ok: boolean;
  mode?: "crisis" | "gemini" | "openai" | "demo";
  message?: string;
  error?: string;
};

export type ForumPost = {
  id: string;
  authorId: string;
  anonymousName: string;
  content: string;
  category: string;
  createdAt: number;
  flagged: boolean;
};

export type Booking = {
  id: string;
  studentId: string;
  counselorId: string;
  date: string;
  time: string;
  status: "pending" | "confirmed" | "completed" | "cancelled";
  notes?: string;
};

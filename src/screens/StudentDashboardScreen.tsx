/**
 * StudentDashboardScreen — student home with quick actions,
 * DM threads (counselor messages), and upcoming bookings.
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { doc, getDoc } from "firebase/firestore";

import type { RootStackParamList } from "../navigation/RootStack";
import { useAuth } from "../context/AuthContext";
import {
  subscribeToDmThreads,
  DirectChat,
} from "../services/messagingStore";
import { subscribeToStudentBookings } from "../services/bookingStore";
import { db, firebaseIsReady } from "../services/firebase";
import type { Booking } from "../shared/types";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const QUICK_ACTIONS = [
  { label: "Talk to AI", emoji: "💬", tab: "Chat" },
  { label: "Community", emoji: "👥", tab: "Forums" },
  { label: "Book Counselor", emoji: "📅", tab: "Booking" },
];

export function StudentDashboardScreen() {
  const { profile, logout } = useAuth();
  const nav = useNavigation<Nav>();

  const [threads, setThreads] = useState<DirectChat[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [bookings, setBookings] = useState<Booking[]>([]);

  // Subscribe to DM threads
  useEffect(() => {
    if (!profile) return;
    const unsub = subscribeToDmThreads(profile.uid, setThreads);
    return () => unsub();
  }, [profile]);

  // Subscribe to bookings
  useEffect(() => {
    if (!profile) return;
    const unsub = subscribeToStudentBookings(profile.uid, setBookings);
    return () => unsub();
  }, [profile]);

  // Resolve other participant names
  useEffect(() => {
    if (!profile || !firebaseIsReady || !db) return;
    const uids = threads
      .flatMap((t) => t.participants)
      .filter((uid) => uid !== profile.uid && !names[uid]);

    const unique = [...new Set(uids)];
    if (unique.length === 0) return;

    unique.forEach(async (uid) => {
      try {
        const snap = await getDoc(doc(db!, "users", uid));
        const data = snap.data();
        if (data?.fullName) {
          setNames((prev) => ({ ...prev, [uid]: data.fullName }));
        }
      } catch {}
    });
  }, [threads, profile]);

  const displayName =
    profile?.anonymousEnabled && profile.anonymousId
      ? profile.anonymousId
      : (profile?.fullName || "Friend");

  const upcomingBookings = bookings.filter(
    (b) => b.status === "confirmed" || b.status === "pending"
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hey, {displayName}</Text>
            <Text style={styles.subGreeting}>How are you feeling today?</Text>
          </View>
          <TouchableOpacity onPress={logout}>
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
        </View>

        {/* Quick actions */}
        <View style={styles.actions}>
          {QUICK_ACTIONS.map((a) => (
            <TouchableOpacity
              key={a.label}
              style={styles.actionCard}
              onPress={() => {
                const parent = nav.getParent();
                if (parent) parent.navigate(a.tab);
              }}
            >
              <Text style={styles.actionEmoji}>{a.emoji}</Text>
              <Text style={styles.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Upcoming Bookings */}
        {upcomingBookings.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Upcoming Sessions</Text>
            {upcomingBookings.slice(0, 3).map((b) => {
              const isConfirmed = b.status === "confirmed";
              return (
                <TouchableOpacity
                  key={b.id}
                  style={styles.bookingCard}
                  onPress={() => {
                    if (isConfirmed && b.dmThreadId) {
                      nav.navigate("DirectMessage", {
                        chatId: b.dmThreadId,
                        otherName: b.counselorName || "Counselor",
                      });
                    }
                  }}
                >
                  <View style={[styles.bookingDot, { backgroundColor: isConfirmed ? "#16A34A" : "#D97706" }]} />
                  <View style={styles.bookingInfo}>
                    <Text style={styles.bookingName}>{b.counselorName || "Counselor"}</Text>
                    <Text style={styles.bookingDate}>{b.date} at {b.time}</Text>
                  </View>
                  <View style={[styles.bookingBadge, { backgroundColor: isConfirmed ? "#DCFCE7" : "#FEF3C7" }]}>
                    <Text style={[styles.bookingBadgeText, { color: isConfirmed ? "#16A34A" : "#D97706" }]}>
                      {isConfirmed ? "Confirmed" : "Pending"}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* Messages */}
        {threads.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
              Messages
            </Text>
            {threads.slice(0, 5).map((t) => {
              const otherUid = t.participants.find((p) => p !== profile?.uid) || "";
              const otherName = names[otherUid] || "Counselor";
              return (
                <TouchableOpacity
                  key={t.id}
                  style={styles.threadCard}
                  onPress={() =>
                    nav.navigate("DirectMessage", {
                      chatId: t.id,
                      otherName,
                    })
                  }
                >
                  <View style={styles.threadAvatar}>
                    <Text style={styles.threadAvatarText}>
                      {otherName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.threadInfo}>
                    <Text style={styles.threadName}>{otherName}</Text>
                    <Text style={styles.threadPreview} numberOfLines={1}>
                      {t.lastMessage || "No messages yet"}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* Emergency button */}
        <TouchableOpacity
          style={styles.emergencyBtn}
          onPress={() => nav.navigate("Emergency")}
        >
          <Text style={styles.emergencyText}>
            Need urgent help? Tap here
          </Text>
        </TouchableOpacity>

        {/* Info card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Your privacy matters</Text>
          <Text style={styles.infoBody}>
            Everything you share here is anonymous. We never collect real names
            unless you choose to share them. You are safe.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  greeting: { fontSize: 24, fontWeight: "800", color: "#111827" },
  subGreeting: { fontSize: 14, color: "#6B7280", marginTop: 4 },
  logoutText: { color: "#EF4444", fontSize: 13, fontWeight: "600", marginTop: 4 },

  actions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  actionEmoji: { fontSize: 28, marginBottom: 8 },
  actionLabel: { fontSize: 12, fontWeight: "700", color: "#374151" },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
  },

  /* Booking cards */
  bookingCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  bookingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  bookingInfo: { flex: 1 },
  bookingName: { fontSize: 14, fontWeight: "600", color: "#111827" },
  bookingDate: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  bookingBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  bookingBadgeText: { fontSize: 11, fontWeight: "700" },

  /* DM threads */
  threadCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  threadAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  threadAvatarText: { fontSize: 17, fontWeight: "700", color: "#16A34A" },
  threadInfo: { flex: 1 },
  threadName: { fontSize: 14, fontWeight: "600", color: "#111827" },
  threadPreview: { fontSize: 13, color: "#6B7280", marginTop: 2 },

  emergencyBtn: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 16,
  },
  emergencyText: { color: "#DC2626", fontSize: 14, fontWeight: "700" },

  infoCard: {
    backgroundColor: "#ECFDF5",
    borderRadius: 14,
    padding: 20,
  },
  infoTitle: { fontSize: 15, fontWeight: "700", color: "#065F46", marginBottom: 6 },
  infoBody: { fontSize: 13, color: "#047857", lineHeight: 20 },
});

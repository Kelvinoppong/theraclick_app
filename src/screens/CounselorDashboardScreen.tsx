/**
 * CounselorDashboardScreen — counselor home with booking management.
 *
 * Shows:
 *   - Stats (pending requests, confirmed, total)
 *   - "Manage Availability" button
 *   - Pending booking requests with Accept / Reject
 *   - Confirmed upcoming sessions with "Message" button
 *   - DM threads
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useAuth } from "../context/AuthContext";
import {
  subscribeToCounselorBookings,
  confirmBooking,
  rejectBooking,
} from "../services/bookingStore";
import {
  subscribeToDmThreads,
  DirectChat,
} from "../services/messagingStore";
import type { Booking } from "../shared/types";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending: { bg: "#FEF3C7", text: "#D97706" },
  confirmed: { bg: "#DCFCE7", text: "#16A34A" },
  completed: { bg: "#E0E7FF", text: "#6366F1" },
  cancelled: { bg: "#FEE2E2", text: "#DC2626" },
};

export function CounselorDashboardScreen() {
  const { profile } = useAuth();
  const nav = useNavigation<Nav>();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [threads, setThreads] = useState<DirectChat[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!profile) return;
    const unsub = subscribeToCounselorBookings(profile.uid, setBookings);
    return () => unsub();
  }, [profile]);

  useEffect(() => {
    if (!profile) return;
    const unsub = subscribeToDmThreads(profile.uid, setThreads);
    return () => unsub();
  }, [profile]);

  const pendingBookings = bookings.filter((b) => b.status === "pending");
  const confirmedBookings = bookings.filter((b) => b.status === "confirmed");

  const handleConfirm = (b: Booking) => {
    Alert.alert(
      "Confirm Session",
      `Accept ${b.studentName || "student"}'s request for ${formatDate(b.date)} at ${b.time}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              await confirmBooking(b.id, b);
              Alert.alert("Confirmed!", "A chat thread has been created.");
            } catch (e: any) {
              Alert.alert("Error", e?.message || "Could not confirm.");
            }
          },
        },
      ]
    );
  };

  const handleReject = (b: Booking) => {
    Alert.alert(
      "Reject Request",
      `Reject ${b.studentName || "student"}'s booking?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            try {
              await rejectBooking(b.id);
            } catch {
              Alert.alert("Error", "Could not reject.");
            }
          },
        },
      ]
    );
  };

  const displayName = profile?.fullName?.split(" ")[0] || "Counselor";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} tintColor="#16A34A" />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hi, {displayName}</Text>
            <Text style={styles.role}>Counselor Dashboard</Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { borderLeftColor: "#F59E0B" }]}>
            <Text style={styles.statNum}>{pendingBookings.length}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: "#16A34A" }]}>
            <Text style={styles.statNum}>{confirmedBookings.length}</Text>
            <Text style={styles.statLabel}>Confirmed</Text>
          </View>
          <View style={[styles.statCard, { borderLeftColor: "#6366F1" }]}>
            <Text style={styles.statNum}>{threads.length}</Text>
            <Text style={styles.statLabel}>Chats</Text>
          </View>
        </View>

        {/* Manage Availability */}
        <TouchableOpacity
          style={styles.availabilityBtn}
          onPress={() => nav.navigate("CounselorAvailability")}
        >
          <Text style={styles.availabilityIcon}>📅</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.availabilityTitle}>Manage Availability</Text>
            <Text style={styles.availabilitySubtext}>
              Set your available dates and times
            </Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        {/* Pending Requests */}
        <Text style={styles.sectionTitle}>
          Pending Requests ({pendingBookings.length})
        </Text>
        {pendingBookings.length === 0 ? (
          <Text style={styles.empty}>No pending requests.</Text>
        ) : (
          pendingBookings.map((b) => (
            <View key={b.id} style={styles.bookingCard}>
              <View style={styles.bookingTop}>
                <View style={styles.bookingAvatar}>
                  <Text style={styles.bookingAvatarText}>
                    {(b.studentName?.[0] || "S").toUpperCase()}
                  </Text>
                </View>
                <View style={styles.bookingInfo}>
                  <Text style={styles.bookingName}>
                    {b.studentName || "Student"}
                  </Text>
                  <Text style={styles.bookingDate}>
                    {formatDate(b.date)} at {b.time}
                  </Text>
                  {b.notes && (
                    <Text style={styles.bookingNotes}>{b.notes}</Text>
                  )}
                </View>
              </View>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.confirmBtn}
                  onPress={() => handleConfirm(b)}
                >
                  <Text style={styles.confirmBtnText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() => handleReject(b)}
                >
                  <Text style={styles.rejectBtnText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* Confirmed Sessions */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
          Upcoming Sessions ({confirmedBookings.length})
        </Text>
        {confirmedBookings.length === 0 ? (
          <Text style={styles.empty}>No confirmed sessions.</Text>
        ) : (
          confirmedBookings.map((b) => {
            const sc = STATUS_COLORS.confirmed;
            return (
              <View key={b.id} style={styles.bookingCard}>
                <View style={styles.bookingTop}>
                  <View
                    style={[
                      styles.bookingAvatar,
                      { backgroundColor: "#DCFCE7" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.bookingAvatarText,
                        { color: "#16A34A" },
                      ]}
                    >
                      {(b.studentName?.[0] || "S").toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.bookingInfo}>
                    <Text style={styles.bookingName}>
                      {b.studentName || "Student"}
                    </Text>
                    <Text style={styles.bookingDate}>
                      {formatDate(b.date)} at {b.time}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.statusText, { color: sc.text }]}>
                      Confirmed
                    </Text>
                  </View>
                </View>
                {b.dmThreadId && (
                  <TouchableOpacity
                    style={styles.messageBtn}
                    onPress={() =>
                      nav.navigate("DirectMessage", {
                        chatId: b.dmThreadId!,
                        otherName: b.studentName || "Student",
                      })
                    }
                  >
                    <Text style={styles.messageBtnText}>💬 Open Chat</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}

        {/* DM Threads */}
        <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
          Student Messages
        </Text>
        {threads.length === 0 ? (
          <Text style={styles.empty}>No messages yet.</Text>
        ) : (
          threads.map((t) => {
            const otherUid =
              t.participants.find((p) => p !== profile?.uid) || "unknown";
            return (
              <TouchableOpacity
                key={t.id}
                style={styles.threadCard}
                onPress={() =>
                  nav.navigate("DirectMessage", {
                    chatId: t.id,
                    otherName: otherUid.slice(0, 10),
                  })
                }
              >
                <Text style={styles.threadName}>{otherUid.slice(0, 12)}</Text>
                <Text style={styles.threadPreview} numberOfLines={1}>
                  {t.lastMessage || "No messages yet"}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scroll: { paddingBottom: 60 },

  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    marginBottom: 20,
  },
  greeting: { fontSize: 26, fontWeight: "800", color: "#111827" },
  role: { fontSize: 13, color: "#16A34A", fontWeight: "600", marginTop: 2 },

  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    borderLeftWidth: 4,
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  statNum: { fontSize: 24, fontWeight: "800", color: "#111827" },
  statLabel: { fontSize: 11, color: "#6B7280", marginTop: 4, fontWeight: "500" },

  availabilityBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    marginHorizontal: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#D1FAE5",
    gap: 12,
  },
  availabilityIcon: { fontSize: 28 },
  availabilityTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  availabilitySubtext: { fontSize: 12, color: "#6B7280", marginTop: 1 },
  chevron: { fontSize: 24, color: "#9CA3AF" },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  empty: {
    fontSize: 14,
    color: "#9CA3AF",
    paddingHorizontal: 20,
    marginBottom: 10,
  },

  bookingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  bookingTop: { flexDirection: "row", alignItems: "center" },
  bookingAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
  },
  bookingAvatarText: { fontSize: 17, fontWeight: "700", color: "#D97706" },
  bookingInfo: { flex: 1, marginLeft: 12 },
  bookingName: { fontSize: 15, fontWeight: "600", color: "#111827" },
  bookingDate: { fontSize: 13, color: "#6B7280", marginTop: 2 },
  bookingNotes: { fontSize: 12, color: "#9CA3AF", marginTop: 2, fontStyle: "italic" },

  actions: { flexDirection: "row", gap: 10, marginTop: 14 },
  confirmBtn: {
    flex: 1,
    backgroundColor: "#16A34A",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  confirmBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  rejectBtn: {
    flex: 1,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  rejectBtnText: { color: "#DC2626", fontWeight: "700", fontSize: 14 },

  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  statusText: { fontSize: 11, fontWeight: "700" },

  messageBtn: {
    marginTop: 12,
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D1FAE5",
  },
  messageBtnText: { fontSize: 14, fontWeight: "600", color: "#16A34A" },

  threadCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  threadName: { fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 4 },
  threadPreview: { fontSize: 13, color: "#6B7280" },
});

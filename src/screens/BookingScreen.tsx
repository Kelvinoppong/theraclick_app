/**
 * BookingScreen — counselor appointment view.
 *
 * Inspired by the reference UI:
 *   - Horizontal week-day picker at the top
 *   - Timeline view with appointment cards
 *   - Empty state with friendly message + "Explore Counselors"
 *   - Reschedule / Cancel actions on each card
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useAuth } from "../context/AuthContext";
import {
  cancelBooking,
  completeBooking,
  parseBookingDateTime,
  subscribeToStudentBookings,
} from "../services/bookingStore";
import type { Booking } from "../shared/types";
import type { RootStackParamList } from "../navigation/RootStack";
import { WeekDayPicker } from "../components/WeekDayPicker";

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Time slots for the timeline
const TIMELINE_HOURS = [
  "7 AM", "8 AM", "9 AM", "10 AM", "11 AM",
  "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM",
];

export function BookingScreen() {
  const { profile } = useAuth();
  const nav = useNavigation<Nav>();

  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    const unsub = subscribeToStudentBookings(profile.uid, (b) => {
      setBookings(b);
      setLoading(false);
    });
    return () => unsub();
  }, [profile]);

  // Auto-mark past bookings as completed
  useEffect(() => {
    if (bookings.length === 0) return;
    const now = new Date();
    bookings.forEach((b) => {
      if (b.status !== "confirmed" && b.status !== "pending") return;
      const dt = parseBookingDateTime(b.date, b.time);
      if (!dt) return;
      // Give 1 hour buffer after the slot time before marking complete
      const endTime = new Date(dt.getTime() + 60 * 60 * 1000);
      if (now > endTime) {
        completeBooking(b.id);
      }
    });
  }, [bookings]);

  // Use local date (not UTC) to avoid timezone offset bugs
  const y = selectedDate.getFullYear();
  const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
  const d = String(selectedDate.getDate()).padStart(2, "0");
  const dateStr = `${y}-${m}-${d}`;
  const dayBookings = bookings.filter(
    (b) => b.date === dateStr && b.status !== "cancelled"
  );

  // All upcoming (confirmed + pending) that haven't passed yet
  const now = new Date();
  const upcoming = bookings.filter((b) => {
    if (b.status !== "confirmed" && b.status !== "pending") return false;
    const dt = parseBookingDateTime(b.date, b.time);
    if (!dt) return true; // keep if we can't parse (safe fallback)
    return dt >= now;
  });

  const handleCancel = (bookingId: string) => {
    Alert.alert("Cancel Appointment", "Are you sure you want to cancel?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, cancel",
        style: "destructive",
        onPress: () => cancelBooking(bookingId),
      },
    ]);
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "confirmed":
        return { bg: "#DCFCE7", color: "#16A34A", label: "Confirmed" };
      case "pending":
        return { bg: "#FEF3C7", color: "#D97706", label: "Pending" };
      case "completed":
        return { bg: "#F3F4F6", color: "#6B7280", label: "Completed" };
      default:
        return { bg: "#F3F4F6", color: "#6B7280", label: status };
    }
  };

  const formatSelectedDate = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const todayY = now.getFullYear();
    const todayM = now.getMonth();
    const todayD = now.getDate();

    const selY = selectedDate.getFullYear();
    const selM = selectedDate.getMonth();
    const selD = selectedDate.getDate();

    // Same year, month, and day = today
    if (selY === todayY && selM === todayM && selD === todayD) return "Today";

    // Check tomorrow by comparing numeric values directly
    const tmrw = new Date(todayY, todayM, todayD + 1);
    if (selY === tmrw.getFullYear() && selM === tmrw.getMonth() && selD === tmrw.getDate()) {
      return "Tomorrow";
    }

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[selM]} ${selD}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Counselor Appointments</Text>
      </View>

      {/* Week day picker */}
      <WeekDayPicker
        selectedDate={selectedDate}
        onSelectDate={setSelectedDate}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {loading ? (
          <ActivityIndicator color="#16A34A" style={{ marginTop: 40 }} />
        ) : dayBookings.length === 0 ? (
          /* Empty state */
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIllustration}>
              <Text style={styles.emptyEmoji}>🌿</Text>
              <View style={styles.emptyCircle}>
                <Text style={styles.emptyPersonEmoji}>🧑‍⚕️</Text>
              </View>
            </View>

            <Text style={styles.emptyTitle}>
              You don't have any{"\n"}appointment for {formatSelectedDate()}.
            </Text>
            <Text style={styles.emptySubtitle}>
              Let's add a new one to improve your{"\n"}mental health state.
            </Text>

            <TouchableOpacity
              style={styles.exploreCta}
              onPress={() => nav.navigate("CounselorList" as any)}
            >
              <Text style={styles.exploreCtaText}>Explore Counselors</Text>
              <Text style={styles.exploreCtaArrow}>→</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Timeline view */
          <View style={styles.timeline}>
            {TIMELINE_HOURS.map((hour) => {
              // Normalize: "10:00 AM" → "10 AM" to match timeline labels
              const hourBookings = dayBookings.filter((b) => {
                const normalized = b.time.replace(/:00/g, "").replace(/:30/g, "");
                return normalized.toLowerCase() === hour.toLowerCase();
              });

              return (
                <View key={hour} style={styles.timeRow}>
                  <Text style={styles.timeLabel}>{hour}</Text>
                  <View style={styles.timeLine} />

                  {hourBookings.length > 0 ? (
                    <View style={styles.timeCards}>
                      {hourBookings.map((b) => {
                        const badge = statusBadge(b.status);
                        return (
                          <View key={b.id} style={styles.appointmentCard}>
                            <View style={styles.cardRow}>
                              <View style={styles.avatarCircle}>
                                <Text style={styles.avatarText}>
                                  {(b.counselorName || "C").charAt(0).toUpperCase()}
                                </Text>
                              </View>
                              <View style={styles.cardInfo}>
                                <Text style={styles.counselorName}>
                                  {b.counselorName || "Counselor"}
                                </Text>
                                <Text style={styles.specText}>🩺 Mental Health Session</Text>
                              </View>
                              <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                                <Text style={[styles.statusText, { color: badge.color }]}>
                                  {badge.label}
                                </Text>
                              </View>
                            </View>

                            <Text style={styles.sessionTopic}>
                              {b.time} — {b.date}
                            </Text>

                            <View style={styles.cardActions}>
                              {b.status === "confirmed" && b.dmThreadId && (
                                <TouchableOpacity
                                  onPress={() =>
                                    nav.navigate("DirectMessage", {
                                      chatId: b.dmThreadId!,
                                      otherName: b.counselorName || "Counselor",
                                    })
                                  }
                                >
                                  <Text style={styles.messageText}>💬 Message</Text>
                                </TouchableOpacity>
                              )}
                              {b.status !== "completed" && (
                                <TouchableOpacity onPress={() => handleCancel(b.id)}>
                                  <Text style={styles.cancelText}>Cancel</Text>
                                </TouchableOpacity>
                              )}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <View style={styles.emptySlot} />
                  )}
                </View>
              );
            })}
          </View>
        )}
        {/* Upcoming sessions (always visible) */}
        {upcoming.length > 0 && (
          <View style={styles.upcomingSection}>
            <Text style={styles.upcomingTitle}>
              All Upcoming ({upcoming.length})
            </Text>
            {upcoming.map((b) => {
              const badge = statusBadge(b.status);
              return (
                <View key={b.id} style={styles.upcomingCard}>
                  <View style={styles.upcomingLeft}>
                    <View
                      style={[
                        styles.upcomingDot,
                        { backgroundColor: badge.color },
                      ]}
                    />
                    <View>
                      <Text style={styles.upcomingName}>
                        {b.counselorName || "Counselor"}
                      </Text>
                      <Text style={styles.upcomingDate}>
                        {b.date} at {b.time}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: badge.bg },
                    ]}
                  >
                    <Text
                      style={[styles.statusText, { color: badge.color }]}
                    >
                      {badge.label}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0FDF4" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#111827" },
  scroll: { paddingBottom: 100 },

  /* Empty state */
  emptyContainer: {
    alignItems: "center",
    paddingTop: 40,
    paddingHorizontal: 32,
  },
  emptyIllustration: {
    width: 200,
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyEmoji: {
    fontSize: 80,
    position: "absolute",
    opacity: 0.3,
    top: 10,
    left: 20,
  },
  emptyCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyPersonEmoji: { fontSize: 56 },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    textAlign: "center",
    lineHeight: 30,
    marginBottom: 10,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  exploreCta: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#16A34A",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 32,
    gap: 10,
    width: "100%",
    justifyContent: "center",
  },
  exploreCtaText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  exploreCtaArrow: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },

  /* Timeline */
  timeline: { paddingLeft: 16, paddingRight: 20 },
  timeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    minHeight: 72,
  },
  timeLabel: {
    width: 52,
    fontSize: 12,
    fontWeight: "600",
    color: "#9CA3AF",
    paddingTop: 2,
  },
  timeLine: {
    width: 1,
    backgroundColor: "#E5E7EB",
    alignSelf: "stretch",
    marginRight: 14,
  },
  timeCards: { flex: 1, paddingVertical: 4 },
  emptySlot: { flex: 1 },

  /* Appointment card */
  appointmentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  avatarCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  avatarText: { fontSize: 18, fontWeight: "800", color: "#16A34A" },
  cardInfo: { flex: 1 },
  counselorName: { fontSize: 14, fontWeight: "700", color: "#111827" },
  specRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  specText: { fontSize: 11, color: "#6B7280" },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingText: { fontSize: 11, color: "#D97706", fontWeight: "600" },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: { fontSize: 10, fontWeight: "700" },
  sessionTopic: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "500",
    marginBottom: 10,
  },
  cardActions: {
    flexDirection: "row",
    gap: 16,
  },
  messageText: { fontSize: 12, fontWeight: "700", color: "#16A34A" },
  cancelText: { fontSize: 12, fontWeight: "700", color: "#EF4444" },

  /* Upcoming section */
  upcomingSection: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  upcomingTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
  },
  upcomingCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  upcomingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  upcomingDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  upcomingName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  upcomingDate: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
});

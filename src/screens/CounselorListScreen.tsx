/**
 * CounselorListScreen — students browse counselors and pick a real slot.
 *
 * Slots are now specific dates+times from Firestore, grouped by date.
 * On booking: stores studentName + counselorName for display.
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";

import { useAuth } from "../context/AuthContext";
import {
  loadCounselors,
  createBooking,
  type CounselorInfo,
  type CounselorSlot,
} from "../services/bookingStore";
import { sendImmediateNotification } from "../services/notifications";
import { addNotification } from "../services/notificationStore";

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function CounselorListScreen() {
  const { profile } = useAuth();
  const nav = useNavigation();

  const [counselors, setCounselors] = useState<CounselorInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlot, setSelectedSlot] = useState<
    Record<string, CounselorSlot>
  >({});
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    loadCounselors()
      .then(setCounselors)
      .finally(() => setLoading(false));
  }, []);

  const handleBook = async (counselor: CounselorInfo) => {
    const slot = selectedSlot[counselor.uid];
    if (!slot || !profile) {
      Alert.alert("Select a time", "Pick an available slot first.");
      return;
    }

    setBooking(true);
    try {
      await createBooking({
        studentId: profile.uid,
        counselorId: counselor.uid,
        studentName: profile.fullName || "Student",
        counselorName: counselor.fullName,
        date: slot.date,
        time: slot.time,
      });

      const notifTitle = "Booking Requested";
      const notifBody = `Your request with ${counselor.fullName} for ${formatDateLabel(slot.date)} at ${slot.time} has been sent. Waiting for confirmation.`;

      sendImmediateNotification(notifTitle, notifBody);
      addNotification({
        type: "booking_created",
        title: notifTitle,
        body: notifBody,
        screen: "Booking",
      });

      Alert.alert(
        "Request Sent!",
        `Your booking request with ${counselor.fullName} for ${formatDateLabel(slot.date)} at ${slot.time} is pending confirmation.`,
        [{ text: "OK", onPress: () => nav.goBack() }]
      );
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not book.");
    } finally {
      setBooking(false);
    }
  };

  const toggleSlot = (counselorId: string, slot: CounselorSlot) => {
    setSelectedSlot((prev) => {
      const current = prev[counselorId];
      if (current?.date === slot.date && current?.time === slot.time) {
        const copy = { ...prev };
        delete copy[counselorId];
        return copy;
      }
      return { ...prev, [counselorId]: slot };
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color="#16A34A" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={counselors}
        keyExtractor={(c) => c.uid}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.heading}>Explore Counselors</Text>
            <Text style={styles.subtitle}>
              Pick a counselor and a time that works for you
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const selected = selectedSlot[item.uid];

          // Group slots by date
          const grouped: Record<string, CounselorSlot[]> = {};
          for (const s of item.slots) {
            if (!grouped[s.date]) grouped[s.date] = [];
            grouped[s.date].push(s);
          }
          const groupedEntries = Object.entries(grouped);

          return (
            <View style={styles.counselorCard}>
              {/* Top row */}
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {item.fullName.charAt(0)}
                  </Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.name}>{item.fullName}</Text>
                  <Text style={styles.spec}>🩺 {item.specialization}</Text>
                  <View style={styles.ratingRow}>
                    <View style={styles.onlineBadge}>
                      <View style={styles.onlineDot} />
                      <Text style={styles.onlineText}>Available</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Slots grouped by date */}
              {groupedEntries.length === 0 ? (
                <Text style={styles.noSlots}>
                  No available slots right now
                </Text>
              ) : (
                groupedEntries.map(([date, dateSlots]) => (
                  <View key={date} style={styles.dateGroup}>
                    <Text style={styles.dateLabel}>
                      {formatDateLabel(date)}
                    </Text>
                    <View style={styles.slotsRow}>
                      {dateSlots.map((slot) => {
                        const isSelected =
                          selected?.date === slot.date &&
                          selected?.time === slot.time;
                        return (
                          <TouchableOpacity
                            key={`${slot.date}-${slot.time}`}
                            style={[
                              styles.slotChip,
                              isSelected && styles.slotChipActive,
                            ]}
                            onPress={() => toggleSlot(item.uid, slot)}
                          >
                            <Text
                              style={[
                                styles.slotText,
                                isSelected && styles.slotTextActive,
                              ]}
                            >
                              {slot.time}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ))
              )}

              {/* Book button */}
              <TouchableOpacity
                style={[
                  styles.bookBtn,
                  (!selected || booking) && styles.bookBtnDisabled,
                ]}
                onPress={() => handleBook(item)}
                disabled={!selected || booking}
              >
                {booking ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.bookBtnText}>
                    {selected
                      ? `Request ${formatDateLabel(selected.date)} at ${selected.time}`
                      : "Select a slot to book"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>🩺</Text>
            <Text style={styles.emptyTitle}>No counselors available</Text>
            <Text style={styles.emptySubtext}>
              Check back later — new counselors are being approved regularly.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  list: { paddingBottom: 40 },
  header: { paddingHorizontal: 20, paddingTop: 12, marginBottom: 16 },
  heading: { fontSize: 24, fontWeight: "800", color: "#111827" },
  subtitle: { fontSize: 13, color: "#6B7280", marginTop: 4 },

  counselorCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardTop: { flexDirection: "row", marginBottom: 14 },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#DCFCE7",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: { fontSize: 22, fontWeight: "800", color: "#16A34A" },
  cardInfo: { flex: 1 },
  name: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 3 },
  spec: { fontSize: 12, color: "#6B7280", marginBottom: 4 },
  ratingRow: { flexDirection: "row", alignItems: "center" },
  onlineBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16A34A",
  },
  onlineText: { fontSize: 11, color: "#16A34A", fontWeight: "600" },

  noSlots: {
    fontSize: 13,
    color: "#9CA3AF",
    fontStyle: "italic",
    marginBottom: 12,
  },

  dateGroup: { marginBottom: 12 },
  dateLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 6,
  },
  slotsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  slotChip: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  slotChipActive: { backgroundColor: "#DCFCE7", borderColor: "#16A34A" },
  slotText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  slotTextActive: { color: "#16A34A" },

  bookBtn: {
    backgroundColor: "#16A34A",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  bookBtnDisabled: { opacity: 0.35 },
  bookBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },

  emptyWrap: { alignItems: "center", marginTop: 60 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  emptySubtext: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: 40,
  },
});

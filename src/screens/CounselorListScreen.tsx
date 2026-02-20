/**
 * CounselorListScreen — browse available counselors and book a slot.
 *
 * Shows counselor cards with:
 *   - Avatar, name, specialization, rating
 *   - Available time slots
 *   - One-tap booking
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
  CounselorInfo,
} from "../services/bookingStore";
import { sendImmediateNotification } from "../services/notifications";
import { addNotification } from "../services/notificationStore";

export function CounselorListScreen() {
  const { profile } = useAuth();
  const nav = useNavigation();

  const [counselors, setCounselors] = useState<CounselorInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSlots, setSelectedSlots] = useState<Record<string, string>>({});
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    loadCounselors()
      .then(setCounselors)
      .finally(() => setLoading(false));
  }, []);

  const handleBook = async (counselor: CounselorInfo) => {
    const slot = selectedSlots[counselor.uid];
    if (!slot || !profile) {
      Alert.alert("Select a time", "Pick an available slot first.");
      return;
    }

    setBooking(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      await createBooking({
        studentId: profile.uid,
        counselorId: counselor.uid,
        date: today,
        time: slot,
      });

      const notifTitle = "Booking Confirmed ✓";
      const notifBody = `Your session with ${counselor.fullName} at ${slot} has been scheduled.`;

      // OS notification + in-app feed
      sendImmediateNotification(notifTitle, notifBody);
      addNotification({
        type: "booking_created",
        title: notifTitle,
        body: notifBody,
        screen: "Booking",
      });

      Alert.alert(
        "Booked!",
        `Your session with ${counselor.fullName} at ${slot} is confirmed.`,
        [{ text: "OK", onPress: () => nav.goBack() }]
      );
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not book.");
    } finally {
      setBooking(false);
    }
  };

  const selectSlot = (counselorId: string, slot: string) => {
    setSelectedSlots((prev) => ({
      ...prev,
      [counselorId]: prev[counselorId] === slot ? "" : slot,
    }));
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
              Find a counselor that fits your needs
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const selected = selectedSlots[item.uid];
          return (
            <View style={styles.counselorCard}>
              {/* Top row: avatar + info */}
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {item.fullName.charAt(0)}
                  </Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.name}>{item.fullName}</Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.spec}>🩺 {item.specialization}</Text>
                  </View>
                  <View style={styles.ratingRow}>
                    <Text style={styles.rating}>⭐ 4.5</Text>
                    <View style={styles.onlineBadge}>
                      <View style={styles.onlineDot} />
                      <Text style={styles.onlineText}>Available</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Time slots */}
              <Text style={styles.slotsLabel}>Available times</Text>
              <View style={styles.slotsRow}>
                {item.slots.map((slot) => (
                  <TouchableOpacity
                    key={slot}
                    style={[
                      styles.slotChip,
                      selected === slot && styles.slotChipActive,
                    ]}
                    onPress={() => selectSlot(item.uid, slot)}
                  >
                    <Text
                      style={[
                        styles.slotText,
                        selected === slot && styles.slotTextActive,
                      ]}
                    >
                      {slot}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

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
                    {selected ? `Book at ${selected}` : "Select a time"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>No counselors available right now.</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0FDF4" },
  list: { paddingBottom: 40 },
  header: { paddingHorizontal: 20, paddingTop: 12, marginBottom: 16 },
  heading: { fontSize: 24, fontWeight: "800", color: "#111827" },
  subtitle: { fontSize: 13, color: "#6B7280", marginTop: 4 },
  empty: { fontSize: 14, color: "#9CA3AF", textAlign: "center", marginTop: 40 },

  counselorCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
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
  metaRow: { marginBottom: 4 },
  spec: { fontSize: 12, color: "#6B7280" },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  rating: { fontSize: 12, color: "#D97706", fontWeight: "600" },
  onlineBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16A34A",
  },
  onlineText: { fontSize: 11, color: "#16A34A", fontWeight: "600" },

  slotsLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    marginBottom: 8,
  },
  slotsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 },
  slotChip: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  slotChipActive: {
    backgroundColor: "#DCFCE7",
    borderColor: "#16A34A",
  },
  slotText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  slotTextActive: { color: "#16A34A" },

  bookBtn: {
    backgroundColor: "#16A34A",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  bookBtnDisabled: { opacity: 0.35 },
  bookBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
});

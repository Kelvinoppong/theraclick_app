/**
 * BookingScreen — counselor booking backed by Firestore.
 *
 * Two sections:
 *   1. Available counselors + pick a slot → create booking
 *   2. Your upcoming bookings (real-time updates)
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../context/AuthContext";
import {
  loadCounselors,
  createBooking,
  cancelBooking,
  subscribeToStudentBookings,
  CounselorInfo,
} from "../services/bookingStore";
import type { Booking } from "../shared/types";

export function BookingScreen() {
  const { profile } = useAuth();

  const [counselors, setCounselors] = useState<CounselorInfo[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedCounselor, setSelectedCounselor] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [loadingCounselors, setLoadingCounselors] = useState(true);
  const [booking, setBooking] = useState(false);

  // Load counselors
  useEffect(() => {
    loadCounselors()
      .then(setCounselors)
      .finally(() => setLoadingCounselors(false));
  }, []);

  // Subscribe to user's bookings
  useEffect(() => {
    if (!profile) return;
    const unsub = subscribeToStudentBookings(profile.uid, setBookings);
    return () => unsub();
  }, [profile]);

  const handleBook = async () => {
    if (!selectedCounselor || !selectedSlot || !profile) return;

    setBooking(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      await createBooking({
        studentId: profile.uid,
        counselorId: selectedCounselor,
        date: today,
        time: selectedSlot,
      });
      Alert.alert("Booked", `Your session at ${selectedSlot} is confirmed.`);
      setSelectedSlot(null);
      setSelectedCounselor(null);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not create booking.");
    } finally {
      setBooking(false);
    }
  };

  const handleCancel = (bookingId: string) => {
    Alert.alert("Cancel Booking", "Are you sure?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, cancel",
        style: "destructive",
        onPress: () => cancelBooking(bookingId),
      },
    ]);
  };

  const statusColor = (s: string) => {
    switch (s) {
      case "confirmed": return "#16A34A";
      case "pending": return "#F59E0B";
      case "completed": return "#6B7280";
      case "cancelled": return "#EF4444";
      default: return "#6B7280";
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>Book a Counselor</Text>
        <Text style={styles.subtitle}>
          Select a counselor and pick a time.
        </Text>

        {/* Counselor list */}
        {loadingCounselors ? (
          <ActivityIndicator color="#16A34A" style={{ marginVertical: 20 }} />
        ) : counselors.length === 0 ? (
          <Text style={styles.empty}>No counselors available right now.</Text>
        ) : (
          counselors.map((c) => (
            <View key={c.uid} style={styles.counselorCard}>
              <TouchableOpacity
                onPress={() => {
                  setSelectedCounselor(selectedCounselor === c.uid ? null : c.uid);
                  setSelectedSlot(null);
                }}
              >
                <Text style={styles.counselorName}>{c.fullName}</Text>
                <Text style={styles.counselorSpec}>{c.specialization}</Text>
              </TouchableOpacity>

              {selectedCounselor === c.uid && (
                <View style={styles.slots}>
                  {c.slots.map((slot) => (
                    <TouchableOpacity
                      key={slot}
                      style={[
                        styles.slotChip,
                        selectedSlot === slot && styles.slotChipActive,
                      ]}
                      onPress={() => setSelectedSlot(slot)}
                    >
                      <Text
                        style={[
                          styles.slotText,
                          selectedSlot === slot && styles.slotTextActive,
                        ]}
                      >
                        {slot}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          ))
        )}

        <TouchableOpacity
          style={[styles.bookBtn, (!selectedSlot || booking) && styles.bookBtnDisabled]}
          onPress={handleBook}
          disabled={!selectedSlot || booking}
        >
          {booking ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.bookBtnText}>Confirm Booking</Text>
          )}
        </TouchableOpacity>

        {/* My bookings */}
        {bookings.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Your Bookings</Text>
            {bookings.map((b) => (
              <View key={b.id} style={styles.bookingCard}>
                <View style={styles.bookingRow}>
                  <Text style={styles.bookingTime}>
                    {b.date} — {b.time}
                  </Text>
                  <Text style={[styles.bookingStatus, { color: statusColor(b.status) }]}>
                    {b.status}
                  </Text>
                </View>
                {b.status === "pending" && (
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => handleCancel(b.id)}
                  >
                    <Text style={styles.cancelText}>Cancel</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0FDF4" },
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 60 },
  heading: { fontSize: 24, fontWeight: "800", color: "#111827", marginBottom: 4 },
  subtitle: { fontSize: 13, color: "#6B7280", marginBottom: 20 },
  empty: { fontSize: 14, color: "#9CA3AF", textAlign: "center", marginVertical: 20 },
  counselorCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  counselorName: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 2 },
  counselorSpec: { fontSize: 13, color: "#6B7280" },
  slots: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  slotChip: {
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  slotChipActive: { backgroundColor: "#16A34A", borderColor: "#16A34A" },
  slotText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  slotTextActive: { color: "#FFFFFF" },
  bookBtn: {
    backgroundColor: "#16A34A",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 10,
    marginBottom: 28,
  },
  bookBtnDisabled: { opacity: 0.4 },
  bookBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
  },
  bookingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  bookingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  bookingTime: { fontSize: 14, fontWeight: "600", color: "#374151" },
  bookingStatus: { fontSize: 12, fontWeight: "700", textTransform: "capitalize" },
  cancelBtn: { marginTop: 8, alignSelf: "flex-end" },
  cancelText: { fontSize: 12, color: "#EF4444", fontWeight: "600" },
});

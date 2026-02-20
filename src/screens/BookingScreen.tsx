/**
 * BookingScreen — counselor booking (MVP).
 *
 * Phase 1: static UI with sample counselors and time slots.
 * Phase 2: wire to Firestore bookings + availability collections.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Counselor = {
  id: string;
  name: string;
  specialization: string;
  slots: string[];
};

const SAMPLE_COUNSELORS: Counselor[] = [
  {
    id: "c1",
    name: "Dr. Ama Mensah",
    specialization: "Anxiety & Stress Management",
    slots: ["Mon 10:00 AM", "Wed 2:00 PM", "Fri 11:00 AM"],
  },
  {
    id: "c2",
    name: "Mr. Kwame Asante",
    specialization: "Academic Counseling",
    slots: ["Tue 9:00 AM", "Thu 3:00 PM"],
  },
  {
    id: "c3",
    name: "Ms. Efua Darko",
    specialization: "Relationships & Self-esteem",
    slots: ["Mon 1:00 PM", "Wed 4:00 PM", "Fri 9:00 AM"],
  },
];

export function BookingScreen() {
  const [selectedCounselor, setSelectedCounselor] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const handleBook = () => {
    if (!selectedCounselor || !selectedSlot) {
      Alert.alert("Select a slot", "Pick a counselor and time slot first.");
      return;
    }
    Alert.alert(
      "Coming soon",
      "Booking will be saved to Firestore in Phase 2. " +
        `You selected: ${selectedSlot}`
    );
    setSelectedSlot(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>Book a Counselor</Text>
        <Text style={styles.subtitle}>
          Select a counselor and pick a time that works for you.
        </Text>

        {SAMPLE_COUNSELORS.map((c) => (
          <View key={c.id} style={styles.counselorCard}>
            <TouchableOpacity
              onPress={() => {
                setSelectedCounselor(c.id);
                setSelectedSlot(null);
              }}
            >
              <Text style={styles.counselorName}>{c.name}</Text>
              <Text style={styles.counselorSpec}>{c.specialization}</Text>
            </TouchableOpacity>

            {selectedCounselor === c.id && (
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
        ))}

        <TouchableOpacity
          style={[styles.bookBtn, !selectedSlot && styles.bookBtnDisabled]}
          onPress={handleBook}
          disabled={!selectedSlot}
        >
          <Text style={styles.bookBtnText}>Confirm Booking</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0FDF4" },
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 60 },
  heading: { fontSize: 24, fontWeight: "800", color: "#111827", marginBottom: 4 },
  subtitle: { fontSize: 13, color: "#6B7280", marginBottom: 20 },
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
  slotChipActive: {
    backgroundColor: "#16A34A",
    borderColor: "#16A34A",
  },
  slotText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  slotTextActive: { color: "#FFFFFF" },
  bookBtn: {
    backgroundColor: "#16A34A",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 10,
  },
  bookBtnDisabled: { opacity: 0.4 },
  bookBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});

/**
 * CounselorAvailabilityScreen — counselors set specific date+time slots.
 *
 * UI: Pick a date → pick a time → Add. Shows all current slots
 * grouped by date with delete option.
 *
 * Stored as "YYYY-MM-DD|HH:mm A" strings in users/{uid}.availableSlots[]
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Alert,
  StyleSheet,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../context/AuthContext";
import {
  addAvailabilitySlot,
  removeAvailabilitySlot,
  getAvailabilitySlots,
} from "../services/bookingStore";

const TIME_OPTIONS = [
  "8:00 AM",
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
];

function generateDates(count: number): { label: string; value: string }[] {
  const dates: { label: string; value: string }[] = [];
  const today = new Date();
  for (let i = 1; i <= count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const value = d.toISOString().split("T")[0];
    const label = d.toLocaleDateString("en-GB", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    dates.push({ label, value });
  }
  return dates;
}

type Slot = { date: string; time: string };

export function CounselorAvailabilityScreen() {
  const { profile } = useAuth();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const dates = generateDates(21);

  const loadSlots = useCallback(async () => {
    if (!profile) return;
    try {
      const s = await getAvailabilitySlots(profile.uid);
      setSlots(s);
    } catch (e) {
      console.warn("Failed to load slots:", e);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  const handleAdd = async () => {
    if (!selectedDate || !selectedTime || !profile) return;

    const exists = slots.some(
      (s) => s.date === selectedDate && s.time === selectedTime
    );
    if (exists) {
      Alert.alert("Already added", "This slot is already in your availability.");
      return;
    }

    setAdding(true);
    try {
      await addAvailabilitySlot(profile.uid, selectedDate, selectedTime);
      setSlots((prev) =>
        [...prev, { date: selectedDate, time: selectedTime }].sort(
          (a, b) =>
            a.date.localeCompare(b.date) || a.time.localeCompare(b.time)
        )
      );
      setSelectedTime(null);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not add slot.");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (slot: Slot) => {
    if (!profile) return;
    Alert.alert("Remove slot", `Remove ${slot.date} at ${slot.time}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await removeAvailabilitySlot(profile.uid, slot.date, slot.time);
            setSlots((prev) =>
              prev.filter(
                (s) => !(s.date === slot.date && s.time === slot.time)
              )
            );
          } catch {
            Alert.alert("Error", "Could not remove slot.");
          }
        },
      },
    ]);
  };

  // Deduplicate + group slots by date for display
  const seen = new Set<string>();
  const uniqueSlots = slots.filter((s) => {
    const key = `${s.date}|${s.time}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const grouped: Record<string, Slot[]> = {};
  for (const s of uniqueSlots) {
    if (!grouped[s.date]) grouped[s.date] = [];
    grouped[s.date].push(s);
  }
  const groupedEntries = Object.entries(grouped).sort((a, b) =>
    a[0].localeCompare(b[0])
  );

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-GB", {
      weekday: "long",
      month: "short",
      day: "numeric",
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
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Set Availability</Text>
          <Text style={styles.subtitle}>
            Pick dates and times students can book with you
          </Text>
        </View>

        {/* Date Picker */}
        <Text style={styles.sectionLabel}>Select a date</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dateRow}
        >
          {dates.map((d) => (
            <TouchableOpacity
              key={d.value}
              style={[
                styles.dateChip,
                selectedDate === d.value && styles.dateChipActive,
              ]}
              onPress={() => setSelectedDate(d.value)}
            >
              <Text
                style={[
                  styles.dateChipText,
                  selectedDate === d.value && styles.dateChipTextActive,
                ]}
              >
                {d.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Time Picker */}
        {selectedDate && (
          <>
            <Text style={styles.sectionLabel}>Select a time</Text>
            <View style={styles.timesGrid}>
              {TIME_OPTIONS.map((t) => {
                const alreadyAdded = slots.some(
                  (s) => s.date === selectedDate && s.time === t
                );
                return (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.timeChip,
                      selectedTime === t && styles.timeChipActive,
                      alreadyAdded && styles.timeChipDisabled,
                    ]}
                    onPress={() => !alreadyAdded && setSelectedTime(t)}
                    disabled={alreadyAdded}
                  >
                    <Text
                      style={[
                        styles.timeChipText,
                        selectedTime === t && styles.timeChipTextActive,
                        alreadyAdded && styles.timeChipTextDisabled,
                      ]}
                    >
                      {t}
                    </Text>
                    {alreadyAdded && (
                      <Text style={styles.addedCheck}>✓</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Add Button */}
            <TouchableOpacity
              style={[
                styles.addBtn,
                (!selectedTime || adding) && styles.addBtnDisabled,
              ]}
              onPress={handleAdd}
              disabled={!selectedTime || adding}
            >
              {adding ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.addBtnText}>
                  {selectedTime
                    ? `Add ${selectedTime} slot`
                    : "Select a time above"}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}

        {/* Current Slots */}
        <Text style={[styles.sectionLabel, { marginTop: 28 }]}>
          Your Available Slots ({slots.length})
        </Text>

        {groupedEntries.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>📅</Text>
            <Text style={styles.emptyText}>No slots added yet</Text>
            <Text style={styles.emptySubtext}>
              Pick a date and time above to get started
            </Text>
          </View>
        ) : (
          groupedEntries.map(([date, dateSlots]) => (
            <View key={date} style={styles.dateGroup}>
              <Text style={styles.dateGroupLabel}>
                {formatDateLabel(date)}
              </Text>
              <View style={styles.dateGroupSlots}>
                {dateSlots.map((slot, idx) => (
                  <TouchableOpacity
                    key={`${slot.date}-${slot.time}-${idx}`}
                    style={styles.slotPill}
                    onPress={() => handleRemove(slot)}
                  >
                    <Text style={styles.slotPillTime}>{slot.time}</Text>
                    <Text style={styles.slotPillX}>✕</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  scroll: { paddingBottom: 60 },

  header: { paddingHorizontal: 20, paddingTop: 12, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: "800", color: "#111827" },
  subtitle: { fontSize: 13, color: "#6B7280", marginTop: 4 },

  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
    paddingHorizontal: 20,
    marginBottom: 10,
    marginTop: 4,
  },

  dateRow: { paddingHorizontal: 16, gap: 8, marginBottom: 20 },
  dateChip: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
  },
  dateChipActive: {
    backgroundColor: "#16A34A",
    borderColor: "#16A34A",
  },
  dateChipText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  dateChipTextActive: { color: "#FFFFFF" },

  timesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  timeChip: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeChipActive: { backgroundColor: "#DCFCE7", borderColor: "#16A34A" },
  timeChipDisabled: { backgroundColor: "#F3F4F6", borderColor: "#D1D5DB" },
  timeChipText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  timeChipTextActive: { color: "#16A34A" },
  timeChipTextDisabled: { color: "#9CA3AF" },
  addedCheck: { fontSize: 12, color: "#16A34A", fontWeight: "700" },

  addBtn: {
    backgroundColor: "#16A34A",
    borderRadius: 14,
    paddingVertical: 14,
    marginHorizontal: 20,
    alignItems: "center",
    marginBottom: 8,
  },
  addBtnDisabled: { opacity: 0.35 },
  addBtnText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },

  emptyWrap: { alignItems: "center", paddingVertical: 30 },
  emptyEmoji: { fontSize: 36, marginBottom: 10 },
  emptyText: { fontSize: 16, fontWeight: "600", color: "#6B7280" },
  emptySubtext: { fontSize: 13, color: "#9CA3AF", marginTop: 4 },

  dateGroup: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  dateGroupLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },
  dateGroupSlots: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  slotPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: "#D1FAE5",
  },
  slotPillTime: { fontSize: 13, fontWeight: "600", color: "#16A34A" },
  slotPillX: { fontSize: 12, color: "#9CA3AF" },
});

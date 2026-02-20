/**
 * CounselorDashboardScreen — Counselor home.
 *
 * Shows: upcoming bookings, DM threads, quick stats.
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { useAuth } from "../context/AuthContext";
import { db, firebaseIsReady } from "../services/firebase";
import {
  subscribeToDmThreads,
  DirectChat,
} from "../services/messagingStore";
import type { Booking } from "../shared/types";

type Nav = NativeStackNavigationProp<any>;

export function CounselorDashboardScreen() {
  const { profile, logout } = useAuth();
  const nav = useNavigation<Nav>();

  const [threads, setThreads] = useState<DirectChat[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    if (!profile) return;
    const unsub = subscribeToDmThreads(profile.uid, setThreads);
    return () => unsub();
  }, [profile]);

  useEffect(() => {
    if (!profile || !firebaseIsReady || !db) return;
    (async () => {
      const q = query(
        collection(db, "bookings"),
        where("counselorId", "==", profile.uid)
      );
      const snap = await getDocs(q);
      const results = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          studentId: data.studentId ?? "",
          counselorId: data.counselorId ?? "",
          date: data.date ?? "",
          time: data.time ?? "",
          status: data.status ?? "pending",
          notes: data.notes,
        };
      });
      results.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      setBookings(results);
    })();
  }, [profile]);

  const displayName = profile?.fullName || "Counselor";
  const activeBookings = bookings.filter(
    (b) => b.status === "pending" || b.status === "confirmed"
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hi, {displayName}</Text>
            <Text style={styles.role}>Counselor</Text>
          </View>
          <TouchableOpacity onPress={logout}>
            <Text style={styles.logoutText}>Log out</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{activeBookings.length}</Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{threads.length}</Text>
            <Text style={styles.statLabel}>Messages</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{bookings.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
        </View>

        {/* Upcoming bookings */}
        <Text style={styles.sectionTitle}>Upcoming Sessions</Text>
        {activeBookings.length === 0 ? (
          <Text style={styles.empty}>No upcoming sessions.</Text>
        ) : (
          activeBookings.map((b) => (
            <View key={b.id} style={styles.bookingCard}>
              <Text style={styles.bookingTime}>
                {b.date} — {b.time}
              </Text>
              <Text style={styles.bookingStatus}>{b.status}</Text>
            </View>
          ))
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
  container: { flex: 1, backgroundColor: "#F0FDF4" },
  scroll: { paddingBottom: 60 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 12,
    marginBottom: 20,
  },
  greeting: { fontSize: 24, fontWeight: "800", color: "#111827" },
  role: { fontSize: 13, fontWeight: "600", color: "#16A34A", marginTop: 2 },
  logoutText: { color: "#EF4444", fontSize: 13, fontWeight: "600", marginTop: 4 },
  statsRow: { flexDirection: "row", paddingHorizontal: 20, gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  statNum: { fontSize: 22, fontWeight: "800", color: "#16A34A" },
  statLabel: { fontSize: 11, color: "#6B7280", marginTop: 4 },
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
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  bookingTime: { fontSize: 14, fontWeight: "600", color: "#374151" },
  bookingStatus: { fontSize: 12, fontWeight: "700", color: "#F59E0B", textTransform: "capitalize" },
  threadCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  threadName: { fontSize: 14, fontWeight: "700", color: "#111827", marginBottom: 4 },
  threadPreview: { fontSize: 13, color: "#6B7280" },
});

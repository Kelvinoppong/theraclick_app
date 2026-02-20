import React from "react";
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
import type { RootStackParamList } from "../navigation/RootStack";
import { useAuth } from "../context/AuthContext";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const QUICK_ACTIONS = [
  { label: "Talk to AI", emoji: "💬", tab: "Chat" },
  { label: "Community", emoji: "👥", tab: "Forums" },
  { label: "Book Counselor", emoji: "📅", tab: "Booking" },
];

export function StudentDashboardScreen() {
  const { profile, logout } = useAuth();
  const nav = useNavigation<Nav>();

  const displayName =
    profile?.anonymousEnabled && profile.anonymousId
      ? profile.anonymousId
      : profile?.fullName || "Friend";

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
                // Navigate to the matching tab
                const parent = nav.getParent();
                if (parent) parent.navigate(a.tab);
              }}
            >
              <Text style={styles.actionEmoji}>{a.emoji}</Text>
              <Text style={styles.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

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
  container: { flex: 1, backgroundColor: "#F0FDF4" },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 28,
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
  emergencyBtn: {
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 24,
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

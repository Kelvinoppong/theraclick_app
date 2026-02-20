/**
 * ProfileScreen — clean menu-list layout inspired by reference.
 *
 * Hero avatar at top, then tappable rows with icons and chevrons
 * that push to sub-screens (Personal Details, Privacy & Security, etc.).
 */

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

import { useAuth } from "../context/AuthContext";
import { sendImmediateNotification } from "../services/notifications";
import { addNotification } from "../services/notificationStore";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

type MenuItem = {
  icon: string;
  label: string;
  onPress: () => void;
  danger?: boolean;
  badge?: string;
};

export function ProfileScreen() {
  const { profile, logout } = useAuth();
  const nav = useNavigation<Nav>();

  const isStudent = profile?.role === "student";
  const displayName =
    profile?.anonymousEnabled && profile?.anonymousId
      ? profile.anonymousId
      : profile?.fullName || "User";

  const roleLabel: Record<string, string> = {
    student: "Student",
    "peer-mentor": "Peer Mentor",
    counselor: "Counselor",
  };

  const menuItems: MenuItem[] = [
    {
      icon: "👤",
      label: "Personal Details",
      onPress: () => nav.navigate("PersonalDetails" as any),
    },
    {
      icon: "🔒",
      label: "Privacy & Security",
      onPress: () => nav.navigate("PrivacySecurity" as any),
      badge: isStudent && profile?.anonymousEnabled ? "Anonymous" : undefined,
    },
    {
      icon: "🔔",
      label: "Notifications",
      onPress: () => {
        const title = "Theraklick";
        const body = "Notifications are working! You'll get alerts for bookings and messages.";
        sendImmediateNotification(title, body);
        addNotification({ type: "system", title, body });
      },
    },
    {
      icon: "🆘",
      label: "Help & Emergency",
      onPress: () => nav.navigate("Emergency"),
    },
    {
      icon: "📋",
      label: "About Theraklick",
      onPress: () => nav.navigate("About" as any),
    },
  ];

  // Admin-only item
  if (profile?.role === "counselor" || profile?.role === "peer-mentor") {
    menuItems.push({
      icon: "🛡️",
      label: "Admin Panel",
      onPress: () => nav.navigate("Admin"),
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Avatar hero */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarRing}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            </View>
          </View>

          <Text style={styles.displayName}>{displayName}</Text>
          <Text style={styles.email}>{profile?.email || "anonymous@theraklick"}</Text>
          <View style={styles.rolePill}>
            <Text style={styles.rolePillText}>
              {roleLabel[profile?.role ?? ""] || "User"}
            </Text>
          </View>
        </View>

        {/* Menu list */}
        <View style={styles.menuCard}>
          {menuItems.map((item, i) => (
            <TouchableOpacity
              key={item.label}
              style={[
                styles.menuRow,
                i < menuItems.length - 1 && styles.menuRowBorder,
              ]}
              onPress={item.onPress}
              activeOpacity={0.6}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text
                style={[styles.menuLabel, item.danger && styles.menuLabelDanger]}
              >
                {item.label}
              </Text>
              {item.badge && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              )}
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Log out — separate card for visual weight */}
        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={logout}
            activeOpacity={0.6}
          >
            <Text style={styles.menuIcon}>🚪</Text>
            <Text style={[styles.menuLabel, styles.menuLabelDanger]}>
              Log out
            </Text>
            <Text style={[styles.chevron, styles.chevronDanger]}>›</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>Theraklick v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0FDF4" },
  scroll: { paddingBottom: 40 },

  /* Avatar hero */
  avatarSection: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 28,
  },
  avatarRing: {
    width: 108,
    height: 108,
    borderRadius: 54,
    borderWidth: 3,
    borderColor: "#BBF7D0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  avatarCircle: {
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: "#16A34A",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 36, fontWeight: "800", color: "#FFFFFF" },
  displayName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 2,
  },
  email: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 10,
  },
  rolePill: {
    backgroundColor: "#DCFCE7",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  rolePillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#16A34A",
  },

  /* Menu card */
  menuCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    marginHorizontal: 20,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  menuRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  menuIcon: {
    fontSize: 20,
    width: 32,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: "#111827",
  },
  menuLabelDanger: {
    color: "#DC2626",
  },
  badge: {
    backgroundColor: "#DCFCE7",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#16A34A",
  },
  chevron: {
    fontSize: 22,
    color: "#D1D5DB",
    fontWeight: "300",
  },
  chevronDanger: {
    color: "#FECACA",
  },
  version: {
    textAlign: "center",
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 10,
  },
});

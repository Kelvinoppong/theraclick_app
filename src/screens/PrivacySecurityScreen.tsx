/**
 * PrivacySecurityScreen — anonymous mode, account security info.
 *
 * Inspired by the reference "Privacy & Security" screen:
 *   - Toggle rows with subtitles
 *   - Tappable info rows with chevrons
 */

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

import { useAuth } from "../context/AuthContext";
import { db, firebaseIsReady } from "../services/firebase";

export function PrivacySecurityScreen() {
  const { profile, user } = useAuth();
  const isStudent = profile?.role === "student";

  const handleToggleAnonymous = async (enabled: boolean) => {
    if (!profile || !isStudent) return;
    if (!firebaseIsReady || !db || !user) {
      Alert.alert("Demo mode", "Anonymous toggle requires Firebase.");
      return;
    }

    try {
      const anonymousId = enabled
        ? profile.anonymousId || generateAnonymousId()
        : null;

      await setDoc(
        doc(db, "users", user.uid),
        {
          anonymousEnabled: enabled,
          anonymousId,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not update.");
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Anonymous mode (students only) */}
        {isStudent && (
          <>
            <Text style={styles.sectionTitle}>Privacy</Text>
            <View style={styles.card}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <View style={styles.rowIconWrap}>
                    <Text style={styles.rowIcon}>🎭</Text>
                  </View>
                  <View style={styles.rowTextWrap}>
                    <Text style={styles.rowTitle}>Anonymous Mode</Text>
                    <Text style={styles.rowSubtitle}>
                      {profile?.anonymousEnabled
                        ? `Active — you appear as "${profile.anonymousId}"`
                        : "Off — your real name is visible"}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={profile?.anonymousEnabled ?? false}
                  onValueChange={handleToggleAnonymous}
                  trackColor={{ false: "#D1D5DB", true: "#86EFAC" }}
                  thumbColor={
                    profile?.anonymousEnabled ? "#16A34A" : "#f4f3f4"
                  }
                />
              </View>
            </View>
          </>
        )}

        {/* Account security */}
        <Text style={styles.sectionTitle}>Security</Text>
        <View style={styles.card}>
          <Row
            icon="📧"
            title="Email address"
            subtitle={profile?.email || "Not set"}
          />
          <Row
            icon="🔑"
            title="Password"
            subtitle="••••••••••"
            showChevron
            onPress={() =>
              Alert.alert(
                "Change Password",
                "To reset your password, use the web app's forgot-password flow or contact support."
              )
            }
          />
          <Row
            icon="🛡️"
            title="Account status"
            subtitle={
              profile?.status === "active"
                ? "Verified & active"
                : profile?.status === "pending"
                ? "Pending admin approval"
                : profile?.status ?? "Unknown"
            }
            subtitleColor={profile?.status === "active" ? "#16A34A" : "#F59E0B"}
            last
          />
        </View>

        {/* Data info */}
        <Text style={styles.sectionTitle}>Your Data</Text>
        <View style={styles.card}>
          <Row
            icon="📄"
            title="Data collection"
            subtitle="We only store what's needed for your sessions"
          />
          <Row
            icon="🗑️"
            title="Delete account"
            subtitle="Permanently remove all your data"
            showChevron
            danger
            onPress={() =>
              Alert.alert(
                "Delete Account",
                "To delete your account and all associated data, please contact support at help@theraklick.com.",
                [{ text: "OK" }]
              )
            }
            last
          />
        </View>

        {/* Info footer */}
        <View style={styles.infoFooter}>
          <Text style={styles.infoFooterText}>
            Theraklick takes your privacy seriously. Your conversations are
            never shared with third parties. Anonymous mode hides your real
            name across all chats, forums, and bookings.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  icon,
  title,
  subtitle,
  subtitleColor,
  showChevron,
  danger,
  last,
  onPress,
}: {
  icon: string;
  title: string;
  subtitle: string;
  subtitleColor?: string;
  showChevron?: boolean;
  danger?: boolean;
  last?: boolean;
  onPress?: () => void;
}) {
  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      style={[rowStyles.container, !last && rowStyles.border]}
      onPress={onPress}
      activeOpacity={0.6}
    >
      <View style={rowStyles.iconWrap}>
        <Text style={rowStyles.icon}>{icon}</Text>
      </View>
      <View style={rowStyles.textWrap}>
        <Text style={[rowStyles.title, danger && { color: "#DC2626" }]}>
          {title}
        </Text>
        <Text
          style={[
            rowStyles.subtitle,
            subtitleColor ? { color: subtitleColor } : null,
          ]}
          numberOfLines={2}
        >
          {subtitle}
        </Text>
      </View>
      {showChevron && <Text style={rowStyles.chevron}>›</Text>}
    </Wrapper>
  );
}

const rowStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  border: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  icon: { fontSize: 16 },
  textWrap: { flex: 1 },
  title: { fontSize: 14, fontWeight: "600", color: "#111827", marginBottom: 2 },
  subtitle: { fontSize: 12, color: "#6B7280" },
  chevron: { fontSize: 22, color: "#D1D5DB", fontWeight: "300" },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0FDF4" },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 20,
    paddingHorizontal: 4,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  /* Toggle row */
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  toggleInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  rowIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  rowIcon: { fontSize: 16 },
  rowTextWrap: { flex: 1, marginRight: 8 },
  rowTitle: { fontSize: 14, fontWeight: "600", color: "#111827", marginBottom: 2 },
  rowSubtitle: { fontSize: 12, color: "#6B7280" },

  /* Info footer */
  infoFooter: {
    marginTop: 24,
    paddingHorizontal: 8,
  },
  infoFooterText: {
    fontSize: 12,
    color: "#9CA3AF",
    lineHeight: 18,
    textAlign: "center",
  },
});

function generateAnonymousId() {
  const adj = ["calm", "quiet", "brave", "gentle", "kind", "steady", "soft", "bright"];
  const animals = ["zebra", "gazelle", "lion", "dove", "panda", "otter", "turtle", "falcon"];
  const a = adj[Math.floor(Math.random() * adj.length)]!;
  const b = animals[Math.floor(Math.random() * animals.length)]!;
  return `${a}${b}${Math.random().toString(36).slice(2, 4)}`;
}

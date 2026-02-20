/**
 * ProfileScreen — view profile, toggle anonymous mode, edit basics, log out.
 *
 * Students get the anonymous toggle.
 * Mentors/Counselors see their application info.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Switch,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

import { useAuth } from "../context/AuthContext";
import { db, firebaseIsReady } from "../services/firebase";

export function ProfileScreen() {
  const { profile, user, logout, isFirebaseBacked } = useAuth();

  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(profile?.fullName ?? "");
  const [saving, setSaving] = useState(false);

  const isStudent = profile?.role === "student";
  const displayName =
    profile?.anonymousEnabled && profile?.anonymousId
      ? profile.anonymousId
      : profile?.fullName || "User";

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

  const handleSaveName = async () => {
    if (!newName.trim() || !firebaseIsReady || !db || !user) return;
    setSaving(true);
    try {
      await setDoc(
        doc(db, "users", user.uid),
        { fullName: newName.trim(), updatedAt: serverTimestamp() },
        { merge: true }
      );
      setEditingName(false);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const roleLabel = {
    student: "Student",
    "peer-mentor": "Peer Mentor",
    counselor: "Counselor",
  }[profile?.role ?? "student"];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Avatar placeholder */}
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>
            {displayName.charAt(0).toUpperCase()}
          </Text>
        </View>

        <Text style={styles.displayName}>{displayName}</Text>
        <Text style={styles.roleLabel}>{roleLabel}</Text>
        {profile?.email && (
          <Text style={styles.email}>{profile.email}</Text>
        )}

        {/* Anonymous toggle (students only) */}
        {isStudent && (
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Anonymous Mode</Text>
              <Text style={styles.settingDesc}>
                Hide your real name in chats and forums
              </Text>
            </View>
            <Switch
              value={profile?.anonymousEnabled ?? false}
              onValueChange={handleToggleAnonymous}
              trackColor={{ false: "#D1D5DB", true: "#86EFAC" }}
              thumbColor={profile?.anonymousEnabled ? "#16A34A" : "#f4f3f4"}
            />
          </View>
        )}

        {/* Edit name */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>

          {editingName ? (
            <View style={styles.editRow}>
              <TextInput
                style={styles.editInput}
                value={newName}
                onChangeText={setNewName}
                placeholder="Full Name"
                placeholderTextColor="#9CA3AF"
              />
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveName} disabled={saving}>
                {saving ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.editTrigger}
              onPress={() => {
                setNewName(profile?.fullName ?? "");
                setEditingName(true);
              }}
            >
              <Text style={styles.editTriggerLabel}>Full Name</Text>
              <Text style={styles.editTriggerValue}>
                {profile?.fullName || "Not set"} →
              </Text>
            </TouchableOpacity>
          )}

          {profile?.student && (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>School</Text>
                <Text style={styles.infoValue}>{profile.student.school || "—"}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Level</Text>
                <Text style={styles.infoValue}>{profile.student.educationLevel || "—"}</Text>
              </View>
            </>
          )}

          {profile?.application && (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Specialization</Text>
                <Text style={styles.infoValue}>{profile.application.specialization || "—"}</Text>
              </View>
            </>
          )}
        </View>

        {/* Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={[styles.infoValue, { color: profile?.status === "active" ? "#16A34A" : "#F59E0B" }]}>
              {profile?.status ?? "unknown"}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Firebase</Text>
            <Text style={styles.infoValue}>
              {isFirebaseBacked ? "Connected" : "Demo mode"}
            </Text>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function generateAnonymousId() {
  const adj = ["calm", "quiet", "brave", "gentle", "kind", "steady", "soft", "bright"];
  const animals = ["zebra", "gazelle", "lion", "dove", "panda", "otter", "turtle", "falcon"];
  const a = adj[Math.floor(Math.random() * adj.length)]!;
  const b = animals[Math.floor(Math.random() * animals.length)]!;
  return `${a}${b}${Math.random().toString(36).slice(2, 4)}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0FDF4" },
  scroll: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 60, alignItems: "center" },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#16A34A",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: "800", color: "#FFFFFF" },
  displayName: { fontSize: 22, fontWeight: "800", color: "#111827", marginBottom: 2 },
  roleLabel: { fontSize: 13, fontWeight: "600", color: "#16A34A", marginBottom: 2 },
  email: { fontSize: 13, color: "#6B7280", marginBottom: 20 },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    width: "100%",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  settingInfo: { flex: 1 },
  settingTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  settingDesc: { fontSize: 12, color: "#6B7280", marginTop: 2 },
  section: { width: "100%", marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: "800", color: "#111827", marginBottom: 10 },
  editRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  editInput: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  saveBtn: {
    backgroundColor: "#16A34A",
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  saveBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  editTrigger: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 8,
  },
  editTriggerLabel: { fontSize: 14, color: "#6B7280" },
  editTriggerValue: { fontSize: 14, fontWeight: "600", color: "#111827" },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 8,
  },
  infoLabel: { fontSize: 14, color: "#6B7280" },
  infoValue: { fontSize: 14, fontWeight: "600", color: "#111827" },
  logoutBtn: {
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    width: "100%",
    marginTop: 8,
  },
  logoutText: { color: "#DC2626", fontSize: 15, fontWeight: "600" },
});

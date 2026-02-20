/**
 * PersonalDetailsScreen — edit name, view school/specialization info.
 *
 * Pushed from ProfileScreen → "Personal Details" row.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

import { useAuth } from "../context/AuthContext";
import { db, firebaseIsReady } from "../services/firebase";

export function PersonalDetailsScreen() {
  const { profile, user, isFirebaseBacked } = useAuth();

  const [fullName, setFullName] = useState(profile?.fullName ?? "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert("Required", "Name cannot be empty.");
      return;
    }
    if (!firebaseIsReady || !db || !user) {
      Alert.alert("Demo mode", "Editing requires Firebase.");
      return;
    }

    setSaving(true);
    try {
      await setDoc(
        doc(db, "users", user.uid),
        { fullName: fullName.trim(), updatedAt: serverTimestamp() },
        { merge: true }
      );
      Alert.alert("Saved", "Your name has been updated.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const roleLabel: Record<string, string> = {
    student: "Student",
    "peer-mentor": "Peer Mentor",
    counselor: "Counselor",
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Editable field */}
        <Text style={styles.sectionTitle}>Name</Text>
        <View style={styles.card}>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            <TextInput
              style={styles.fieldInput}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your name"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        {/* Read-only info */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <InfoRow label="Email" value={profile?.email || "—"} />
          <InfoRow
            label="Role"
            value={roleLabel[profile?.role ?? ""] || "Not set"}
            last={!profile?.student && !profile?.application}
          />

          {profile?.student && (
            <>
              <InfoRow label="School" value={profile.student.school || "—"} />
              <InfoRow label="Level" value={profile.student.educationLevel || "—"} />
              <InfoRow label="School Email" value={profile.student.schoolEmail || "—"} last />
            </>
          )}

          {profile?.application && (
            <>
              <InfoRow label="Specialization" value={profile.application.specialization || "—"} />
              <InfoRow label="About" value={profile.application.about || "—"} last />
            </>
          )}
        </View>

        <Text style={styles.sectionTitle}>Connection</Text>
        <View style={styles.card}>
          <InfoRow
            label="Firebase"
            value={isFirebaseBacked ? "Connected" : "Demo mode"}
          />
          <InfoRow
            label="Status"
            value={profile?.status ?? "unknown"}
            valueColor={profile?.status === "active" ? "#16A34A" : "#F59E0B"}
            last
          />
        </View>

        {/* Save button */}
        <TouchableOpacity
          style={[styles.saveBtn, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.saveBtnText}>Save Changes</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  label,
  value,
  valueColor,
  last,
}: {
  label: string;
  value: string;
  valueColor?: string;
  last?: boolean;
}) {
  return (
    <View style={[infoStyles.row, !last && infoStyles.border]}>
      <Text style={infoStyles.label}>{label}</Text>
      <Text
        style={[infoStyles.value, valueColor ? { color: valueColor } : null]}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 15,
  },
  border: {
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  label: { fontSize: 14, color: "#6B7280" },
  value: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    maxWidth: "55%",
    textAlign: "right",
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0FDF4" },
  scroll: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },

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
  fieldRow: {
    paddingHorizontal: 18,
    paddingVertical: 6,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#9CA3AF",
    marginTop: 10,
    marginBottom: 2,
  },
  fieldInput: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    paddingVertical: 10,
  },

  saveBtn: {
    backgroundColor: "#16A34A",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 28,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});

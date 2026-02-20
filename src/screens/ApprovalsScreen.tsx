/**
 * ApprovalsScreen — dedicated view for pending account approvals.
 *
 * Shows all users with status "pending" with Approve / Reject actions.
 * Reads directly from Firestore (no API token needed for admin-role users).
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  fetchPendingUsersFromFirestore,
  updateUserStatus,
  type AdminUser,
} from "../services/adminStore";

const ROLE_LABELS: Record<string, string> = {
  student: "Student",
  counselor: "Counselor",
  "peer-mentor": "Peer Mentor",
  admin: "Admin",
};

export function ApprovalsScreen() {
  const [pending, setPending] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadPending = useCallback(async () => {
    try {
      const users = await fetchPendingUsersFromFirestore();
      setPending(users);
    } catch (e) {
      console.warn("Failed to load pending users:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadPending();
  }, [loadPending]);

  const onRefresh = () => {
    setRefreshing(true);
    loadPending();
  };

  const handleApprove = async (user: AdminUser) => {
    try {
      await updateUserStatus(user.uid, "active");
      setPending((prev) => prev.filter((u) => u.uid !== user.uid));
      Alert.alert("Approved", `${user.fullName || "User"} has been activated.`);
    } catch {
      Alert.alert("Error", "Could not approve user.");
    }
  };

  const handleReject = (user: AdminUser) => {
    Alert.alert(
      "Reject User",
      `Disable ${user.fullName || "this user"}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reject",
          style: "destructive",
          onPress: async () => {
            try {
              await updateUserStatus(user.uid, "disabled");
              setPending((prev) => prev.filter((u) => u.uid !== user.uid));
            } catch {
              Alert.alert("Error", "Could not reject user.");
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <ActivityIndicator
          size="large"
          color="#16A34A"
          style={{ marginTop: 60 }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Pending Approvals</Text>
        <Text style={styles.countText}>{pending.length} pending</Text>
      </View>

      <FlatList
        data={pending}
        keyExtractor={(u) => u.uid}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#16A34A"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>✅</Text>
            <Text style={styles.emptyTitle}>All caught up!</Text>
            <Text style={styles.emptySubtext}>
              No pending approvals right now.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(item.fullName?.[0] || "?").toUpperCase()}
                </Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.name}>{item.fullName || "Unknown"}</Text>
                <Text style={styles.email}>{item.email || "No email"}</Text>
                <View style={styles.metaRow}>
                  <View style={styles.rolePill}>
                    <Text style={styles.roleText}>
                      {ROLE_LABELS[item.role || ""] || "No role"}
                    </Text>
                  </View>
                  {item.school && (
                    <Text style={styles.schoolText}>{item.school}</Text>
                  )}
                  {item.specialization && (
                    <Text style={styles.schoolText}>
                      · {item.specialization}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.approveBtn}
                onPress={() => handleApprove(item)}
              >
                <Text style={styles.approveBtnText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rejectBtn}
                onPress={() => handleReject(item)}
              >
                <Text style={styles.rejectBtnText}>Reject</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
  },
  title: { fontSize: 24, fontWeight: "800", color: "#111827" },
  countText: { fontSize: 13, color: "#6B7280", fontWeight: "500" },

  list: { paddingHorizontal: 16, paddingBottom: 40, gap: 12 },

  emptyWrap: { alignItems: "center", marginTop: 60 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  emptySubtext: { fontSize: 14, color: "#6B7280", marginTop: 4 },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  cardTop: { flexDirection: "row", marginBottom: 14 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#FEF3C7",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 18, fontWeight: "700", color: "#D97706" },
  cardInfo: { flex: 1, marginLeft: 12 },
  name: { fontSize: 15, fontWeight: "700", color: "#111827" },
  email: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  rolePill: {
    backgroundColor: "#EEF2FF",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roleText: { fontSize: 11, fontWeight: "600", color: "#6366F1" },
  schoolText: { fontSize: 11, color: "#9CA3AF" },

  actions: { flexDirection: "row", gap: 10 },
  approveBtn: {
    flex: 1,
    backgroundColor: "#16A34A",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  approveBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  rejectBtn: {
    flex: 1,
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  rejectBtnText: { color: "#DC2626", fontWeight: "700", fontSize: 14 },
});

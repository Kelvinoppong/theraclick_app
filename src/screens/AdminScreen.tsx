/**
 * AdminScreen — approve/reject pending mentor and counselor accounts.
 *
 * Calls the same Next.js admin API routes the web app uses:
 *   POST /api/admin/login       → get admin session token
 *   GET  /api/admin/pending     → list pending users
 *   POST /api/admin/users/:uid/approve
 *   POST /api/admin/users/:uid/reject
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as SecureStore from "expo-secure-store";

import { fetchPendingUsers, approveUser, rejectUser } from "../services/apiClient";

const ADMIN_TOKEN_KEY = "theraclick.admin.token";

type PendingUser = {
  uid: string;
  fullName?: string;
  email?: string;
  role?: string;
};

export function AdminScreen() {
  const [token, setToken] = useState<string | null>(null);
  const [tokenInput, setTokenInput] = useState("");
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(false);

  // Restore token on mount
  React.useEffect(() => {
    SecureStore.getItemAsync(ADMIN_TOKEN_KEY).then((t) => {
      if (t) {
        setToken(t);
        loadPending(t);
      }
    });
  }, []);

  const handleLogin = async () => {
    const t = tokenInput.trim();
    if (!t) {
      Alert.alert("Enter token", "Paste your admin session token or API key.");
      return;
    }
    await SecureStore.setItemAsync(ADMIN_TOKEN_KEY, t);
    setToken(t);
    await loadPending(t);
  };

  const loadPending = async (t: string) => {
    setLoading(true);
    try {
      const res = await fetchPendingUsers(t);
      if (res.ok && res.users) {
        setPendingUsers(res.users);
      } else {
        Alert.alert("Error", res.error || "Could not load pending users.");
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Network error.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (uid: string) => {
    if (!token) return;
    try {
      await approveUser(uid, token);
      setPendingUsers((prev) => prev.filter((u) => u.uid !== uid));
      Alert.alert("Approved", "User has been activated.");
    } catch {
      Alert.alert("Error", "Could not approve user.");
    }
  };

  const handleReject = async (uid: string) => {
    if (!token) return;
    Alert.alert("Reject User", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Reject",
        style: "destructive",
        onPress: async () => {
          try {
            await rejectUser(uid, token);
            setPendingUsers((prev) => prev.filter((u) => u.uid !== uid));
          } catch {
            Alert.alert("Error", "Could not reject user.");
          }
        },
      },
    ]);
  };

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync(ADMIN_TOKEN_KEY);
    setToken(null);
    setPendingUsers([]);
    setTokenInput("");
  };

  // Not authenticated → show login
  if (!token) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loginBox}>
          <Text style={styles.heading}>Admin Access</Text>
          <Text style={styles.subtitle}>
            Enter your admin session token or API key.
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Admin token"
            placeholderTextColor="#9CA3AF"
            value={tokenInput}
            onChangeText={setTokenInput}
            autoCapitalize="none"
            secureTextEntry
          />
          <TouchableOpacity style={styles.btn} onPress={handleLogin}>
            <Text style={styles.btnText}>Log In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.heading}>Admin Panel</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.refreshBtn} onPress={() => loadPending(token)}>
        <Text style={styles.refreshText}>Refresh</Text>
      </TouchableOpacity>

      {loading ? (
        <ActivityIndicator color="#16A34A" style={{ marginTop: 30 }} />
      ) : pendingUsers.length === 0 ? (
        <Text style={styles.empty}>No pending accounts.</Text>
      ) : (
        <FlatList
          data={pendingUsers}
          keyExtractor={(u) => u.uid}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.userCard}>
              <Text style={styles.userName}>
                {item.fullName || "No name"} ({item.role})
              </Text>
              <Text style={styles.userEmail}>{item.email || "no email"}</Text>
              <View style={styles.actions}>
                <TouchableOpacity
                  style={styles.approveBtn}
                  onPress={() => handleApprove(item.uid)}
                >
                  <Text style={styles.approveBtnText}>Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.rejectBtn}
                  onPress={() => handleReject(item.uid)}
                >
                  <Text style={styles.rejectBtnText}>Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0FDF4" },
  loginBox: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 12,
    marginBottom: 8,
  },
  heading: { fontSize: 24, fontWeight: "800", color: "#111827" },
  subtitle: { fontSize: 13, color: "#6B7280", marginBottom: 20 },
  logoutText: { color: "#EF4444", fontSize: 13, fontWeight: "600" },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: 16,
  },
  btn: {
    backgroundColor: "#16A34A",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  btnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  refreshBtn: { alignSelf: "flex-end", paddingHorizontal: 20, marginBottom: 8 },
  refreshText: { color: "#16A34A", fontSize: 13, fontWeight: "600" },
  empty: { fontSize: 14, color: "#9CA3AF", textAlign: "center", marginTop: 40 },
  list: { paddingHorizontal: 20, gap: 12, paddingBottom: 40 },
  userCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  userName: { fontSize: 15, fontWeight: "700", color: "#111827", marginBottom: 2 },
  userEmail: { fontSize: 13, color: "#6B7280", marginBottom: 12 },
  actions: { flexDirection: "row", gap: 10 },
  approveBtn: {
    flex: 1,
    backgroundColor: "#16A34A",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  approveBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  rejectBtn: {
    flex: 1,
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  rejectBtnText: { color: "#DC2626", fontWeight: "700", fontSize: 13 },
});

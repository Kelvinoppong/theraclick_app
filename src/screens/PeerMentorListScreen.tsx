/**
 * PeerMentorListScreen — students browse active peer mentors and start a chat.
 *
 * Unlike counselors (who need booking/scheduling), peer mentors offer
 * informal, chat-based support. Each card has a "Start Chat" button
 * that creates or opens a DM thread.
 */

import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { useAuth } from "../context/AuthContext";
import { loadPeerMentors, type PeerMentorInfo } from "../services/bookingStore";
import { findOrCreateDmThread } from "../services/messagingStore";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function PeerMentorListScreen() {
  const { profile } = useAuth();
  const nav = useNavigation<Nav>();

  const [mentors, setMentors] = useState<PeerMentorInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [chattingWith, setChattingWith] = useState<string | null>(null);

  useEffect(() => {
    loadPeerMentors()
      .then(setMentors)
      .finally(() => setLoading(false));
  }, []);

  const handleChat = async (mentor: PeerMentorInfo) => {
    if (!profile) return;
    setChattingWith(mentor.uid);
    try {
      const chatId = await findOrCreateDmThread(profile.uid, mentor.uid);
      nav.navigate("DirectMessage", {
        chatId,
        otherName: mentor.fullName,
      });
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not start chat.");
    } finally {
      setChattingWith(null);
    }
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
      <FlatList
        data={mentors}
        keyExtractor={(m) => m.uid}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.heading}>Peer Mentors</Text>
            <Text style={styles.subtitle}>
              Connect with a fellow student who understands what you're going
              through. No appointment needed — just start a conversation.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isBusy = chattingWith === item.uid;
          return (
            <View style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {item.fullName.charAt(0)}
                  </Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.name}>{item.fullName}</Text>
                  <Text style={styles.spec}>
                    🤝 {item.specialization}
                  </Text>
                  <View style={styles.badgeRow}>
                    <View style={styles.roleBadge}>
                      <Text style={styles.roleBadgeText}>Peer Mentor</Text>
                    </View>
                    <View style={styles.onlineBadge}>
                      <View style={styles.onlineDot} />
                      <Text style={styles.onlineText}>Available</Text>
                    </View>
                  </View>
                </View>
              </View>

              <Text style={styles.cardDesc}>
                Peer mentors are trained students who provide support,
                encouragement, and a listening ear. Conversations are
                confidential.
              </Text>

              <TouchableOpacity
                style={[styles.chatBtn, isBusy && styles.chatBtnDisabled]}
                onPress={() => handleChat(item)}
                disabled={isBusy}
              >
                {isBusy ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.chatBtnText}>💬  Start Chat</Text>
                )}
              </TouchableOpacity>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyEmoji}>🤝</Text>
            <Text style={styles.emptyTitle}>No peer mentors available</Text>
            <Text style={styles.emptySubtext}>
              Check back soon — new mentors are joining regularly.
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  list: { paddingBottom: 40 },
  header: { paddingHorizontal: 20, paddingTop: 12, marginBottom: 16 },
  heading: { fontSize: 24, fontWeight: "800", color: "#111827" },
  subtitle: { fontSize: 13, color: "#6B7280", marginTop: 4, lineHeight: 19 },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardTop: { flexDirection: "row", marginBottom: 12 },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#DBEAFE",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: { fontSize: 22, fontWeight: "800", color: "#2563EB" },
  cardInfo: { flex: 1 },
  name: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 3 },
  spec: { fontSize: 12, color: "#6B7280", marginBottom: 6 },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  roleBadge: {
    backgroundColor: "#DBEAFE",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  roleBadgeText: { fontSize: 10, fontWeight: "700", color: "#2563EB" },
  onlineBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16A34A",
  },
  onlineText: { fontSize: 11, color: "#16A34A", fontWeight: "600" },

  cardDesc: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 19,
    marginBottom: 14,
  },

  chatBtn: {
    backgroundColor: "#2563EB",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  chatBtnDisabled: { opacity: 0.5 },
  chatBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },

  emptyWrap: { alignItems: "center", marginTop: 60 },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  emptySubtext: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
    textAlign: "center",
    paddingHorizontal: 40,
  },
});

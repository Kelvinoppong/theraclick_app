/**
 * ForumsScreen — anonymous community support backed by Firestore.
 *
 * Real-time listener updates posts as they come in.
 * Users can create posts and report inappropriate content.
 */

import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "../context/AuthContext";
import {
  createForumPost,
  flagForumPost,
  subscribeToForumPosts,
} from "../services/forumStore";
import type { ForumPost } from "../shared/types";

const CATEGORIES = [
  { id: "exams", label: "Exams & Academics", emoji: "📚" },
  { id: "anxiety", label: "Anxiety & Stress", emoji: "😰" },
  { id: "relationships", label: "Relationships", emoji: "💛" },
  { id: "vent", label: "General / Vent", emoji: "💭" },
];

export function ForumsScreen() {
  const { profile } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Real-time listener
  useEffect(() => {
    const unsub = subscribeToForumPosts(selectedCategory, setPosts);
    return () => unsub();
  }, [selectedCategory]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    const unsub = subscribeToForumPosts(selectedCategory, (p) => {
      setPosts(p);
      setRefreshing(false);
    });
    return () => unsub();
  }, [selectedCategory]);

  const handlePost = async () => {
    const text = newPost.trim();
    if (!text || !profile) return;

    setPosting(true);
    try {
      await createForumPost({
        authorId: profile.uid,
        anonymousName:
          profile.anonymousEnabled && profile.anonymousId
            ? profile.anonymousId
            : profile.fullName || "anonymous",
        content: text,
        category: selectedCategory || "vent",
      });
      setNewPost("");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not create post.");
    } finally {
      setPosting(false);
    }
  };

  const handleReport = (postId: string) => {
    Alert.alert("Report Post", "Flag this post for review by moderators?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Report",
        style: "destructive",
        onPress: async () => {
          try {
            await flagForumPost(postId);
            Alert.alert("Reported", "Thank you. A moderator will review this.");
          } catch {
            Alert.alert("Error", "Could not report post.");
          }
        },
      },
    ]);
  };

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Community</Text>
      <Text style={styles.subtitle}>Anonymous, supportive, judgment-free</Text>

      {/* Category pills */}
      <FlatList
        horizontal
        data={CATEGORIES}
        keyExtractor={(c) => c.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pills}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.pill,
              selectedCategory === item.id && styles.pillActive,
            ]}
            onPress={() =>
              setSelectedCategory(
                selectedCategory === item.id ? null : item.id
              )
            }
          >
            <Text
              style={[
                styles.pillText,
                selectedCategory === item.id && styles.pillTextActive,
              ]}
            >
              {item.emoji} {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Posts */}
      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.posts}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#16A34A" />
        }
        renderItem={({ item }) => (
          <View style={styles.postCard}>
            <View style={styles.postHeader}>
              <Text style={styles.postAuthor}>{item.anonymousName}</Text>
              <Text style={styles.postTime}>{formatTime(item.createdAt)}</Text>
            </View>
            <Text style={styles.postContent}>{item.content}</Text>
            <TouchableOpacity
              style={styles.reportBtn}
              onPress={() => handleReport(item.id)}
            >
              <Text style={styles.reportText}>Report</Text>
            </TouchableOpacity>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            No posts yet. Be the first to share.
          </Text>
        }
      />

      {/* Compose */}
      <View style={styles.compose}>
        <TextInput
          style={styles.composeInput}
          placeholder="Share something (anonymous)..."
          placeholderTextColor="#9CA3AF"
          value={newPost}
          onChangeText={setNewPost}
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.postBtn, (posting || !newPost.trim()) && styles.postBtnDisabled]}
          onPress={handlePost}
          disabled={posting || !newPost.trim()}
        >
          <Text style={styles.postBtnText}>{posting ? "..." : "Post"}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0FDF4" },
  heading: {
    fontSize: 24,
    fontWeight: "800",
    color: "#111827",
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  subtitle: {
    fontSize: 13,
    color: "#6B7280",
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  pills: { paddingHorizontal: 16, gap: 8, marginBottom: 14 },
  pill: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  pillActive: { backgroundColor: "#16A34A", borderColor: "#16A34A" },
  pillText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  pillTextActive: { color: "#FFFFFF" },
  posts: { paddingHorizontal: 20, paddingBottom: 12, gap: 12 },
  postCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  postHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  postAuthor: { fontSize: 12, fontWeight: "700", color: "#16A34A" },
  postTime: { fontSize: 11, color: "#9CA3AF" },
  postContent: { fontSize: 14, color: "#374151", lineHeight: 22 },
  reportBtn: { marginTop: 10, alignSelf: "flex-end" },
  reportText: { fontSize: 11, color: "#9CA3AF", fontWeight: "600" },
  empty: { fontSize: 14, color: "#9CA3AF", textAlign: "center", marginTop: 32 },
  compose: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 8,
    alignItems: "flex-end",
  },
  composeInput: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: "#111827",
    maxHeight: 80,
  },
  postBtn: {
    backgroundColor: "#16A34A",
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  postBtnDisabled: { opacity: 0.4 },
  postBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
});

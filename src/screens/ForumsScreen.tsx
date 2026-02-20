/**
 * ForumsScreen — anonymous community support (MVP).
 *
 * Phase 1: static categories + placeholder posts.
 * Phase 2: wire to Firestore forums collection with real-time listeners.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const CATEGORIES = [
  { id: "exams", label: "Exams & Academics", emoji: "📚" },
  { id: "anxiety", label: "Anxiety & Stress", emoji: "😰" },
  { id: "relationships", label: "Relationships", emoji: "💛" },
  { id: "vent", label: "General / Vent", emoji: "💭" },
];

type Post = {
  id: string;
  anonymousName: string;
  content: string;
  category: string;
  createdAt: number;
};

const SAMPLE_POSTS: Post[] = [
  {
    id: "1",
    anonymousName: "calmzebra42",
    content: "Finals are next week and I can't focus. Anyone else feeling this way?",
    category: "exams",
    createdAt: Date.now() - 3600000,
  },
  {
    id: "2",
    anonymousName: "gentledove88",
    content: "Had a panic attack in lecture today. Feeling better now but it was scary.",
    category: "anxiety",
    createdAt: Date.now() - 7200000,
  },
  {
    id: "3",
    anonymousName: "bravepanda19",
    content: "Just want to say — you're not alone. We're all figuring this out together.",
    category: "vent",
    createdAt: Date.now() - 10800000,
  },
];

export function ForumsScreen() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [newPost, setNewPost] = useState("");

  const filteredPosts = selectedCategory
    ? SAMPLE_POSTS.filter((p) => p.category === selectedCategory)
    : SAMPLE_POSTS;

  const handlePost = () => {
    if (!newPost.trim()) return;
    Alert.alert(
      "Coming soon",
      "Forum posting will be connected to Firestore in Phase 2."
    );
    setNewPost("");
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
            <Text style={styles.pillText}>
              {item.emoji} {item.label}
            </Text>
          </TouchableOpacity>
        )}
      />

      {/* Posts */}
      <FlatList
        data={filteredPosts}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.posts}
        renderItem={({ item }) => (
          <View style={styles.postCard}>
            <Text style={styles.postAuthor}>{item.anonymousName}</Text>
            <Text style={styles.postContent}>{item.content}</Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No posts in this category yet.</Text>
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
        />
        <TouchableOpacity style={styles.postBtn} onPress={handlePost}>
          <Text style={styles.postBtnText}>Post</Text>
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
  pillActive: {
    backgroundColor: "#16A34A",
    borderColor: "#16A34A",
  },
  pillText: { fontSize: 12, fontWeight: "600", color: "#374151" },
  posts: { paddingHorizontal: 20, paddingBottom: 12, gap: 12 },
  postCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  postAuthor: { fontSize: 12, fontWeight: "700", color: "#16A34A", marginBottom: 4 },
  postContent: { fontSize: 14, color: "#374151", lineHeight: 22 },
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
  postBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
});

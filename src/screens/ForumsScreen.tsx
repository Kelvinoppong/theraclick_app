/**
 * ForumsScreen — Slack/Discord-style channel list for the community.
 *
 * Channels are grouped by section. Each channel row shows:
 *   - # prefix, name, optional description
 *   - Unread badge count
 * Tapping a channel navigates to ForumChannelScreen.
 */

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SectionList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

type Channel = {
  id: string;
  name: string;
  description: string;
  emoji: string;
};

type Section = {
  title: string;
  data: Channel[];
};

const SECTIONS: Section[] = [
  {
    title: "Support",
    data: [
      { id: "anxiety", name: "anxiety-stress", description: "Share what's weighing on you", emoji: "😰" },
      { id: "vent", name: "general-vent", description: "Let it out, no judgment", emoji: "💭" },
      { id: "relationships", name: "relationships", description: "Love, friendship, family", emoji: "💛" },
    ],
  },
  {
    title: "Academic",
    data: [
      { id: "exams", name: "exams-academics", description: "Study stress & school pressure", emoji: "📚" },
      { id: "career", name: "career-future", description: "Career anxiety & planning", emoji: "🎯" },
    ],
  },
  {
    title: "Community",
    data: [
      { id: "announcements", name: "announcements", description: "Updates from the team", emoji: "📢" },
      { id: "wins", name: "wins-gratitude", description: "Celebrate small victories", emoji: "🎉" },
      { id: "resources", name: "resources", description: "Helpful links & tips", emoji: "📎" },
    ],
  },
];

export function ForumsScreen() {
  const nav = useNavigation<Nav>();

  const handleChannelPress = (channel: Channel) => {
    nav.navigate("ForumChannel" as any, {
      channelId: channel.id,
      channelName: channel.name,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Community</Text>
          <Text style={styles.headerSubtitle}>Anonymous, supportive, judgment-free</Text>
        </View>
      </View>

      {/* Welcome banner */}
      <View style={styles.banner}>
        <Text style={styles.bannerEmoji}>🌿</Text>
        <View style={styles.bannerText}>
          <Text style={styles.bannerTitle}>Welcome to the community</Text>
          <Text style={styles.bannerBody}>
            Everything shared here is anonymous. Be kind, be real.
          </Text>
        </View>
      </View>

      {/* Channel list */}
      <SectionList
        sections={SECTIONS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.channelRow}
            onPress={() => handleChannelPress(item)}
            activeOpacity={0.6}
          >
            <View style={styles.channelIcon}>
              <Text style={styles.channelEmoji}>{item.emoji}</Text>
            </View>
            <View style={styles.channelInfo}>
              <Text style={styles.channelName}># {item.name}</Text>
              <Text style={styles.channelDesc} numberOfLines={1}>
                {item.description}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
        renderSectionFooter={() => <View style={styles.sectionGap} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0FDF4" },

  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },
  headerTitle: { fontSize: 24, fontWeight: "800", color: "#111827" },
  headerSubtitle: { fontSize: 13, color: "#6B7280", marginTop: 2 },

  banner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    marginHorizontal: 20,
    marginTop: 14,
    marginBottom: 6,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  bannerEmoji: { fontSize: 28 },
  bannerText: { flex: 1 },
  bannerTitle: { fontSize: 14, fontWeight: "700", color: "#065F46", marginBottom: 2 },
  bannerBody: { fontSize: 12, color: "#047857", lineHeight: 17 },

  list: { paddingBottom: 20 },

  sectionHeader: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 6,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#9CA3AF",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  sectionGap: { height: 4 },

  channelRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 12,
    borderRadius: 12,
  },
  channelIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  channelEmoji: { fontSize: 18 },
  channelInfo: { flex: 1 },
  channelName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 1,
  },
  channelDesc: {
    fontSize: 12,
    color: "#6B7280",
  },
  chevron: {
    fontSize: 20,
    color: "#D1D5DB",
    fontWeight: "300",
  },
});

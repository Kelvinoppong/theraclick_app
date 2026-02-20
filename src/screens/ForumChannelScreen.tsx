/**
 * ForumChannelScreen — Slack-style message view inside a community channel.
 *
 * Features:
 *   - Chat-style message list with avatars and timestamps
 *   - Compose bar with text + attachment button (+)
 *   - AttachmentPicker (gallery, camera, voice, file)
 *   - Voice recording inline
 *   - Image preview in messages
 *   - File attachment display
 *   - Long-press to report
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { useAuth } from "../context/AuthContext";
import {
  createForumPost,
  flagForumPost,
  subscribeToForumPosts,
} from "../services/forumStore";
import {
  pickImage,
  pickDocument,
  uploadMedia,
  buildStoragePath,
  MediaAttachment,
} from "../services/mediaService";
import type { ForumPost } from "../shared/types";
import { AttachmentPicker, AttachmentOption } from "../components/AttachmentPicker";
import { VoiceRecorder, VoicePlayer } from "../components/VoiceRecorder";

type Props = NativeStackScreenProps<any, "ForumChannel">;

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}

function getAvatarColor(name: string): string {
  const colors = ["#16A34A", "#2563EB", "#D97706", "#7C3AED", "#DC2626", "#0891B2", "#C026D3"];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length]!;
}

export function ForumChannelScreen({ route }: Props) {
  const { channelId, channelName } = route.params as {
    channelId: string;
    channelName: string;
  };
  const { profile } = useAuth();
  const flatListRef = useRef<FlatList>(null);

  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);

  // Media state
  const [pickerVisible, setPickerVisible] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [attachment, setAttachment] = useState<MediaAttachment | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const unsub = subscribeToForumPosts(channelId, setPosts);
    return () => unsub();
  }, [channelId]);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
  }, []);

  useEffect(() => {
    if (posts.length > 0) scrollToEnd();
  }, [posts.length, scrollToEnd]);

  const handleAttachmentSelect = async (option: AttachmentOption) => {
    if (option === "voice") {
      setVoiceMode(true);
      return;
    }

    let media: MediaAttachment | null = null;

    if (option === "gallery") media = await pickImage("gallery");
    else if (option === "camera") media = await pickImage("camera");
    else if (option === "file") media = await pickDocument();

    if (media) setAttachment(media);
  };

  const handleVoiceRecorded = (uri: string, durationMs: number) => {
    setVoiceMode(false);
    setAttachment({
      type: "voice",
      uri,
      name: `voice_${Date.now()}.m4a`,
      downloadUrl: undefined,
    });
  };

  const clearAttachment = () => {
    setAttachment(null);
  };

  const handlePost = async () => {
    const text = newPost.trim();
    if (!text && !attachment) return;
    if (!profile) return;

    setPosting(true);
    setUploading(!!attachment);

    try {
      let mediaUrl: string | undefined;
      let mediaType: string | undefined;
      let mediaName: string | undefined;

      // Upload attachment if present
      if (attachment) {
        try {
          const path = buildStoragePath(channelId, attachment.name);
          mediaUrl = await uploadMedia(attachment.uri, path);
          mediaType = attachment.type;
          mediaName = attachment.name;
        } catch (uploadErr: any) {
          // If storage isn't configured, still post the text
          console.warn("Upload failed (Storage may not be configured):", uploadErr.message);
          if (!text) {
            Alert.alert("Upload Failed", "Firebase Storage needs to be configured for media uploads. Text posts still work.");
            setPosting(false);
            setUploading(false);
            return;
          }
        }
      }

      await createForumPost({
        authorId: profile.uid,
        anonymousName:
          profile.anonymousEnabled && profile.anonymousId
            ? profile.anonymousId
            : profile.fullName || "anonymous",
        content: text || (mediaType === "voice" ? "🎙 Voice note" : mediaType === "image" ? "📷 Photo" : "📎 File"),
        category: channelId,
        ...(mediaUrl && { mediaUrl, mediaType, mediaName }),
      });

      setNewPost("");
      setAttachment(null);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not post.");
    } finally {
      setPosting(false);
      setUploading(false);
    }
  };

  const handleReport = (postId: string) => {
    Alert.alert("Report Post", "Flag this post for moderator review?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Report",
        style: "destructive",
        onPress: async () => {
          try {
            await flagForumPost(postId);
            Alert.alert("Reported", "A moderator will review this.");
          } catch {
            Alert.alert("Error", "Could not report.");
          }
        },
      },
    ]);
  };

  const sortedPosts = [...posts].sort((a, b) => a.createdAt - b.createdAt);

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      {/* Channel info bar */}
      <View style={styles.channelBar}>
        <Text style={styles.channelHash}>#</Text>
        <Text style={styles.channelName}>{channelName}</Text>
        <View style={styles.memberPill}>
          <Text style={styles.memberText}>Anonymous</Text>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={sortedPosts}
          keyExtractor={(p) => p.id}
          contentContainerStyle={
            sortedPosts.length === 0 ? styles.emptyWrap : styles.messageList
          }
          onContentSizeChange={scrollToEnd}
          renderItem={({ item }) => {
            const color = getAvatarColor(item.anonymousName);
            const isMe = item.authorId === profile?.uid;
            const data = item as any;

            return (
              <TouchableOpacity
                style={styles.messageRow}
                onLongPress={() => handleReport(item.id)}
                activeOpacity={0.8}
                delayLongPress={500}
              >
                <View style={[styles.avatar, { backgroundColor: color + "20" }]}>
                  <Text style={[styles.avatarText, { color }]}>
                    {item.anonymousName.charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={styles.messageContent}>
                  <View style={styles.messageHeader}>
                    <Text style={[styles.authorName, { color }]}>
                      {item.anonymousName}
                      {isMe && <Text style={styles.youTag}> (you)</Text>}
                    </Text>
                    <Text style={styles.messageTime}>{timeAgo(item.createdAt)}</Text>
                  </View>

                  {/* Text content */}
                  {item.content && !["🎙 Voice note", "📷 Photo", "📎 File"].includes(item.content) && (
                    <Text style={styles.messageText}>{item.content}</Text>
                  )}

                  {/* Image attachment */}
                  {data.mediaType === "image" && data.mediaUrl && (
                    <Image
                      source={{ uri: data.mediaUrl }}
                      style={styles.imageAttachment}
                      resizeMode="cover"
                    />
                  )}

                  {/* Voice attachment */}
                  {data.mediaType === "voice" && data.mediaUrl && (
                    <VoicePlayer uri={data.mediaUrl} durationMs={0} />
                  )}

                  {/* File attachment */}
                  {data.mediaType === "file" && data.mediaUrl && (
                    <View style={styles.fileAttachment}>
                      <Text style={styles.fileIcon}>📎</Text>
                      <Text style={styles.fileName} numberOfLines={1}>
                        {data.mediaName || "File"}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyEmoji}>💬</Text>
              <Text style={styles.emptyTitle}>No posts yet</Text>
              <Text style={styles.emptyBody}>
                Be the first to share in #{channelName}.{"\n"}
                Everything here is anonymous.
              </Text>
            </View>
          }
        />

        {/* Attachment preview */}
        {attachment && (
          <View style={styles.attachmentPreview}>
            {attachment.type === "image" && (
              <Image source={{ uri: attachment.uri }} style={styles.previewThumb} />
            )}
            {attachment.type === "voice" && (
              <View style={styles.previewVoice}>
                <Text style={styles.previewVoiceIcon}>🎙</Text>
                <Text style={styles.previewVoiceText}>Voice note ready</Text>
              </View>
            )}
            {attachment.type === "file" && (
              <View style={styles.previewFile}>
                <Text style={styles.previewFileIcon}>📎</Text>
                <Text style={styles.previewFileName} numberOfLines={1}>
                  {attachment.name}
                </Text>
              </View>
            )}
            <TouchableOpacity onPress={clearAttachment} style={styles.previewClose}>
              <Text style={styles.previewCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Voice recorder (replaces compose bar when active) */}
        {voiceMode ? (
          <VoiceRecorder
            onRecordingComplete={handleVoiceRecorded}
            onCancel={() => setVoiceMode(false)}
          />
        ) : (
          /* Compose bar */
          <View style={styles.compose}>
            {/* Attachment button */}
            <TouchableOpacity
              style={styles.attachBtn}
              onPress={() => setPickerVisible(true)}
            >
              <Text style={styles.attachIcon}>+</Text>
            </TouchableOpacity>

            <TextInput
              style={styles.composeInput}
              placeholder={`Message #${channelName}`}
              placeholderTextColor="#9CA3AF"
              value={newPost}
              onChangeText={setNewPost}
              multiline
              maxLength={1000}
            />

            <TouchableOpacity
              style={[
                styles.sendBtn,
                (!newPost.trim() && !attachment || posting) && styles.sendBtnDisabled,
              ]}
              onPress={handlePost}
              disabled={(!newPost.trim() && !attachment) || posting}
            >
              {uploading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text style={styles.sendBtnText}>↑</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Attachment picker modal */}
      <AttachmentPicker
        visible={pickerVisible}
        onSelect={handleAttachmentSelect}
        onClose={() => setPickerVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FFFFFF" },
  flex: { flex: 1 },

  channelBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    gap: 4,
  },
  channelHash: { fontSize: 18, fontWeight: "700", color: "#9CA3AF" },
  channelName: { fontSize: 16, fontWeight: "700", color: "#111827", flex: 1 },
  memberPill: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  memberText: { fontSize: 11, fontWeight: "600", color: "#6B7280" },

  /* Messages */
  messageList: { paddingVertical: 12 },
  messageRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    marginTop: 2,
  },
  avatarText: { fontSize: 16, fontWeight: "800" },
  messageContent: { flex: 1 },
  messageHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginBottom: 3,
  },
  authorName: { fontSize: 14, fontWeight: "700" },
  youTag: { fontSize: 11, fontWeight: "500", color: "#9CA3AF" },
  messageTime: { fontSize: 11, color: "#9CA3AF" },
  messageText: { fontSize: 14, color: "#374151", lineHeight: 21 },

  /* Media in messages */
  imageAttachment: {
    width: "100%",
    height: 180,
    borderRadius: 12,
    marginTop: 6,
    backgroundColor: "#F3F4F6",
  },
  fileAttachment: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 6,
    gap: 8,
  },
  fileIcon: { fontSize: 16 },
  fileName: { fontSize: 13, fontWeight: "500", color: "#374151", flex: 1 },

  /* Attachment preview above compose */
  attachmentPreview: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#F9FAFB",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    gap: 10,
  },
  previewThumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
  },
  previewVoice: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  previewVoiceIcon: { fontSize: 20 },
  previewVoiceText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  previewFile: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  previewFileIcon: { fontSize: 18 },
  previewFileName: { fontSize: 13, fontWeight: "500", color: "#374151", flex: 1 },
  previewClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
  },
  previewCloseText: { fontSize: 14, fontWeight: "600", color: "#6B7280" },

  /* Empty */
  emptyWrap: { flex: 1 },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyEmoji: { fontSize: 40, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: "#111827", marginBottom: 6 },
  emptyBody: { fontSize: 14, color: "#6B7280", textAlign: "center", lineHeight: 20 },

  /* Compose */
  compose: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    backgroundColor: "#FFFFFF",
    gap: 8,
  },
  attachBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  attachIcon: { fontSize: 22, fontWeight: "300", color: "#6B7280", marginTop: -1 },
  composeInput: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 14,
    color: "#111827",
    maxHeight: 100,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#16A34A",
    justifyContent: "center",
    alignItems: "center",
  },
  sendBtnDisabled: { opacity: 0.3 },
  sendBtnText: { fontSize: 18, fontWeight: "700", color: "#FFFFFF", marginTop: -1 },
});

/**
 * AttachmentPicker — bottom sheet for media options.
 *
 * Inspired by the Slack attachment modal:
 *   - Photo from Gallery
 *   - Take a Photo (camera)
 *   - Record Voice Note
 *   - Upload a File
 */

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
} from "react-native";

export type AttachmentOption = "gallery" | "camera" | "voice" | "file";

type Props = {
  visible: boolean;
  onSelect: (option: AttachmentOption) => void;
  onClose: () => void;
};

const OPTIONS: { id: AttachmentOption; icon: string; label: string }[] = [
  { id: "gallery", icon: "🖼️", label: "Photo from Gallery" },
  { id: "camera", icon: "📷", label: "Take a Photo" },
  { id: "voice", icon: "🎙️", label: "Record a Voice Note" },
  { id: "file", icon: "📎", label: "Upload a File" },
];

export function AttachmentPicker({ visible, onSelect, onClose }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose} />

      {/* Sheet */}
      <View style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>Attach</Text>

        {OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.id}
            style={styles.optionRow}
            onPress={() => {
              onClose();
              onSelect(opt.id);
            }}
            activeOpacity={0.6}
          >
            <View style={styles.optionIcon}>
              <Text style={styles.optionEmoji}>{opt.icon}</Text>
            </View>
            <Text style={styles.optionLabel}>{opt.label}</Text>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}

        {/* Cancel */}
        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
    paddingTop: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#D1D5DB",
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  optionEmoji: { fontSize: 20 },
  optionLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: "#111827",
  },
  chevron: {
    fontSize: 20,
    color: "#D1D5DB",
    fontWeight: "300",
  },
  cancelBtn: {
    marginTop: 8,
    marginHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6B7280",
  },
});

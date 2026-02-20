/**
 * MessageBubble — chat message with avatar for AI messages.
 *
 * AI messages show the chatbot icon on the left.
 * User messages are right-aligned with green background.
 */

import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";

const BOT_ICON = require("./app_icon.jpeg");

type Props = {
  text: string;
  sender: "user" | "ai";
};

export function MessageBubble({ text, sender }: Props) {
  const isUser = sender === "user";

  if (isUser) {
    return (
      <View style={styles.userRow}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{text}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.aiRow}>
      <Image source={BOT_ICON} style={styles.botAvatar} />
      <View style={styles.aiBubble}>
        <Text style={styles.aiText}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /* User message */
  userRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginVertical: 4,
    paddingLeft: 48,
  },
  userBubble: {
    backgroundColor: "#16A34A",
    borderRadius: 20,
    borderBottomRightRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 22,
  },

  /* AI message */
  aiRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginVertical: 4,
    paddingRight: 48,
  },
  botAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: "#DCFCE7",
  },
  aiBubble: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flex: 1,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  aiText: {
    color: "#111827",
    fontSize: 15,
    lineHeight: 22,
  },
});

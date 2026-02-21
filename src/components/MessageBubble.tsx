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
  showAvatar?: boolean;
  timestamp?: number;
};

const CALL_PREFIX = /^(📹|📞)\s/;

function formatTime(ts?: number): string {
  if (!ts) return "";
  const d = new Date(ts);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const ampm = h >= 12 ? "PM" : "AM";
  const hr = h % 12 || 12;
  return `${hr}:${m} ${ampm}`;
}

export function MessageBubble({ text, sender, showAvatar = true, timestamp }: Props) {
  const isUser = sender === "user";
  const isCallLog = CALL_PREFIX.test(text);
  const time = formatTime(timestamp);

  if (isCallLog) {
    return (
      <View style={isUser ? styles.callRowRight : styles.callRowLeft}>
        <View style={styles.callBubble}>
          <Text style={styles.callText}>{text}</Text>
          {!!time && <Text style={styles.callTime}>{time}</Text>}
        </View>
      </View>
    );
  }

  if (isUser) {
    return (
      <View style={styles.userRow}>
        <View style={styles.userBubble}>
          <Text style={styles.userText}>{text}</Text>
          {!!time && <Text style={styles.userTime}>{time}</Text>}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.aiRow}>
      {showAvatar && <Image source={BOT_ICON} style={styles.botAvatar} />}
      <View style={styles.aiBubble}>
        <Text style={styles.aiText}>{text}</Text>
        {!!time && <Text style={styles.aiTime}>{time}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  /* Call log messages — aligned like chat but styled distinctly */
  callRowRight: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginVertical: 6,
    paddingLeft: 80,
  },
  callRowLeft: {
    flexDirection: "row",
    justifyContent: "flex-start",
    marginVertical: 6,
    paddingRight: 80,
  },
  callBubble: {
    backgroundColor: "#F3F4F6",
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  callText: {
    color: "#374151",
    fontSize: 13,
  },
  callTime: {
    color: "#9CA3AF",
    fontSize: 11,
    marginTop: 4,
    alignSelf: "flex-end",
  },

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
  userTime: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 11,
    marginTop: 4,
    alignSelf: "flex-end",
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
  aiTime: {
    color: "#9CA3AF",
    fontSize: 11,
    marginTop: 4,
    alignSelf: "flex-end",
  },
});

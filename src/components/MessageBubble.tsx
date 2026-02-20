import React from "react";
import { View, Text, StyleSheet } from "react-native";

type Props = {
  text: string;
  sender: "user" | "ai";
};

export function MessageBubble({ text, sender }: Props) {
  const isUser = sender === "user";

  return (
    <View
      style={[
        styles.bubble,
        isUser ? styles.userBubble : styles.aiBubble,
      ]}
    >
      <Text
        style={[
          styles.text,
          isUser ? styles.userText : styles.aiText,
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    maxWidth: "80%",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginVertical: 4,
  },
  userBubble: {
    backgroundColor: "#16A34A",
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: "#FFFFFF",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: "#FFFFFF",
  },
  aiText: {
    color: "#111827",
  },
});

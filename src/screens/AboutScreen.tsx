/**
 * AboutScreen — app info, mission statement, version.
 */

import React from "react";
import { View, Text, StyleSheet, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export function AboutScreen() {
  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>T</Text>
          </View>
          <Text style={styles.appName}>Theraklick</Text>
          <Text style={styles.version}>Version 1.0.0</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.heading}>Our Mission</Text>
          <Text style={styles.body}>
            Theraklick is a student-focused mental health platform designed for
            Africa, starting with Ghana. We provide layered, anonymous-first
            support — from AI conversations to peer mentors to licensed
            counselors — meeting students where they are.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.heading}>How It Works</Text>
          <BulletItem text="Talk to our AI assistant anytime, anonymously" />
          <BulletItem text="Connect with trained peer mentors who understand" />
          <BulletItem text="Book sessions with licensed counselors" />
          <BulletItem text="Access emergency resources instantly" />
        </View>

        <View style={styles.card}>
          <Text style={styles.heading}>Privacy</Text>
          <Text style={styles.body}>
            Your privacy is our foundation. Anonymous mode hides your identity
            across all features. We never share your data with third parties
            or universities without your explicit consent.
          </Text>
        </View>

        <Text style={styles.footer}>
          Built with care for students in Ghana and across Africa.{"\n"}
          © 2026 Theraklick
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function BulletItem({ text }: { text: string }) {
  return (
    <View style={bulletStyles.row}>
      <View style={bulletStyles.dot} />
      <Text style={bulletStyles.text}>{text}</Text>
    </View>
  );
}

const bulletStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", marginBottom: 10 },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#16A34A",
    marginTop: 6,
    marginRight: 10,
  },
  text: { flex: 1, fontSize: 14, color: "#374151", lineHeight: 20 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0FDF4" },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  logoWrap: { alignItems: "center", paddingTop: 20, marginBottom: 24 },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#16A34A",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  logoText: { fontSize: 28, fontWeight: "800", color: "#FFFFFF" },
  appName: { fontSize: 24, fontWeight: "800", color: "#111827" },
  version: { fontSize: 13, color: "#9CA3AF", marginTop: 2 },

  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  heading: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 10,
  },
  body: { fontSize: 14, color: "#374151", lineHeight: 22 },

  footer: {
    textAlign: "center",
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 16,
    lineHeight: 18,
  },
});

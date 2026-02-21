import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootStack";

type Props = NativeStackScreenProps<RootStackParamList, "Welcome">;

const FEATURES = [
  { icon: "🤖", title: "AI Chat Support", desc: "Get instant guidance from our AI assistant, anytime day or night." },
  { icon: "🧑‍⚕️", title: "Licensed Counselors", desc: "Connect with verified mental health professionals for deeper support." },
  { icon: "📹", title: "Video & Voice Calls", desc: "Talk face-to-face or by phone with your counselor from anywhere." },
  { icon: "🔒", title: "Private & Confidential", desc: "Your conversations are secure. No judgment, just help." },
];

export function WelcomeScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.logo}>Theraklick</Text>
          <Text style={styles.tagline}>
            Mental health support,{"\n"}right in your pocket.
          </Text>
          <Text style={styles.description}>
            Fast, anonymous, layered mental health support designed for students across Africa.
          </Text>
        </View>

        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f.title} style={styles.featureCard}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.trust}>
          Trusted by students · Built with care · Free to get started
        </Text>
      </ScrollView>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate("RoleSelection")}
        >
          <Text style={styles.primaryBtnText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={styles.secondaryBtnText}>
            Already have an account? Log in
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0FDF4",
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 48,
    paddingBottom: 16,
  },
  hero: {
    alignItems: "center",
    marginBottom: 32,
  },
  logo: {
    fontSize: 38,
    fontWeight: "800",
    color: "#16A34A",
    marginBottom: 12,
  },
  tagline: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    lineHeight: 28,
    marginBottom: 10,
  },
  description: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 12,
  },

  features: {
    gap: 14,
    marginBottom: 24,
  },
  featureCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  featureIcon: {
    fontSize: 28,
    marginRight: 14,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
  },

  trust: {
    fontSize: 12,
    color: "#9CA3AF",
    textAlign: "center",
    marginBottom: 8,
  },

  actions: {
    gap: 14,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  primaryBtn: {
    backgroundColor: "#16A34A",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  primaryBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  secondaryBtn: {
    alignItems: "center",
    paddingVertical: 10,
  },
  secondaryBtnText: {
    color: "#16A34A",
    fontSize: 14,
    fontWeight: "600",
  },
});

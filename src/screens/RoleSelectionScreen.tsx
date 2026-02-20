import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootStack";

type Props = NativeStackScreenProps<RootStackParamList, "RoleSelection">;

const ROLES = [
  {
    id: "student" as const,
    title: "Student",
    subtitle: "Get anonymous support",
    emoji: "🎓",
  },
  {
    id: "peer-mentor" as const,
    title: "Peer Mentor",
    subtitle: "Support fellow students",
    emoji: "🤝",
  },
  {
    id: "counselor" as const,
    title: "Counselor",
    subtitle: "Provide professional help",
    emoji: "🩺",
  },
];

export function RoleSelectionScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.heading}>Who are you?</Text>
      <Text style={styles.subtitle}>
        Choose your role. You can always change later.
      </Text>

      <View style={styles.roles}>
        {ROLES.map((role) => (
          <TouchableOpacity
            key={role.id}
            style={styles.card}
            onPress={() => {
              if (role.id === "student") {
                navigation.navigate("StudentSignup");
              } else {
                navigation.navigate("MentorApply", { role: role.id });
              }
            }}
          >
            <Text style={styles.emoji}>{role.emoji}</Text>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{role.title}</Text>
              <Text style={styles.cardSubtitle}>{role.subtitle}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0FDF4",
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  heading: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 32,
  },
  roles: {
    gap: 16,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  emoji: {
    fontSize: 32,
    marginRight: 16,
  },
  cardText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#6B7280",
  },
});

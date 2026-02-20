/**
 * EmergencyScreen — shown when crisis keywords are detected
 * or when the user taps "Need urgent help?" from the dashboard.
 *
 * Displays Ghana-specific crisis resources.
 * Safety is the product's trust anchor — this screen must ship day one.
 */

import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { GHANA_EMERGENCY_RESOURCES } from "../shared/safety";

export function EmergencyScreen() {
  const nav = useNavigation();

  const call = (number: string) => {
    Linking.openURL(`tel:${number}`).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.heading}>You are not alone</Text>
        <Text style={styles.body}>
          If you are in immediate danger, please call one of the numbers below
          or go to the nearest emergency room.
        </Text>

        <View style={styles.cards}>
          {GHANA_EMERGENCY_RESOURCES.map((r) => (
            <TouchableOpacity
              key={r.number}
              style={styles.card}
              onPress={() => call(r.number)}
            >
              <Text style={styles.cardName}>{r.name}</Text>
              <Text style={styles.cardDesc}>{r.description}</Text>
              <Text style={styles.cardNumber}>{r.number}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.tips}>
          <Text style={styles.tipsTitle}>While you wait</Text>
          <Text style={styles.tip}>
            - Move to a safe place if you can
          </Text>
          <Text style={styles.tip}>
            - Reach out to someone you trust (friend, roommate, family)
          </Text>
          <Text style={styles.tip}>
            - Take slow, deep breaths — in for 4, hold for 4, out for 4
          </Text>
        </View>

        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => nav.goBack()}
        >
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FEF2F2" },
  scroll: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 60 },
  heading: {
    fontSize: 28,
    fontWeight: "800",
    color: "#991B1B",
    marginBottom: 10,
  },
  body: {
    fontSize: 15,
    color: "#7F1D1D",
    lineHeight: 24,
    marginBottom: 28,
  },
  cards: { gap: 14, marginBottom: 28 },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 18,
    borderLeftWidth: 4,
    borderLeftColor: "#DC2626",
  },
  cardName: { fontSize: 16, fontWeight: "700", color: "#111827", marginBottom: 2 },
  cardDesc: { fontSize: 12, color: "#6B7280", marginBottom: 8 },
  cardNumber: { fontSize: 20, fontWeight: "800", color: "#DC2626" },
  tips: {
    backgroundColor: "#FFF7ED",
    borderRadius: 14,
    padding: 20,
    marginBottom: 28,
  },
  tipsTitle: { fontSize: 15, fontWeight: "700", color: "#92400E", marginBottom: 8 },
  tip: { fontSize: 13, color: "#78350F", lineHeight: 22 },
  backBtn: {
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
  },
  backBtnText: { color: "#991B1B", fontSize: 15, fontWeight: "600" },
});

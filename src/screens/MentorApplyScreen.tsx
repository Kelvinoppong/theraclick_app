import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import type { RootStackParamList } from "../navigation/RootStack";
import { useAuth } from "../context/AuthContext";

type Props = NativeStackScreenProps<RootStackParamList, "MentorApply">;

export function MentorApplyScreen({ route }: Props) {
  const role = route.params.role;
  const label = role === "peer-mentor" ? "Peer Mentor" : "Counselor";

  const { applyForRole, isFirebaseBacked } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [specialization, setSpecialization] = useState("");
  const [about, setAbout] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handleApply = async () => {
    if (!fullName || !email || !password || !specialization) {
      Alert.alert("Missing fields", "Please fill in all required fields.");
      return;
    }
    if (!isFirebaseBacked) {
      Alert.alert("Demo mode", "Firebase is not configured.");
      return;
    }
    setBusy(true);
    try {
      await applyForRole({ role, fullName, email, specialization, about, password });
    } catch (e: any) {
      Alert.alert("Application failed", e?.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Apply as {label}</Text>
        <Text style={styles.subtitle}>
          Your account will be reviewed by an admin before activation.
        </Text>

        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="Full Name *" placeholderTextColor="#9CA3AF" value={fullName} onChangeText={setFullName} />
          <TextInput style={styles.input} placeholder="Email *" placeholderTextColor="#9CA3AF" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Specialization *" placeholderTextColor="#9CA3AF" value={specialization} onChangeText={setSpecialization} />
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="Tell us about yourself"
            placeholderTextColor="#9CA3AF"
            value={about}
            onChangeText={setAbout}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
          <TextInput style={styles.input} placeholder="Password *" placeholderTextColor="#9CA3AF" value={password} onChangeText={setPassword} secureTextEntry />
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleApply} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Submit Application</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F0FDF4" },
  scroll: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 60 },
  heading: { fontSize: 26, fontWeight: "800", color: "#111827", marginBottom: 6 },
  subtitle: { fontSize: 13, color: "#6B7280", marginBottom: 28 },
  form: { gap: 14 },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  multiline: { minHeight: 100 },
  btn: {
    backgroundColor: "#16A34A",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24,
  },
  btnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});

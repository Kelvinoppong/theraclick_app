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
import { useAuth } from "../context/AuthContext";

export function StudentSignupScreen() {
  const { signupStudent, isFirebaseBacked } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [schoolEmail, setSchoolEmail] = useState("");
  const [school, setSchool] = useState("");
  const [educationLevel, setEducationLevel] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSignup = async () => {
    if (!fullName || !email || !password) {
      Alert.alert("Missing fields", "Please fill in your name, email and password.");
      return;
    }
    if (!isFirebaseBacked) {
      Alert.alert("Demo mode", "Firebase is not configured. Running in demo mode.");
      return;
    }
    setBusy(true);
    try {
      await signupStudent({ fullName, email, schoolEmail, school, educationLevel, password });
    } catch (e: any) {
      Alert.alert("Signup failed", e?.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Student Sign Up</Text>
        <Text style={styles.subtitle}>Your identity stays private. Anonymous mode is always available.</Text>

        <View style={styles.form}>
          <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor="#9CA3AF" value={fullName} onChangeText={setFullName} />
          <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#9CA3AF" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="School Email (optional)" placeholderTextColor="#9CA3AF" value={schoolEmail} onChangeText={setSchoolEmail} keyboardType="email-address" autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="School / University" placeholderTextColor="#9CA3AF" value={school} onChangeText={setSchool} />
          <TextInput style={styles.input} placeholder="Education Level (e.g. Undergraduate)" placeholderTextColor="#9CA3AF" value={educationLevel} onChangeText={setEducationLevel} />
          <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#9CA3AF" value={password} onChangeText={setPassword} secureTextEntry />
        </View>

        <TouchableOpacity style={styles.btn} onPress={handleSignup} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Create Account</Text>}
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
  btn: {
    backgroundColor: "#16A34A",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 24,
  },
  btnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
});

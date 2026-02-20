/**
 * RootStack — top-level navigator.
 *
 * Decides which flow to show based on auth state:
 *   - Not loaded yet → splash / loading
 *   - No profile / no role → onboarding (Welcome → RoleSelection → setup)
 *   - Role set but status=pending → PendingApproval
 *   - Active → MainTabs
 *
 * WHY a stack at the root? So auth screens and the main app
 * live in separate groups and we can do a clean "replace" transition
 * when the user logs in.
 */

import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "../context/AuthContext";

import { WelcomeScreen } from "../screens/WelcomeScreen";
import { RoleSelectionScreen } from "../screens/RoleSelectionScreen";
import { StudentSignupScreen } from "../screens/StudentSignupScreen";
import { MentorApplyScreen } from "../screens/MentorApplyScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { PendingApprovalScreen } from "../screens/PendingApprovalScreen";
import { EmergencyScreen } from "../screens/EmergencyScreen";
import { MainTabs } from "./BottomTabs";

export type RootStackParamList = {
  Welcome: undefined;
  RoleSelection: undefined;
  StudentSignup: undefined;
  MentorApply: { role: "peer-mentor" | "counselor" };
  Login: undefined;
  PendingApproval: undefined;
  Emergency: undefined;
  MainTabs: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function RootNavigator() {
  const { loading, profile } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#F0FDF4" }}>
        <ActivityIndicator size="large" color="#16A34A" />
      </View>
    );
  }

  const isOnboarded = profile?.role != null;
  const isPending = profile?.status === "pending";

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#F0FDF4" },
          animation: "slide_from_right",
        }}
      >
        {!isOnboarded ? (
          // Auth / onboarding flow
          <Stack.Group>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
            <Stack.Screen name="StudentSignup" component={StudentSignupScreen} />
            <Stack.Screen name="MentorApply" component={MentorApplyScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
          </Stack.Group>
        ) : isPending ? (
          <Stack.Screen name="PendingApproval" component={PendingApprovalScreen} />
        ) : (
          // Main app
          <Stack.Group>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen
              name="Emergency"
              component={EmergencyScreen}
              options={{ presentation: "modal", animation: "slide_from_bottom" }}
            />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

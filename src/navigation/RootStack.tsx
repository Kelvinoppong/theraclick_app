/**
 * RootStack — top-level navigator.
 *
 * Decides which flow to show based on auth state:
 *   - Not loaded → splash / loading
 *   - No profile / no role → onboarding
 *   - Role set but status=pending → PendingApproval
 *   - Active → MainTabs + modal screens (Emergency, DM, Admin)
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
import { DirectMessageScreen } from "../screens/DirectMessageScreen";
import { AdminScreen } from "../screens/AdminScreen";
import { MainTabs } from "./BottomTabs";

export type RootStackParamList = {
  Welcome: undefined;
  RoleSelection: undefined;
  StudentSignup: undefined;
  MentorApply: { role: "peer-mentor" | "counselor" };
  Login: undefined;
  PendingApproval: undefined;
  Emergency: undefined;
  DirectMessage: { chatId: string; otherName: string };
  Admin: undefined;
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
          <Stack.Group>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen
              name="Emergency"
              component={EmergencyScreen}
              options={{ presentation: "modal", animation: "slide_from_bottom" }}
            />
            <Stack.Screen
              name="DirectMessage"
              component={DirectMessageScreen}
              options={{ headerShown: true, headerTitle: "Message", headerTintColor: "#16A34A" }}
            />
            <Stack.Screen
              name="Admin"
              component={AdminScreen}
              options={{ headerShown: true, headerTitle: "Admin", headerTintColor: "#16A34A" }}
            />
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

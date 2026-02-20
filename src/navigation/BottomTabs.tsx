/**
 * BottomTabs — main app tabs after user is authenticated.
 *
 * Role-aware: Students get the full 5-tab layout.
 * Mentors/Counselors get their own dashboard + messages + profile.
 */

import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "react-native";

import { useAuth } from "../context/AuthContext";

import { StudentDashboardScreen } from "../screens/StudentDashboardScreen";
import { MentorDashboardScreen } from "../screens/MentorDashboardScreen";
import { CounselorDashboardScreen } from "../screens/CounselorDashboardScreen";
import { ChatScreen } from "../screens/ChatScreen";
import { ForumsScreen } from "../screens/ForumsScreen";
import { BookingScreen } from "../screens/BookingScreen";
import { ProfileScreen } from "../screens/ProfileScreen";

export type MainTabsParamList = {
  Dashboard: undefined;
  Chat: undefined;
  Forums: undefined;
  Booking: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabsParamList>();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Dashboard: "🏠",
    Chat: "💬",
    Forums: "👥",
    Booking: "📅",
    Profile: "👤",
  };
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>
      {icons[label] || "•"}
    </Text>
  );
}

export function MainTabs() {
  const { profile } = useAuth();
  const role = profile?.role;

  const DashboardComponent =
    role === "peer-mentor"
      ? MentorDashboardScreen
      : role === "counselor"
        ? CounselorDashboardScreen
        : StudentDashboardScreen;

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => (
          <TabIcon label={route.name} focused={focused} />
        ),
        tabBarActiveTintColor: "#16A34A",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E5E7EB",
          paddingBottom: 6,
          paddingTop: 6,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardComponent} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Forums" component={ForumsScreen} />
      {role === "student" && (
        <Tab.Screen name="Booking" component={BookingScreen} />
      )}
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

/**
 * BottomTabs — main app tabs after user is authenticated.
 *
 * Mirrors the web's BottomNav.tsx component layout:
 *   Dashboard | Chat | Forums | Booking
 */

import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text } from "react-native";

import { StudentDashboardScreen } from "../screens/StudentDashboardScreen";
import { ChatScreen } from "../screens/ChatScreen";
import { ForumsScreen } from "../screens/ForumsScreen";
import { BookingScreen } from "../screens/BookingScreen";

export type MainTabsParamList = {
  Dashboard: undefined;
  Chat: undefined;
  Forums: undefined;
  Booking: undefined;
};

const Tab = createBottomTabNavigator<MainTabsParamList>();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Dashboard: "🏠",
    Chat: "💬",
    Forums: "👥",
    Booking: "📅",
  };
  return (
    <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.5 }}>
      {icons[label] || "•"}
    </Text>
  );
}

export function MainTabs() {
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
      <Tab.Screen name="Dashboard" component={StudentDashboardScreen} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      <Tab.Screen name="Forums" component={ForumsScreen} />
      <Tab.Screen name="Booking" component={BookingScreen} />
    </Tab.Navigator>
  );
}

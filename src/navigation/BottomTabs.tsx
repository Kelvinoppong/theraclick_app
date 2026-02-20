/**
 * BottomTabs — main app tabs after user is authenticated.
 *
 * Role-aware: Students get the full layout with Booking.
 * All roles get: Dashboard, Chat, Notifications, Forums, Profile.
 * Notifications tab shows an unread badge count.
 */

import React, { useCallback, useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text, View, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { useAuth } from "../context/AuthContext";
import { getUnreadCount } from "../services/notificationStore";

import { StudentDashboardScreen } from "../screens/StudentDashboardScreen";
import { MentorDashboardScreen } from "../screens/MentorDashboardScreen";
import { CounselorDashboardScreen } from "../screens/CounselorDashboardScreen";
import { ChatScreen } from "../screens/ChatScreen";
import { ForumsScreen } from "../screens/ForumsScreen";
import { BookingScreen } from "../screens/BookingScreen";
import { NotificationsScreen } from "../screens/NotificationsScreen";
import { ProfileScreen } from "../screens/ProfileScreen";

export type MainTabsParamList = {
  Dashboard: undefined;
  Chat: undefined;
  Forums: undefined;
  Booking: undefined;
  Notifications: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabsParamList>();

const TAB_ICONS: Record<string, string> = {
  Dashboard: "🏠",
  Chat: "💬",
  Forums: "👥",
  Booking: "📅",
  Notifications: "🔔",
  Profile: "👤",
};

function TabIcon({
  label,
  focused,
  badge,
}: {
  label: string;
  focused: boolean;
  badge?: number;
}) {
  return (
    <View style={iconStyles.wrap}>
      <Text style={{ fontSize: 22, opacity: focused ? 1 : 0.45 }}>
        {TAB_ICONS[label] || "•"}
      </Text>
      {badge != null && badge > 0 && (
        <View style={iconStyles.badge}>
          <Text style={iconStyles.badgeText}>
            {badge > 9 ? "9+" : badge}
          </Text>
        </View>
      )}
    </View>
  );
}

const iconStyles = StyleSheet.create({
  wrap: { position: "relative" },
  badge: {
    position: "absolute",
    top: -4,
    right: -10,
    backgroundColor: "#EF4444",
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});

export function MainTabs() {
  const { profile } = useAuth();
  const role = profile?.role;
  const [unread, setUnread] = useState(0);

  // Refresh unread count every time any tab gains focus
  useFocusEffect(
    useCallback(() => {
      getUnreadCount().then(setUnread);
    }, [])
  );

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
          <TabIcon
            label={route.name}
            focused={focused}
            badge={route.name === "Notifications" ? unread : undefined}
          />
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
          fontSize: 10,
          fontWeight: "600",
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardComponent} />
      <Tab.Screen name="Chat" component={ChatScreen} />
      {role === "student" && (
        <Tab.Screen name="Booking" component={BookingScreen} />
      )}
      <Tab.Screen name="Forums" component={ForumsScreen} />
      <Tab.Screen name="Notifications" component={NotificationsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

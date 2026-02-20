/**
 * BottomTabs — role-aware bottom navigation.
 *
 * Different tabs per role:
 *   Admin    → Dashboard, Users, Approvals, Forums, Profile
 *   Student  → Dashboard, Chat, Booking, Forums, Notifications, Profile
 *   Others   → Dashboard, Chat, Forums, Notifications, Profile
 *
 * Notifications tab has a red unread badge.
 */

import React, { useCallback, useEffect, useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Text, View, StyleSheet, AppState } from "react-native";

import { useAuth } from "../context/AuthContext";
import { getUnreadCount } from "../services/notificationStore";

import { StudentDashboardScreen } from "../screens/StudentDashboardScreen";
import { MentorDashboardScreen } from "../screens/MentorDashboardScreen";
import { CounselorDashboardScreen } from "../screens/CounselorDashboardScreen";
import { AdminDashboardScreen } from "../screens/AdminDashboardScreen";
import { AllUsersScreen } from "../screens/AllUsersScreen";
import { ApprovalsScreen } from "../screens/ApprovalsScreen";
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
  Users: undefined;
  Approvals: undefined;
};

const Tab = createBottomTabNavigator<MainTabsParamList>();

const TAB_ICONS: Record<string, string> = {
  Dashboard: "🏠",
  Chat: "💬",
  Forums: "👥",
  Booking: "📅",
  Notifications: "🔔",
  Profile: "👤",
  Users: "📋",
  Approvals: "✅",
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
  const isAdmin = role === "admin";
  const [unread, setUnread] = useState(0);

  const refreshBadge = useCallback(() => {
    getUnreadCount().then(setUnread);
  }, []);

  useEffect(() => {
    refreshBadge();
  }, [refreshBadge]);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshBadge();
    });
    return () => sub.remove();
  }, [refreshBadge]);

  /* ─── Admin gets a completely different tab layout ─── */
  if (isAdmin) {
    return (
      <Tab.Navigator
        screenListeners={{
          state: () => refreshBadge(),
        }}
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused }) => (
            <TabIcon label={route.name} focused={focused} />
          ),
          tabBarActiveTintColor: "#16A34A",
          tabBarInactiveTintColor: "#9CA3AF",
          tabBarStyle: tabBarStyle,
          tabBarLabelStyle: tabBarLabelStyle,
        })}
      >
        <Tab.Screen name="Dashboard" component={AdminDashboardScreen} />
        <Tab.Screen name="Users" component={AllUsersScreen} />
        <Tab.Screen name="Approvals" component={ApprovalsScreen} />
        <Tab.Screen name="Forums" component={ForumsScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    );
  }

  /* ─── Standard layout for students, mentors, counselors ─── */
  const DashboardComponent =
    role === "peer-mentor"
      ? MentorDashboardScreen
      : role === "counselor"
        ? CounselorDashboardScreen
        : StudentDashboardScreen;

  return (
    <Tab.Navigator
      screenListeners={{
        state: () => refreshBadge(),
      }}
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
        tabBarStyle: tabBarStyle,
        tabBarLabelStyle: tabBarLabelStyle,
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

const tabBarStyle = {
  backgroundColor: "#FFFFFF",
  borderTopColor: "#E5E7EB",
  paddingBottom: 6,
  paddingTop: 6,
  height: 60,
};

const tabBarLabelStyle = {
  fontSize: 10,
  fontWeight: "600" as const,
};

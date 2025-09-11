import React from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../ThemeContext";

const _Layout = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: isDark ? "#3B82F6" : "#2563EB",
        tabBarInactiveTintColor: isDark ? "#9CA3AF" : "#999",
        tabBarStyle: {
          backgroundColor: isDark ? "#1F2937" : "#fff", // tailwind dark bg-gray-800
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
          borderTopWidth: 0,
          height: 70, // slightly taller to ensure coverage
          overflow: "hidden", // hides background bleed
          position: "absolute", // pins to bottom
          left: 0,
          right: 0,
          bottom: 0, 
          elevation: 10, // Android drop shadow
          shadowColor: "#000", // iOS shadow
          shadowOpacity: 0.1,
          shadowRadius: 8,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="task"
        options={{
          title: "Tasks",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "checkmark-circle" : "checkmark-circle-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "chatbubble" : "chatbubble-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
};

export default _Layout;

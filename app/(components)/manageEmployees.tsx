import React from "react";
import { View, Text, StyleSheet, SafeAreaView } from "react-native";
import { useTheme } from "../ThemeContext"; // adjust path as needed

function ManageEmployees() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: isDark ? "#000" : "#F9FAFB" },
      ]}
    >
      <View style={styles.container}>
        <Text
          style={[
            styles.title,
            { color: isDark ? "#FFFFFF" : "#000000" },
          ]}
        >
          Manage Employees
        </Text>
        <Text
          style={[
            styles.description,
            { color: isDark ? "#9CA3AF" : "#6B7280" },
          ]}
        >
          This section allows managers to view and manage employee tasks and projects.
        </Text>
      </View>
    </SafeAreaView>
  );
}

export default ManageEmployees;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  description: {
    fontSize: 16,
  },
});

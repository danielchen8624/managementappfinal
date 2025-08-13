import { Text, View, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { router } from "expo-router";
import { useTheme } from "../ThemeContext"; //  Import theme

function SelectLogin() {
  const { theme, toggleTheme } = useTheme(); //  Use theme and toggle
  const isDark = theme === "dark";

  const handleSelect = (role: string) => {
    router.replace({
      pathname: "../login",
      params: { role },
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? "#111827" : "#F9FAFB" }}>
      <View
        style={[
          styles.container,
          { backgroundColor: isDark ? "#111827" : "#F9FAFB" },
        ]}
      >
        <Text style={[styles.title, { color: isDark ? "#f9fafb" : "#111827" }]}>
          Select Login Method
        </Text>

        <TouchableOpacity style={styles.button} onPress={() => handleSelect("employee")}>
          <Text style={styles.buttonText}>👷 Employee Login</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => handleSelect("manager")}>
          <Text style={styles.buttonText}>👨‍💼 Manager Login</Text>
        </TouchableOpacity>


      </View>
    </SafeAreaView>
  );
}

export default SelectLogin;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 28,
    textAlign: "center",
  },
  button: {
    width: "100%",
    backgroundColor: "#2563EB",
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: "center",
    elevation: 3,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});

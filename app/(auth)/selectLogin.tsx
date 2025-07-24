import { Text, View, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { router } from "expo-router";

function SelectLogin() {
  const handleSelect = (role: string) => {
    router.replace({
      pathname: "../login",
      params: { role },
    });
  };

  return (
    <SafeAreaView style = {{flex: 1, backgroundColor:"#F9FAFB"}}>
    <View style={styles.container}>
        <Text style={styles.title}>Select Login Method</Text>

        <TouchableOpacity style={styles.button} onPress={() => handleSelect("employee")}>
          <Text style={styles.buttonText}>👷 Login as Employee</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => handleSelect("manager")}>
          <Text style={styles.buttonText}>👨‍💼 Login as Manager</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => handleSelect("customer")}>
          <Text style={styles.buttonText}>🧍 Login as Customer</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export default SelectLogin;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
 
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 28,
    color: "#111827",
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

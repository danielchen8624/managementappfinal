import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { db, auth } from "../../firebaseConfig";
import { collection, addDoc } from "firebase/firestore";
import { useTheme } from "../ThemeContext";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

function AddNewBuilding() {
  const [buildingName, setBuildingName] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);

  const { theme } = useTheme();
  const isDark = theme === "dark";
  const s = getStyles(isDark);

  const canSubmit =
    buildingName.trim().length > 0 &&
    address.trim().length > 0 &&
    !loading;

  const handleSubmitBuilding = async () => {
    if (!canSubmit) {
      Alert.alert("Hold on", "Please fill in both fields.");
      return;
    }
    try {
      setLoading(true);
      await addDoc(collection(db, "buildings"), {
        name: buildingName.trim(),
        address: address.trim(),
        createdBy: auth.currentUser?.uid || "unknown",
        createdAt: new Date(),
      });
      setBuildingName("");
      setAddress("");
      Alert.alert("Success", "Building added successfully.");
      router.back();
    } catch (error) {
      console.error("Error adding building: ", error);
      Alert.alert("Error", "Could not add building. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.screen}>
      {/* Header */}
      <View style={s.headerBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.smallGreyBtn}
          accessibilityLabel="Back"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name="chevron-back"
            size={20}
            color={isDark ? "#E5E7EB" : "#111827"}
          />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Add New Building</Text>
        <View style={s.smallGreyBtnPlaceholder} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: "height" })}
        style={{ flex: 1 }}
      >
        <View style={s.container}>
          <View style={s.card}>
            <Text style={s.cardTitle}>Details</Text>
            <Text style={s.cardSubtitle}>
              Create a building to scope tasks, reports, and schedules.
            </Text>

            <Text style={s.label}>Building Name</Text>
            <TextInput
              placeholder="e.g., Lakeside Towers"
              placeholderTextColor={isDark ? "#9CA3AF" : "#9AA1AA"}
              value={buildingName}
              onChangeText={setBuildingName}
              style={s.input}
              returnKeyType="next"
            />

            <Text style={s.label}>Address</Text>
            <TextInput
              placeholder="Street, City, State"
              placeholderTextColor={isDark ? "#9CA3AF" : "#9AA1AA"}
              value={address}
              onChangeText={setAddress}
              style={s.input}
              returnKeyType="done"
            />

            <TouchableOpacity
              onPress={handleSubmitBuilding}
              activeOpacity={0.9}
              style={[
                s.primaryBtn,
                { opacity: canSubmit ? 1 : 0.8 },
              ]}
              disabled={!canSubmit}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="business-outline" size={18} color="#fff" />
                  <Text style={s.primaryBtnText}>Add Building</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.9}
              style={s.secondaryBtn}
            >
              <Ionicons
                name="arrow-back-circle"
                size={18}
                color={isDark ? "#E5E7EB" : "#111827"}
              />
              <Text style={s.secondaryBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default AddNewBuilding;

/* ---------------- Styles ---------------- */
const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
    },

    /* Header */
    headerBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 8,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: isDark ? "#F3F4F6" : "#111827",
      letterSpacing: 0.2,
    },
    smallGreyBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "#111827" : "#E5E7EB",
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#1F2937" : "transparent",
    },
    smallGreyBtnPlaceholder: { width: 36, height: 36 },

    /* Body */
    container: {
      flex: 1,
      paddingHorizontal: 16,
      paddingBottom: 16,
    },

    card: {
      backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
      borderRadius: 16,
      padding: 16,
      marginTop: 8,
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 6,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#111827" : "transparent",
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: "900",
      color: isDark ? "#F3F4F6" : "#0F172A",
      letterSpacing: 0.2,
    },
    cardSubtitle: {
      marginTop: 2,
      marginBottom: 8,
      fontSize: 12,
      fontWeight: "700",
      color: isDark ? "#94A3B8" : "#64748B",
    },

    label: {
      fontSize: 12,
      fontWeight: "800",
      marginTop: 8,
      marginBottom: 6,
      color: isDark ? "#C7D2FE" : "#1E3A8A",
      letterSpacing: 0.2,
    },
    input: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 12,
      marginBottom: 4,
      fontSize: 14,
      backgroundColor: isDark ? "#111827" : "#FFFFFF",
      borderColor: isDark ? "#1F2937" : "#E5E7EB",
      color: isDark ? "#E5E7EB" : "#111827",
    },

    primaryBtn: {
      marginTop: 12,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: isDark ? "#2563EB" : "#1D4ED8",
      paddingVertical: 14,
      borderRadius: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#1E3A8A" : "transparent",
    },
    primaryBtnText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "800",
      letterSpacing: 0.3,
    },

    secondaryBtn: {
      marginTop: 10,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: isDark ? "#111827" : "#E5E7EB",
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#1F2937" : "transparent",
    },
    secondaryBtnText: {
      color: isDark ? "#E5E7EB" : "#111827",
      fontSize: 16,
      fontWeight: "800",
      letterSpacing: 0.3,
    },
  });

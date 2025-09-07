import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from "react-native";
import { db } from "../../firebaseConfig";
import { router, useLocalSearchParams } from "expo-router";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useTheme } from "../ThemeContext";

function ManagerReportClicked() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const s = getStyles(isDark);

  const params = useLocalSearchParams();
  const buildingId = (params.buildingId as string) || "";
  const reportId = (params.reportId as string) || "";

  const title = (params.title as string) || "Untitled";
  const description = (params.description as string) || "";
  const aptNumber = (params.aptNumber as string) || "";
  const reporterName = (params.reporter_name as string) || "Unknown";
  const createdAt = (params.createdAt as string) || "—";

  const handleMarkReviewed = async () => {
    if (!buildingId || !reportId) {
      Alert.alert("Missing info", "Could not find this report’s path.");
      return;
    }
    try {
      const reportRef = doc(db, "buildings", buildingId, "reports", reportId);
      await updateDoc(reportRef, {
        managerHasReviewed: true,
        reviewedAt: serverTimestamp(),
      });
      Alert.alert("Done", "Report marked as reviewed.");
      router.back();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Failed to mark as reviewed.");
    }
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.wrap}>
        <View style={s.card}>
          {/* Title at the top */}
          <Text style={s.title}>{title}</Text>

          {/* Description label + text */}
          <Text style={s.descLabel}>Description:</Text>
          <Text style={s.desc}>{description || "No description provided."}</Text>

          {/* Image placeholder square */}
          <View style={s.imageBox}>
            <Text style={s.imageHint}>Image</Text>
          </View>

          {/* Mark as reviewed (pushed lower via larger marginTop) */}
          <Text style={s.prompt}>Mark this report as reviewed?</Text>
          <View style={s.btnRow}>
            <TouchableOpacity
              onPress={handleMarkReviewed}
              style={s.primaryBtn}
              activeOpacity={0.9}
            >
              <Text style={s.btnText}>Yes</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.back()}
              style={s.ghostBtn}
              activeOpacity={0.9}
            >
              <Text style={s.ghostBtnText}>No</Text>
            </TouchableOpacity>
          </View>

          {/* Footer meta (small text) */}
          <View style={s.metaFooter}>
            <Text style={s.metaSmall}>Apt {aptNumber || "N/A"}</Text>
            <Text style={s.metaDot}>•</Text>
            <Text style={s.metaSmall}>{reporterName}</Text>
            <Text style={s.metaDot}>•</Text>
            <Text style={s.metaSmall}>{createdAt}</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

export default ManagerReportClicked;

const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
    },
    wrap: {
      flex: 1,
      padding: 16,
      justifyContent: "center",
    },
    card: {
      borderRadius: 16,
      padding: 20,
      backgroundColor: isDark ? "#111827" : "#FFFFFF",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 6,
      elevation: 6,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#1F2937" : "transparent",
      minHeight: 520, // ⬅️ make the card taller
    },

    title: {
      fontSize: 18,
      fontWeight: "800",
      color: isDark ? "#E2E8F0" : "#0F172A",
      marginBottom: 12,
      letterSpacing: 0.2,
      textAlign: "center",
    },
    descLabel: {
      fontSize: 13,
      fontWeight: "800",
      color: isDark ? "#C7D2FE" : "#1E3A8A",
      marginBottom: 6,
    },
    desc: {
      fontSize: 14,
      color: isDark ? "#CBD5E1" : "#334155",
      lineHeight: 20,
      marginBottom: 14,
    },

    // Square placeholder for image
    imageBox: {
      width: "100%",
      height: "55%",
      alignSelf: "center",
      borderRadius: 12,
      borderWidth: 1,
      borderStyle: "dashed",
      borderColor: isDark ? "#374151" : "#D1D5DB",
      backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 4,
      marginBottom: 28,
    },
    imageHint: {
      fontSize: 12,
      color: isDark ? "#94A3B8" : "#64748B",
      fontWeight: "700",
    },

    // Push the review prompt lower
    prompt: {
      fontSize: 15,
      fontWeight: "700",
      color: isDark ? "#E5E7EB" : "#111827",
      marginTop: 24, // ⬅️ larger spacing
      textAlign: "center",
    },
    btnRow: {
      flexDirection: "row",
      justifyContent: "space-around",
      marginTop: 16,
      gap: 10,
    },
    primaryBtn: {
      flex: 1,
      backgroundColor: isDark ? "#2563EB" : "#1D4ED8",
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: "center",
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },
    btnText: {
      color: "#fff",
      fontSize: 15,
      fontWeight: "800",
      letterSpacing: 0.2,
    },
    ghostBtn: {
      flex: 1,
      backgroundColor: isDark ? "#111827" : "#E5E7EB",
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: "center",
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#1F2937" : "transparent",
    },
    ghostBtnText: {
      color: isDark ? "#E5E7EB" : "#111827",
      fontSize: 15,
      fontWeight: "800",
      letterSpacing: 0.2,
    },

    metaFooter: {
      marginTop: 16,
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: 6,
      justifyContent: "center",
    },
    metaSmall: {
      fontSize: 11,
      color: isDark ? "#94A3B8" : "#64748B",
    },
    metaDot: {
      fontSize: 11,
      color: isDark ? "#475569" : "#94A3B8",
      marginHorizontal: 2,
    },
  });

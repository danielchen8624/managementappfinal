import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
} from "react-native";
import React, { useEffect, useState } from "react";
import { db } from "../../firebaseConfig";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useTheme } from "../ThemeContext";
import { useUser } from "../UserContext";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

type Report = {
  id: string;
  type?: string;
  location?: string;
  details?: string;
  createdBy?: string;
  createdAt?: { toDate: () => Date };
  managerHasReviewed: boolean;
  aptNumber?: string;
  description?: string;
  status?: string;
};

type ReportModalProps = {
  visible: boolean;
  onClose: () => void;
};

function ManagerViewReportsModal({ visible, onClose }: ReportModalProps) {
  const [pendingReports, setPendingReports] = useState<Report[]>([]);
  const { loading } = useUser();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const s = getStyles(isDark);

  useEffect(() => {
    if (!visible) return;

    const qReports = query(
      collection(db, "reports"),
      where("managerHasReviewed", "==", false)
    );

    const unsub = onSnapshot(
      qReports,
      (snap) => {
        const items: Report[] = [];
        snap.forEach((d) => items.push({ ...(d.data() as Report), id: d.id }));
        items.sort(
          (a, b) =>
            (b.createdAt?.toDate().getTime() ?? 0) -
            (a.createdAt?.toDate().getTime() ?? 0)
        );
        setPendingReports(items);
      },
      (err) => console.error("reports onSnapshot error:", err)
    );

    return () => unsub();
  }, [visible]);

  if (!visible) return null;

  const openReport = (r: Report) => {
    router.push({
      pathname: "/reportClicked",
      params: {
        reportId: r.id,
        type: r.type ?? "",
        location: r.location ?? "",
        createdBy: r.createdBy ?? "",
        createdAt: r.createdAt?.toDate().toLocaleString() ?? "",
        aptNumber: r.aptNumber ?? "",
        description: r.description ?? "",
        status: r.status ?? "",
      },
    });
    onClose();
  };

  return (
    <Modal animationType="slide" transparent visible={visible}>
      <View style={s.modalOverlay}>
        <View style={s.modalContainer}>
          {/* Header */}
          <View style={s.headerRow}>
            <Text style={s.headerTitle}>Reports awaiting review</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons
                name="close"
                size={20}
                color={isDark ? "#E5E7EB" : "#111827"}
              />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={s.center}>
              <ActivityIndicator color={isDark ? "#fff" : "#000"} />
              <Text style={s.loadingText}>Loading…</Text>
            </View>
          ) : pendingReports.length === 0 ? (
            <View style={s.center}>
              <Ionicons
                name="document-text-outline"
                size={24}
                color={isDark ? "#94A3B8" : "#64748B"}
              />
              <Text style={s.emptyText}>No reports awaiting review.</Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={{ paddingBottom: 8 }}
              showsVerticalScrollIndicator={false}
            >
              {pendingReports.map((r) => (
                <TouchableOpacity key={r.id} onPress={() => openReport(r)} activeOpacity={0.9}>
                  <View style={s.card}>
                    <View style={s.cardHeader}>
                      <Text style={s.cardTitle}>
                        Apt {r.aptNumber || "N/A"}
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={isDark ? "#CBD5E1" : "#64748B"}
                      />
                    </View>

                    <Text style={s.cardLine} numberOfLines={2}>
                      {r.description || "No description"}
                    </Text>
                    <Text style={s.metaLine}>
                      Created by {r.createdBy || "Unknown"} ·{" "}
                      {r.createdAt?.toDate().toLocaleString() || "—"}
                    </Text>

                    {/* status pill */}
                    <View style={s.statusRow}>
                      <View
                        style={[
                          s.statusPill,
                          {
                            backgroundColor:
                              (r.status || "").toLowerCase() === "urgent"
                                ? "#EF4444"
                                : (r.status || "").toLowerCase() === "in_progress"
                                ? "#EAB308"
                                : "#3B82F6",
                          },
                        ]}
                      >
                        <Text style={s.statusPillText}>
                          {(r.status || "new").replace(/_/g, " ")}
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

export default ManagerViewReportsModal;

const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.35)",
      justifyContent: "center",
      alignItems: "center",
      padding: 12,
    },
    modalContainer: {
      width: "85%" as `${number}%`,          // typed % to satisfy RN types
      maxHeight: "70%" as `${number}%`,      // typed % to satisfy RN types
      borderRadius: 16,
      padding: 16,
      backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.2,
      shadowRadius: 10,
      elevation: 10,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#111827" : "transparent",
    },

    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: isDark ? "#E5E7EB" : "#0F172A",
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "#111827" : "#E5E7EB",
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#1F2937" : "transparent",
    },

    center: {
      paddingVertical: 24,
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
    },
    loadingText: {
      color: isDark ? "#CBD5E1" : "#111827",
      marginTop: 6,
    },
    emptyText: {
      color: isDark ? "#94A3B8" : "#6B7280",
      marginTop: 6,
    },

    card: {
      backgroundColor: isDark ? "#111827" : "#F8FAFC",
      borderRadius: 14,
      padding: 14,
      marginBottom: 10,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#1F2937" : "transparent",
    },
    cardHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 6,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: isDark ? "#E2E8F0" : "#0F172A",
    },
    cardLine: {
      fontSize: 14,
      color: isDark ? "#CBD5E1" : "#334155",
      marginBottom: 2,
    },
    metaLine: {
      fontSize: 12,
      color: isDark ? "#94A3B8" : "#64748B",
    },

    statusRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginTop: 8,
    },
    statusPill: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
    },
    statusPillText: {
      color: "#fff",
      fontWeight: "800",
      fontSize: 12,
      letterSpacing: 0.2,
      textTransform: "capitalize",
    },
  });

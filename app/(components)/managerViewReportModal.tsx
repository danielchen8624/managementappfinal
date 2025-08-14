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
        snap.forEach((d) => {
          // Spread first, then set id so it isn't overwritten
          items.push({ ...(d.data() as Report), id: d.id });
        });
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
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContainer,
            { backgroundColor: isDark ? "#1e1e1e" : "#FFFFFF" },
          ]}
        >
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={[styles.closeButtonText, { color: isDark ? "#bbb" : "#888" }]}>
              ×
            </Text>
          </TouchableOpacity>

          {loading ? (
            <View style={{ alignItems: "center", justifyContent: "center" }}>
              <ActivityIndicator color={isDark ? "#fff" : "#000"} />
              <Text style={{ color: isDark ? "#ccc" : "#000", marginTop: 8 }}>
                Loading...
              </Text>
            </View>
          ) : pendingReports.length === 0 ? (
            <Text style={[styles.emptyText, { color: isDark ? "#aaa" : "#999" }]}>
              No reports awaiting review.
            </Text>
          ) : (
            <ScrollView>
              {pendingReports.map((r) => (
                <TouchableOpacity key={r.id} onPress={() => openReport(r)}>
                  <View
                    style={[
                      styles.taskCard,
                      {
                        backgroundColor: isDark ? "#2a2a2a" : "#F9FAFB",
                        shadowColor: isDark ? "#000" : "#000",
                      },
                    ]}
                  >
                    <Text style={[styles.taskTitle, { color: isDark ? "#fff" : "#000" }]}>
                      Apt: {r.aptNumber || "N/A"}
                    </Text>
                    <Text style={[styles.taskText, { color: isDark ? "#ccc" : "#444" }]}>
                      Description: {r.description || "No description"}
                    </Text>
                    <Text style={[styles.taskText, { color: isDark ? "#ccc" : "#444" }]}>
                      Created By: {r.createdBy || "Unknown"}
                    </Text>
                    <Text style={[styles.taskText, { color: isDark ? "#ccc" : "#444" }]}>
                      Created At: {r.createdAt?.toDate().toLocaleString() || "—"}
                    </Text>
                    <Text style={[styles.taskText, { color: isDark ? "#ccc" : "#444" }]}>
                      Status: {r.status || "Unknown"}
                    </Text>
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

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "85%",
    maxHeight: "70%",
    borderRadius: 16,
    padding: 20,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
  },
  closeButton: { alignSelf: "flex-end", marginBottom: 10 },
  closeButtonText: { fontSize: 24 },
  taskCard: {
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  taskTitle: { fontSize: 16, fontWeight: "600", marginBottom: 5 },
  taskText: { fontSize: 14, marginBottom: 3 },
  emptyText: { fontSize: 16, textAlign: "center", marginTop: 20 },
});

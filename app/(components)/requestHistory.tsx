import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  RefreshControl,
} from "react-native";
import { db, auth } from "../../firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
import { router } from "expo-router";
import { useTheme } from "../ThemeContext";
import { Ionicons } from "@expo/vector-icons";

type Request = {
  id: string;
  type: string;
  description: string;
  status: string;
  createdAt?: { toDate: () => Date };
};

const statusColor = (s: string) => {
  const k = s?.toLowerCase();
  if (k === "completed" || k === "done") return "#22C55E";
  if (k === "assigned" || k === "in_progress") return "#EAB308";
  return "#EF4444"; // pending / default
};

export default function RequestHistory() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const s = getStyles(isDark);

  const [requests, setRequests] = useState<Request[]>([]);
  const [editingRequest, setEditingRequest] = useState<Request | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  
  const isLocked = (item: any) => {
    const s = String(item.status ?? "").toLowerCase();
    return s === "completed" || s === "in_progress";
  };

  const fetchUserRequests = useCallback(async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return;

    const qy = query(collection(db, "tasks"), where("createdBy", "==", userId));
    try {
      const snapshot = await getDocs(qy);
      const userRequests: Request[] = snapshot.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          type: data.taskType ?? data.title ?? "N/A",
          description: data.description ?? "",
          status: data.status ?? "pending",
          createdAt: data.createdAt,
        };
      });

      userRequests.sort((a, b) => {
        const aDate = a.createdAt?.toDate?.() ?? new Date(0);
        const bDate = b.createdAt?.toDate?.() ?? new Date(0);
        return bDate.getTime() - aDate.getTime();
      });

      setRequests(userRequests);
    } catch (error) {
      console.error("Error fetching requests:", error);
    }
  }, []);

  useEffect(() => {
    fetchUserRequests();
  }, [fetchUserRequests]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserRequests();
    setRefreshing(false);
  };

  const handleDelete = async (id: string) => {
    Alert.alert("Delete request?", "This action cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(doc(db, "tasks", id));
            fetchUserRequests();
          } catch (error) {
            console.error("Failed to delete request:", error);
          }
        },
      },
    ]);
  };

  const handleEdit = (request: Request) => {
    setEditingRequest(request);
    setEditDescription(request.description);
  };

  const saveEdit = async () => {
    if (!editingRequest) return;
    try {
      await updateDoc(doc(db, "tasks", editingRequest.id), {
        description: editDescription,
      });
      setEditingRequest(null);
      fetchUserRequests();
    } catch (error) {
      console.error("Error updating request:", error);
    }
  };

  return (
    <SafeAreaView style={s.container}>
      {/* Top bar */}
      <View style={s.headerRow}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={s.navBtn}
          activeOpacity={0.9}
          accessibilityLabel="Back"
        >
          <Ionicons
            name="chevron-back"
            size={18}
            color={isDark ? "#E5E7EB" : "#111827"}
          />
        </TouchableOpacity>
        <Text style={s.headerTitle}>My Requests</Text>
        {/* spacer for symmetry */}
        <View style={{ width: 36, height: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {requests.length === 0 ? (
          <View style={s.emptyWrap}>
            <Ionicons
              name="document-text-outline"
              size={28}
              color={isDark ? "#94A3B8" : "#64748B"}
            />
            <Text style={s.emptyText}>No requests yet</Text>
            <Text style={s.emptySubtle}>
              Your submitted requests will appear here.
            </Text>
          </View>
        ) : (
          requests.map((item) => (
            <View key={item.id} style={s.card}>
              {/* right status rail */}
              <View style={s.pillRail}>
                <View
                  style={[
                    s.pill,
                    { backgroundColor: statusColor(item.status) },
                  ]}
                />
              </View>

              <View style={{ paddingRight: 14 }}>
                <View style={s.titleRow}>
                  <Text style={s.titleText}>{item.type || "Untitled"}</Text>
                  <View style={s.statusChip}>
                    <Text style={s.statusChipText}>
                      {item.status || "pending"}
                    </Text>
                  </View>
                </View>

                {!!item.description && (
                  <Text style={s.descText}>{item.description}</Text>
                )}

                <Text style={s.metaText}>
                  Submitted:{" "}
                  {item.createdAt?.toDate?.()?.toLocaleString?.() ?? "Unknown"}
                </Text>

                <View style={s.actionsRow}>
                  <TouchableOpacity
                    style={[s.actionBtn, s.actionNeutral]}
                    onPress={() => handleEdit(item)}
                    activeOpacity={0.9}
                  >
                    <Ionicons name="pencil-outline" size={16} color="#111827" />
                    <Text style={s.actionNeutralText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[s.actionBtn, s.actionDanger]}
                    onPress={() => handleDelete(item.id)}
                    activeOpacity={0.9}
                  >
                    <Ionicons name="trash-outline" size={16} color="#fff" />
                    <Text style={s.actionDangerText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Edit Modal */}
      <Modal visible={!!editingRequest} animationType="fade" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Edit Request</Text>
              <TouchableOpacity
                onPress={() => setEditingRequest(null)}
                style={s.modalClose}
                hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              >
                <Ionicons
                  name="close"
                  size={18}
                  color={isDark ? "#93A4B3" : "#6B7280"}
                />
              </TouchableOpacity>
            </View>

            <Text style={s.inputLabel}>Description</Text>
            <TextInput
              style={s.input}
              value={editDescription}
              onChangeText={setEditDescription}
              multiline
              placeholder="Describe the request"
              placeholderTextColor={isDark ? "#9CA3AF" : "#9AA1AA"}
              textAlignVertical="top"
            />

            <View style={s.modalActions}>
              <TouchableOpacity
                onPress={() => setEditingRequest(null)}
                style={[s.modalBtn, s.modalNeutral]}
                activeOpacity={0.9}
              >
                <Text style={s.modalNeutralText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={saveEdit}
                style={[s.modalBtn, s.modalPrimary]}
                activeOpacity={0.9}
              >
                <Text style={s.modalPrimaryText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ---------------- Styles ---------------- */
const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? "#0B1220" : "#F8FAFC",
    },

    /* Header */
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom: 4,
    },
    navBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "#111827" : "#E5E7EB",
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#1F2937" : "transparent",
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "800",
      color: isDark ? "#F3F4F6" : "#111827",
      letterSpacing: 0.2,
    },

    /* Content */
    scrollContent: { padding: 12, paddingBottom: 28 },

    emptyWrap: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 48,
      gap: 8,
    },
    emptyText: {
      fontSize: 16,
      fontWeight: "700",
      color: isDark ? "#E5E7EB" : "#111827",
    },
    emptySubtle: {
      fontSize: 13,
      color: isDark ? "#94A3B8" : "#64748B",
    },

    /* Card */
    card: {
      backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
      borderRadius: 16,
      padding: 14,
      marginVertical: 8,
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#111827" : "transparent",
      position: "relative",
      overflow: "hidden",
    },
    pillRail: {
      position: "absolute",
      right: 8,
      top: 8,
      bottom: 8,
      width: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    pill: {
      width: 8,
      height: "80%",
      borderRadius: 8,
    },
    titleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 10,
      marginBottom: 6,
    },
    titleText: {
      fontSize: 16,
      fontWeight: "800",
      color: isDark ? "#E5E7EB" : "#0F172A",
      letterSpacing: 0.2,
      flexShrink: 1,
    },
    statusChip: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: isDark ? "#111827" : "#E5E7EB",
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#1F2937" : "transparent",
    },
    statusChipText: {
      fontSize: 12,
      fontWeight: "800",
      color: isDark ? "#E5E7EB" : "#111827",
      textTransform: "capitalize",
      letterSpacing: 0.2,
    },
    descText: {
      fontSize: 14,
      color: isDark ? "#CBD5E1" : "#334155",
      marginBottom: 6,
    },
    metaText: {
      fontSize: 12,
      color: isDark ? "#94A3B8" : "#64748B",
    },

    actionsRow: {
      flexDirection: "row",
      justifyContent: "flex-end",
      marginTop: 10,
      gap: 10,
    },
    actionBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 10,
    },
    actionNeutral: { backgroundColor: isDark ? "#F3F4F6" : "#E5E7EB" },
    actionNeutralText: { color: "#111827", fontWeight: "800" },
    actionDanger: { backgroundColor: "#EF4444" },
    actionDangerText: { color: "#fff", fontWeight: "800" },

    /* Modal */
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.35)",
      justifyContent: "flex-end",
      padding: 12,
    },
    modalSheet: {
      width: "100%",
      borderRadius: 16,
      padding: 14,
      backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
      shadowColor: "#000",
      shadowOpacity: 0.16,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 6 },
      elevation: 10,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#111827" : "transparent",
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 6,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: "800",
      color: isDark ? "#F3F4F6" : "#0F172A",
      letterSpacing: 0.2,
    },
    modalClose: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "#111827" : "#E5E7EB",
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#1F2937" : "transparent",
    },
    inputLabel: {
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
      marginBottom: 8,
      fontSize: 14,
      minHeight: 96,
      backgroundColor: isDark ? "#111827" : "#FFFFFF",
      borderColor: isDark ? "#1F2937" : "#E5E7EB",
      color: isDark ? "#E5E7EB" : "#111827",
    },
    modalActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 10,
      marginTop: 8,
    },
    modalBtn: {
      paddingVertical: 12,
      paddingHorizontal: 14,
      borderRadius: 12,
    },
    modalNeutral: {
      backgroundColor: isDark ? "#111827" : "#E5E7EB",
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#1F2937" : "transparent",
    },
    modalNeutralText: {
      color: isDark ? "#E5E7EB" : "#111827",
      fontWeight: "800",
    },
    modalPrimary: { backgroundColor: isDark ? "#2563EB" : "#1D4ED8" },
    modalPrimaryText: { color: "#fff", fontWeight: "800" },
  });

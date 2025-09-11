import React, { useEffect, useRef, useState, useMemo } from "react";
import { router } from "expo-router";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Alert,
  Animated,
  Easing,
  ScrollView,
  Modal,
  FlatList,
} from "react-native";
import {
  addDoc,
  collection,
  serverTimestamp,
  doc,
  updateDoc,
  query,
  where,
  limit,
  getDocs,
  onSnapshot,
  orderBy,
  // getDoc, setDoc // (keep handy if needed later)
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db, auth } from "../../firebaseConfig";
import ProjectModal from "../(components)/taskModal";
import ReportModal from "../(components)/reportModal";
import ManagerViewReportsModal from "../(components)/managerViewReportModal";
import CurrentTaskModal from "../(components)/currentTaskModal";
import TaskReviewModal from "../(components)/taskReviewModal";
import { useUser } from "../UserContext";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { useTheme } from "../ThemeContext";
import { useShiftTimer } from "../(hooks)/secondsCounter";

// 🔑 Building context
import { useBuilding } from "../BuildingContext";
import { set } from "firebase/database";

const { height: SCREEN_H } = Dimensions.get("window");

type LatestReport = {
  id: string;
  title?: string;
  description?: string;
  createdAt?: any;
  createdByName?: string;
  status?: string;
};

type Building = {
  id: string;
  name?: string;
  address?: string;
};

function HomePage() {
  const [taskModal, setTaskModal] = useState(false);
  const [reportModal, setReportModal] = useState(false);
  const [currentTaskModal, setCurrentTaskModal] = useState(false);
  const [managerViewReportModal, setManagerViewReportModal] = useState(false);
  const [reviewModal, setReviewModal] = useState(false);
  const [currentShiftId, setCurrentShiftId] = useState("");

  const [latestReport, setLatestReport] = useState<LatestReport | null>(null);
  const [latestLoading, setLatestLoading] = useState(true);

  const { role, loading } = useUser();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const s = getStyles(isDark);

  const themeAnim = useRef(new Animated.Value(isDark ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(themeAnim, {
      toValue: isDark ? 1 : 0,
      duration: 220,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [isDark, themeAnim]);

  const uid = auth.currentUser?.uid;
  const { hhmmss } = useShiftTimer(uid);

  // 🌆 Building context
  const { buildingId, setBuildingId } = useBuilding();

  // ---- Building-scoped refs (reads/writes only inside the current building) ----
  const subcol = (sub: "tasks" | "reports" | "messages") =>
    buildingId ? collection(db, "buildings", buildingId, sub) : null;

  const docIn = (sub: "tasks" | "reports" | "messages", id: string) =>
    buildingId ? doc(db, "buildings", buildingId, sub, id) : null;

  // ---- Building picker state ----
  const [buildingPickerOpen, setBuildingPickerOpen] = useState(false);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingsLoading, setBuildingsLoading] = useState(false);

  // Load buildings the user can see (adjust filter to your membership model)
  useEffect(() => {
    (async () => {
      setBuildingsLoading(true);
      try {
        const colRef = collection(db, "buildings");
        // Example membership filter if you store array of member UIDs:
        // const qy = query(colRef, where("members", "array-contains", uid));
        const qy = query(colRef, limit(100));
        const snap = await getDocs(qy);
        const list: Building[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));
        setBuildings(list);
      } catch (e) {
        console.error("Failed to load buildings:", e);
        Alert.alert("Error", "Could not load buildings.");
      } finally {
        setBuildingsLoading(false);
      }
    })();
  }, [uid]);

  // Resolve current building name for header
  const currentBuildingName = useMemo(() => {
    if (!buildingId) return null;
    const b = buildings.find((x) => x.id === buildingId);
    return b?.name || `#${buildingId.slice(0, 6)}`;
  }, [buildingId, buildings]);

  // ---- AsyncStorage helpers (shift) ----
  const shiftKey = (uid: string) => `currentShiftId:${uid}`;
  const saveShiftId = async (uid: string, id: string) => {
    try {
      await AsyncStorage.setItem(shiftKey(uid), id);
    } catch {}
  };
  const loadShiftId = async (uid: string) => {
    try {
      return await AsyncStorage.getItem(shiftKey(uid));
    } catch {
      return null;
    }
  };
  const clearShiftId = async (uid: string) => {
    try {
      await AsyncStorage.removeItem(shiftKey(uid));
    } catch {}
  };

  // Restore shift state
  useEffect(() => {
    (async () => {
      if (!uid) return;
      const stored = await loadShiftId(uid);
      if (stored) {
        setCurrentShiftId(stored);
        return;
      }
      const qy = query(
        collection(db, "users", uid, "shifts"),
        where("clockOut", "==", null),
        limit(1)
      );
      const snap = await getDocs(qy);
      if (!snap.empty) {
        const openId = snap.docs[0].id;
        setCurrentShiftId(openId);
        await saveShiftId(uid, openId);
      }
    })();
  }, [uid]);

  // 📥 Subscribe to latest report INSIDE the building (scoped)
  useEffect(() => {
    setLatestLoading(true);
    if (!buildingId) {
      setLatestReport(null);
      setLatestLoading(false);
      return;
    }
    const reportsRef = subcol("reports");
    if (!reportsRef) return;
    const qy = query(reportsRef, orderBy("createdAt", "desc"), limit(1));
    const unsub = onSnapshot(
      qy,
      (snap) => {
        const doc0 = snap.docs[0];
        if (doc0) {
          const data = doc0.data() as any;
          setLatestReport({
            id: doc0.id,
            title: data.title,
            description: data.description,
            createdAt: data.createdAt,
            createdByName: data.createdByName || data.createdBy || undefined,
            status: data.status,
          });
        } else {
          setLatestReport(null);
        }
        setLatestLoading(false);
      },
      () => setLatestLoading(false)
    );
    return () => unsub();
  }, [buildingId]);

  if (loading) {
    return (
      <View style={[s.container, s.center]}>
        <ActivityIndicator size="large" />
        <Text style={s.loadingText}>Loading…</Text>
      </View>
    );
  }

  // ⏱️ Clock In/Out (user-scoped; not tied to building)
  const handleClockIn = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      Alert.alert("Please Sign In.");
      return;
    }
    if (!currentShiftId) {
      const docRef = await addDoc(collection(db, "users", uid, "shifts"), {
        clockIn: serverTimestamp(),
        clockOut: null,
      });
      await updateDoc(doc(db, "users", uid), {
        onShift: true,
        openShiftId: docRef.id,
      });
      setCurrentShiftId(docRef.id);
      await saveShiftId(uid, docRef.id);
      Alert.alert("Clocked In!");
    } else {
      await updateDoc(doc(db, "users", uid, "shifts", currentShiftId), {
        clockOut: serverTimestamp(),
        shiftDuration: hhmmss,
      });
      await updateDoc(doc(db, "users", uid), {
        onShift: false,
        openShiftId: null,
      });
      setCurrentShiftId("");
      await clearShiftId(uid);
      Alert.alert("Clocked Out!");
    }
  };

  const trim = (s?: string, n: number = 64) => {
    if (!s) return "";
    return s.length > n ? s.slice(0, n - 1) + "…" : s;
  };

  const openVerifyCompleted = () => router.push("/home"); // keep

  const ActionButton = ({
    onPress,
    icon,
    label,
    subtitle,
    fullWidth = false,
    size = "md",
    style,
    disabled = false,
  }: {
    onPress: () => void;
    icon?: React.ReactNode;
    label: string;
    subtitle?: string;
    fullWidth?: boolean;
    size?: "md" | "lg" | "xl";
    style?: any;
    disabled?: boolean;
  }) => {
    const sizeStyle =
      size === "xl" ? s.btnXL : size === "lg" ? s.btnLG : s.btnMD;
    return (
      <TouchableOpacity
        onPress={onPress}
        style={[
          s.btnBase,
          sizeStyle,
          fullWidth && { width: "100%" },
          style,
          disabled && { opacity: 0.5 },
        ]}
        activeOpacity={disabled ? 1 : 0.9}
        disabled={disabled}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <View style={s.iconPill}>
          {icon ?? <Ionicons name="flash-outline" size={18} color="#fff" />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.btnText} numberOfLines={1}>
            {label}
          </Text>
          {subtitle ? (
            <Text style={s.btnSubText} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color="#fff" />
      </TouchableOpacity>
    );
  };

  const reportsSubtitle = latestLoading
    ? "Loading latest…"
    : latestReport
    ? `Latest: ${trim(
        latestReport.title || latestReport.description || "Untitled"
      )}`
    : "No reports yet";

  return (
    <View style={s.container}>
      {/* crossfade layers */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "#F8FAFC" }]} />
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "#0F172A", opacity: themeAnim },
        ]}
      />

      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={s.headerRow}>
          <View style={{ flexDirection: "row", alignItems: "baseline" }}>
            <Text style={s.headerTitle}>Home</Text>
            {!!role && <Text style={s.headerRole}> • {role}</Text>}
            {/* Current building pill */}
            <TouchableOpacity
              onPress={() => setBuildingPickerOpen(true)}
              style={s.buildingPill}
              activeOpacity={0.85}
            >
              <Ionicons
                name="business-outline"
                size={14}
                color={isDark ? "#E5E7EB" : "#111827"}
              />
              <Text style={s.buildingPillText} numberOfLines={1}>
                {currentBuildingName ?? "Select Building"}
              </Text>
              <Ionicons
                name="chevron-down"
                size={14}
                color={isDark ? "#E5E7EB" : "#111827"}
              />
            </TouchableOpacity>
          </View>

          {role === "supervisor" && (
            <TouchableOpacity
              onPress={() => router.push("/requestHistory")}
              style={s.headerIconBtn}
              activeOpacity={0.9}
              accessibilityLabel="Request History"
            >
              <MaterialIcons
                name="history"
                size={18}
                color={isDark ? "#E5E7EB" : "#111827"}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Thin on-shift pill UNDER the header */}
        {role === "employee" && !!currentShiftId && (
          <View style={s.shiftThinWrap}>
            <View style={s.shiftThinBar}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="time-outline" size={14} color="#ECFDF5" />
                <Text style={s.shiftThinText}>On shift • {hhmmss}</Text>
              </View>
            </View>
          </View>
        )}

        {/* If no building selected, nudge */}
        {!buildingId && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            <View
              style={{
                padding: 12,
                borderRadius: 10,
                backgroundColor: isDark ? "#1F2937" : "#FFF7ED",
                borderWidth: 1,
                borderColor: isDark ? "#334155" : "#FED7AA",
              }}
            >
              <Text
                style={{
                  fontWeight: "800",
                  color: isDark ? "#F3F4F6" : "#7C2D12",
                }}
              >
                Select a building to continue
              </Text>
              <Text
                style={{ marginTop: 4, color: isDark ? "#CBD5E1" : "#7C2D12" }}
              >
                All actions and lists are scoped to the chosen building.
              </Text>
            </View>
          </View>
        )}

        {/* Scrollable content */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Manager area */}
          {role === "supervisor" && (
            <>
              <View className="card" style={s.card}>
                <View style={s.cardHeader}>
                  <Text style={s.cardTitle}>Manager</Text>
                  <Text style={s.cardSubtitle}>
                    Quick actions to run the floor
                  </Text>
                </View>

                <View style={s.row}>
                  <View style={s.half}>
                    <ActionButton
                      onPress={() =>
                        buildingId
                          ? setTaskModal(true)
                          : Alert.alert("Pick a building first")
                      }
                      icon={
                        <FontAwesome5
                          name="project-diagram"
                          size={18}
                          color="#FFFFFF"
                        />
                      }
                      label="Add New Task"
                      size="lg"
                      style={s.equalHeight}
                      disabled={!buildingId}
                    />
                  </View>
                  <View style={s.half}>
                    <ActionButton
                      onPress={() =>
                        buildingId
                          ? router.push("/scheduler")
                          : Alert.alert("Pick a building first")
                      }
                      icon={
                        <Ionicons name="calendar" size={20} color="#FFFFFF" />
                      }
                      label="Scheduler"
                      size="lg"
                      style={s.equalHeight}
                      disabled={!buildingId}
                    />
                  </View>
                </View>

                <View style={s.twoThirdsSpacer} />

                <ActionButton
                  onPress={() =>
                    buildingId
                      ? setManagerViewReportModal(true)
                      : Alert.alert("Pick a building first")
                  }
                  icon={
                    <MaterialIcons
                      name="assessment"
                      size={20}
                      color="#FFFFFF"
                    />
                  }
                  label="View Reports"
                  subtitle={reportsSubtitle}
                  size="xl"
                  fullWidth
                  disabled={!buildingId}
                />
                <View style={{ height: 10 }} />
                <ActionButton
                  onPress={() =>
                    buildingId
                      ? router.push("/manageEmployees")
                      : Alert.alert("Pick a building first")
                  }
                  icon={<Ionicons name="people" size={20} color="#FFFFFF" />}
                  label="Manage Employees"
                  size="xl"
                  fullWidth
                  disabled={!buildingId}
                />
              </View>

              {/* Verify Completed Tasks Card */}
              <View
                style={[
                  s.verifyCard,
                  { backgroundColor: isDark ? "#1F2937" : "#F3F4F6" },
                ]}
              >
                <TouchableOpacity
                  onPress={() => {
                    if (!buildingId)
                      return Alert.alert("Pick a building first");
                    openVerifyCompleted();
                    setReviewModal(true);
                  }}
                  style={[
                    s.verifyBtn,
                    { backgroundColor: isDark ? "#2563EB" : "#3B82F6" },
                  ]}
                  activeOpacity={0.9}
                >
                  <Text style={s.verifyBtnText}>Verify Completed Tasks</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* Employee area */}
          {role === "employee" && (
            <View style={s.card}>
              <View style={s.cardHeader}>
                <Text style={s.cardTitle}>My Work</Text>
                <Text style={s.cardSubtitle}>
                  Clock in, check tasks, report issues
                </Text>
              </View>
              <ActionButton
                onPress={handleClockIn}
                icon={
                  <Ionicons
                    name={currentShiftId ? "exit-outline" : "log-in-outline"}
                    size={18}
                    color="#FFFFFF"
                  />
                }
                label={currentShiftId ? "Clock Out" : "Clock In"}
                size="lg"
                fullWidth
              />
              <ActionButton
                onPress={() =>
                  buildingId
                    ? setCurrentTaskModal(true)
                    : Alert.alert("Pick a building first")
                }
                icon={
                  <MaterialIcons name="assignment" size={18} color="#FFFFFF" />
                }
                label="View Current Tasks"
                size="lg"
                fullWidth
                disabled={!buildingId}
              />
              <ActionButton
                onPress={() =>
                  buildingId
                    ? setReportModal(true)
                    : Alert.alert("Pick a building first")
                }
                icon={
                  <MaterialIcons
                    name="report-problem"
                    size={18}
                    color="#FFFFFF"
                  />
                }
                label="Report Issue"
                size="lg"
                fullWidth
                disabled={!buildingId}
              />
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* Modals (open only when buildingId exists) */}
      {taskModal && buildingId && (
        <ProjectModal visible={taskModal} onClose={() => setTaskModal(false)} />
      )}
      {currentTaskModal && buildingId && (
        <CurrentTaskModal
          visible={currentTaskModal}
          onClose={() => setCurrentTaskModal(false)}
        />
      )}
      {reportModal && buildingId && (
        <ReportModal
          visible={reportModal}
          onClose={() => setReportModal(false)}
        />
      )}
      {managerViewReportModal && buildingId && (
        <ManagerViewReportsModal
          visible={managerViewReportModal}
          onClose={() => setManagerViewReportModal(false)}
        />
      )}
      {reviewModal && buildingId && (
        <TaskReviewModal
          visible={reviewModal}
          onClose={() => setReviewModal(false)}
        />
      )}

      {/* Building Picker Modal */}
      <Modal
        visible={buildingPickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setBuildingPickerOpen(false)}
      >
        <View style={s.modalBackdrop}>
          <View
            style={[
              s.modalCard,
              { backgroundColor: isDark ? "#111827" : "#FFFFFF" },
            ]}
          >
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Select Building</Text>
              <TouchableOpacity
                onPress={() => setBuildingPickerOpen(false)}
                style={s.closeBtn}
              >
                <Ionicons
                  name="close"
                  size={20}
                  color={isDark ? "#E5E7EB" : "#111827"}
                />
              </TouchableOpacity>
            </View>

            {buildingsLoading ? (
              <View style={[s.center, { paddingVertical: 16 }]}>
                <ActivityIndicator />
                <Text style={[s.cardSubtitle, { marginTop: 8 }]}>
                  Loading buildings…
                </Text>
              </View>
            ) : (
              <FlatList
                data={buildings}
                keyExtractor={(b) => b.id}
                ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
                renderItem={({ item }) => {
                  const selected = item.id === buildingId;
                  return (
                    <TouchableOpacity
                      onPress={() => {
                        setBuildingId(item.id);
                        setBuildingPickerOpen(false);
                      }}
                      style={[
                        s.buildingItem,
                        {
                          backgroundColor: selected
                            ? isDark
                              ? "#0B3B2F"
                              : "#ECFDF5"
                            : isDark
                            ? "#1F2937"
                            : "#F3F4F6",
                          borderColor: selected
                            ? isDark
                              ? "#10B981"
                              : "#34D399"
                            : isDark
                            ? "#111827"
                            : "#E5E7EB",
                        },
                      ]}
                      activeOpacity={0.9}
                    >
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            s.buildingName,
                            { color: isDark ? "#F3F4F6" : "#0F172A" },
                          ]}
                          numberOfLines={1}
                        >
                          {item.name || "Unnamed Building"}
                        </Text>
                        {!!item.address && (
                          <Text
                            style={[
                              s.buildingAddress,
                              { color: isDark ? "#93A4B3" : "#4B5563" },
                            ]}
                            numberOfLines={1}
                          >
                            {item.address}
                          </Text>
                        )}
                      </View>
                      {selected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color="#10B981"
                        />
                      )}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View style={s.center}>
                    <Text
                      style={[
                        s.cardSubtitle,
                        { alignSelf: "center", paddingVertical: 12 },
                      ]}
                    >
                      No buildings found.
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        setBuildingPickerOpen(false);
                        router.push("/addNewBuilding");
                      }}
                      style={[
                        s.btnBase,
                        {
                          backgroundColor: isDark ? "#2563EB" : "#3B82F6",
                          alignSelf: "center",
                          paddingHorizontal: 20,
                        },
                      ]}
                      activeOpacity={0.9}
                    >
                      <Text style={s.btnText}>Add New Building</Text>
                    </TouchableOpacity>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default HomePage;

/* ---------------- Styles ---------------- */
const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
    },
    center: { justifyContent: "center", alignItems: "center" },
    loadingText: { marginTop: 8, color: isDark ? "#E5E7EB" : "#111827" },

    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 4,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: "800",
      color: isDark ? "#F3F4F6" : "#111827",
      letterSpacing: 0.2,
    },
    headerRole: {
      fontSize: 16,
      fontWeight: "700",
      color: isDark ? "#93A4B3" : "#4B5563",
      marginLeft: 8,
    },

    buildingPill: {
      marginLeft: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: isDark ? "#111827" : "#E5E7EB",
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#1F2937" : "transparent",
      maxWidth: 180,
    },
    buildingPillText: {
      fontSize: 12,
      fontWeight: "800",
      color: isDark ? "#E5E7EB" : "#111827",
    },

    headerIconBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: isDark ? "#111827" : "#E5E7EB",
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#1F2937" : "transparent",
    },

    statusRow: { paddingHorizontal: 16, paddingBottom: 6 },
    statusChip: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 6,
      paddingHorizontal: 10,
      borderRadius: 999,
      borderWidth: 1,
      backgroundColor: isDark ? "#111827" : "#E5E7EB",
      borderColor: isDark ? "#1F2937" : "#D1D5DB",
    },
    statusOn: {
      backgroundColor: isDark ? "#0B3B2F" : "#ECFDF5",
      borderColor: isDark ? "#0B3B2F" : "#A7F3D0",
    },
    statusOff: {},
    dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    statusText: {
      fontWeight: "800",
      fontSize: 12,
      color: isDark ? "#E5E7EB" : "#111827",
      letterSpacing: 0.2,
    },

    scrollContainer: {
      paddingHorizontal: 12,
      paddingBottom: 24,
      paddingTop: 8,
      gap: 12,
    },

    card: {
      backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
      borderRadius: 16,
      padding: 14,
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 6,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#111827" : "transparent",
    },
    cardHeader: {
      marginBottom: 6,
    },
    cardTitle: {
      fontSize: 18,
      fontWeight: "900",
      color: isDark ? "#F3F4F6" : "#0F172A",
      letterSpacing: 0.2,
    },
    cardSubtitle: {
      marginTop: 2,
      fontSize: 12,
      fontWeight: "700",
      color: isDark ? "#94A3B8" : "#64748B",
    },

    row: {
      flexDirection: "row",
      gap: 10,
      marginTop: 6,
    },
    half: { flex: 1 },

    equalHeight: {
      height: 56,
      justifyContent: "center",
    },

    twoThirdsSpacer: {
      height: Math.max(16, Math.floor(SCREEN_H * 0.1)),
    },

    btnBase: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderRadius: 14,
      paddingHorizontal: 14,
      marginVertical: 6,
      backgroundColor: isDark ? "#2563EB" : "#1D4ED8",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
      elevation: 4,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#1E3A8A" : "transparent",
    },
    iconPill: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.16)",
    },
    btnMD: { paddingVertical: 12 },
    btnLG: { paddingVertical: 14 },
    btnXL: { paddingVertical: 18 },
    btnText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "900",
      letterSpacing: 0.2,
    },
    btnSubText: {
      color: "rgba(255,255,255,0.92)",
      fontSize: 12,
      marginTop: 1,
      fontWeight: "700",
      letterSpacing: 0.2,
    },

    verifyCard: {
      borderRadius: 16,
      padding: 16,
      marginTop: 12,
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 4,
    },
    verifyBtn: {
      backgroundColor: "#10B981",
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
    verifyBtnText: {
      color: "#fff",
      fontWeight: "800",
      fontSize: 16,
    },

    // Modal styles
    modalBackdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.35)",
      justifyContent: "flex-end",
    },
    modalCard: {
      padding: 14,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      maxHeight: SCREEN_H * 0.55,
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 8,
    },
    modalTitle: {
      fontSize: 16,
      fontWeight: "900",
      color: isDark ? "#F3F4F6" : "#0F172A",
    },
    closeBtn: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "#1F2937" : "#E5E7EB",
    },
    buildingItem: {
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderWidth: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    buildingName: {
      fontSize: 15,
      fontWeight: "900",
    },
    buildingAddress: {
      fontSize: 12,
      fontWeight: "700",
      opacity: 0.9,
      marginTop: 2,
    },
    shiftThinWrap: {
      paddingHorizontal: 16,
      marginTop: 6,
      marginBottom: 6,
    },
    shiftThinBar: {
      height: 30,
      borderRadius: 999,
      backgroundColor: "#10B981", // green
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 12,
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      borderWidth: 1,
      borderColor: "rgba(6,78,59,0.35)",
    },
    shiftThinText: {
      color: "#FFFFFF",
      fontWeight: "800",
      fontSize: 12,
      letterSpacing: 0.2,
    },
    shiftThinBtn: {
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 999,
      backgroundColor: "rgba(255,255,255,0.16)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.28)",
    },
    shiftThinBtnText: {
      color: "#FFFFFF",
      fontWeight: "800",
      fontSize: 12,
    },
  });

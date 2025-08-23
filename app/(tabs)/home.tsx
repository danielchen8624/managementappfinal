import React, { useEffect, useRef, useState } from "react";
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
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db, auth } from "../../firebaseConfig";
import ProjectModal from "../(components)/taskModal";
import ReportModal from "../(components)/reportModal";
import ManagerViewReportsModal from "../(components)/managerViewReportModal";
import CurrentTaskModal from "../(components)/currentTaskModal";
import { useUser } from "../UserContext";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { useTheme } from "../ThemeContext";
import { useShiftTimer } from "../(hooks)/secondsCounter";

const { height: SCREEN_H } = Dimensions.get("window");

type LatestReport = {
  id: string;
  title?: string;
  description?: string;
  createdAt?: any;
  createdByName?: string;
  status?: string;
};

function HomePage() {
  const [taskModal, setTaskModal] = useState(false);
  const [reportModal, setReportModal] = useState(false);
  const [currentTaskModal, setCurrentTaskModal] = useState(false);
  const [managerViewReportModal, setManagerViewReportModal] = useState(false);
  const [currentShiftId, setCurrentShiftId] = useState("");

  const [latestReport, setLatestReport] = useState<LatestReport | null>(null);
  const [latestLoading, setLatestLoading] = useState(true);

  const { role, loading } = useUser();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const s = getStyles(isDark);

  // theme crossfade like other screens
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

  // ---- AsyncStorage helpers ----
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

  // Subscribe to latest report (for the View Reports button subtitle)
  useEffect(() => {
    const qy = query(
      collection(db, "reports"),
      orderBy("createdAt", "desc"),
      limit(1)
    );
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
  }, []);

  if (loading) {
    return (
      <View style={[s.container, s.center]}>
        <ActivityIndicator size="large" />
        <Text style={s.loadingText}>Loading…</Text>
      </View>
    );
  }

  // Clock In/Out
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

  // Helper: trim text for preview
  const trim = (s?: string, n: number = 64) => {
    if (!s) return "";
    return s.length > n ? s.slice(0, n - 1) + "…" : s;
  };

  // Fancy action button (icon pill + chevron + subtitle)
  const ActionButton = ({
    onPress,
    icon,
    label,
    subtitle,
    fullWidth = false,
    size = "md",
    style,
  }: {
    onPress: () => void;
    icon?: React.ReactNode;
    label: string;
    subtitle?: string;
    fullWidth?: boolean;
    size?: "md" | "lg" | "xl";
    style?: any;
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
        ]}
        activeOpacity={0.9}
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
    ? `Latest: ${trim(latestReport.title || latestReport.description || "Untitled")}`
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
          </View>

          {/* Top-right: icon-only Request History (grey pill) */}
          {role === "manager" && (
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

        {/* Employee quick status */}
        {role === "employee" && (
          <View style={s.statusRow}>
            <View
              style={[
                s.statusChip,
                currentShiftId ? s.statusOn : s.statusOff,
              ]}
            >
              <View
                style={[
                  s.dot,
                  { backgroundColor: currentShiftId ? "#10B981" : "#9CA3AF" },
                ]}
              />
              <Text style={s.statusText}>
                {currentShiftId ? `On shift • ${hhmmss}` : "Not clocked in"}
              </Text>
            </View>
          </View>
        )}

        <View style={s.content}>
          {/* Manager block WITH grey backdrop/card */}
          {role === "manager" && (
            <View style={s.card}>
              <View style={s.cardHeader}>
                <Text style={s.cardTitle}>Manager</Text>
                <Text style={s.cardSubtitle}>
                  Quick actions to run the floor
                </Text>
              </View>

              {/* Row: Add New Task | Scheduler */}
              <View style={s.row}>
                <View style={s.half}>
                  <ActionButton
                    onPress={() => setTaskModal(true)}
                    icon={<FontAwesome5 name="project-diagram" size={18} color="#FFFFFF" />}
                    label="Add New Task"
                    size="lg"
                    style={s.equalHeight}
                  />
                </View>
                <View style={s.half}>
                  <ActionButton
                    onPress={() => router.push("/scheduler")}
                    icon={<Ionicons name="calendar" size={20} color="#FFFFFF" />}
                    label="Scheduler"
                    size="lg"
                    style={s.equalHeight}
                  />
                </View>
              </View>

              {/* Spacer to keep big buttons lower but tighter than before for cohesion */}
              <View style={s.twoThirdsSpacer} />

              {/* Big buttons: View Reports (with latest) then Manage Employees */}
              <ActionButton
                onPress={() => setManagerViewReportModal(true)}
                icon={<MaterialIcons name="assessment" size={20} color="#FFFFFF" />}
                label="View Reports"
                subtitle={reportsSubtitle}
                size="xl"
                fullWidth
              />
              <View style={{ height: 10 }} />
              <ActionButton
                onPress={() => router.push("/manageEmployees")}
                icon={<Ionicons name="people" size={20} color="#FFFFFF" />}
                label="Manage Employees"
                size="xl"
                fullWidth
              />
            </View>
          )}

          {/* Employee actions */}
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
                onPress={() => setCurrentTaskModal(true)}
                icon={<MaterialIcons name="assignment" size={18} color="#FFFFFF" />}
                label="View Current Task"
                size="lg"
                fullWidth
              />
              <ActionButton
                onPress={() => setReportModal(true)}
                icon={<MaterialIcons name="report-problem" size={18} color="#FFFFFF" />}
                label="Report Issue"
                size="lg"
                fullWidth
              />
            </View>
          )}
        </View>
      </SafeAreaView>

      {/* Modals */}
      {taskModal && (
        <ProjectModal visible={taskModal} onClose={() => setTaskModal(false)} />
      )}
      {currentTaskModal && (
        <CurrentTaskModal
          visible={currentTaskModal}
          onClose={() => setCurrentTaskModal(false)}
        />
      )}
      {reportModal && (
        <ReportModal
          visible={reportModal}
          onClose={() => setReportModal(false)}
        />
      )}
      {managerViewReportModal && (
        <ManagerViewReportsModal
          visible={managerViewReportModal}
          onClose={() => setManagerViewReportModal(false)}
        />
      )}
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

    // Icon-only request history (grey)
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
    statusOff: {
      // fallback uses defaults above
    },
    dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    statusText: {
      fontWeight: "800",
      fontSize: 12,
      color: isDark ? "#E5E7EB" : "#111827",
      letterSpacing: 0.2,
    },

    content: {
      flex: 1,
      paddingHorizontal: 12,
      paddingBottom: 12,
      paddingTop: 8,
      gap: 12,
    },

    // Card/backdrop (cohesive with other screens)
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
      height: Math.max(16, Math.floor(SCREEN_H * 0.10)), // slightly tighter to match other screens
    },

    // Action button
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
  });

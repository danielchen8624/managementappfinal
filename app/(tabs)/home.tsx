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
  Platform,
  Linking,
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
import TaskReviewModal from "../(components)/taskReviewModal";
import { useUser } from "../UserContext";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { useTheme } from "../ThemeContext";
import { useShiftTimer } from "../(hooks)/secondsCounter";
import { useBuilding } from "../BuildingContext";
import SecurityHourlyNudge from "../(components)/securityHourlyNudge";
import FeedbackModal from "../(components)/feedbackModal"; 

const { height: SCREEN_H } = Dimensions.get("window");

const Pal = {
  light: {
    bg: "#F6F8FB",
    surface: "#FFFFFF",
    subtle: "#F0F2F6",
    text: "#0F172A",
    textMuted: "#4B5563",
    outline: "#E6EAF0",
    outlineBold: "#D4DAE3",
    primary: "#1F4ED8",
    primaryAlt: "#183EA9",
    success: "#0F9B6E",
    warning: "#B45309",
    danger: "#DC2626",
    accent: "#0EA5E9",
  },
  dark: {
    bg: "#0A0F1A",
    surface: "#101826",
    subtle: "#0F172A",
    text: "#E5E7EB",
    textMuted: "#9CA3AF",
    outline: "#1E293B",
    outlineBold: "#334155",
    primary: "#2563EB",
    primaryAlt: "#1E3A8A",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#F87171",
    accent: "#38BDF8",
  },
};

function Hairline({ style }: { style?: any }) {
  return <View style={[{ height: StyleSheet.hairlineWidth }, style]} />;
}

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
  const [managerReportsOpen, setManagerReportsOpen] = useState(false);

  const [latestReport, setLatestReport] = useState<LatestReport | null>(null);
  const [latestLoading, setLatestLoading] = useState(true);

  const { role, loading } = useUser();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const s = getStyles(isDark);
  const C = isDark ? Pal.dark : Pal.light;
  const neutralIcon = isDark ? "#A3AED0" : "#64748B";

  // NEW: feedback modal open state (Home controls open/close only)
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // Theme crossfade
  const themeAnim = useRef(new Animated.Value(isDark ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(themeAnim, {
      toValue: isDark ? 1 : 0,
      duration: 240,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [isDark, themeAnim]);

  const uid = auth.currentUser?.uid;
  const { hhmmss } = useShiftTimer(uid);

  // Building context
  const { buildingId, setBuildingId } = useBuilding();

  // Building-scoped helpers
  const subcol = (sub: "tasks" | "reports" | "messages") =>
    buildingId ? collection(db, "buildings", buildingId, sub) : null;

  // Building picker state
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingsLoading, setBuildingsLoading] = useState(false);

  // Load buildings
  useEffect(() => {
    (async () => {
      setBuildingsLoading(true);
      try {
        const colRef = collection(db, "buildings");
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

  // Current building name (truncate at 7)
  const currentBuildingName = useMemo(() => {
    if (!buildingId) return null;
    const b = buildings.find((x) => x.id === buildingId);
    const name = b?.name || `#${buildingId.slice(0, 6)}`;
    return name.length > 7 ? name.slice(0, 7) + "…" : name;
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

  // Subscribe to latest report (scoped)
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

  const isWorker = role === "employee" || role === "security";

  // ⏱️ Clock In/Out
  const handleClockIn = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      Alert.alert("Please sign in.");
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

  /** -----------------------------------------------------------
   *  Primary ActionButton (animated + crisp elevation)
   *  -----------------------------------------------------------
   */
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
    const scale = useRef(new Animated.Value(1)).current;

    const pressIn = () =>
      Animated.spring(scale, {
        toValue: 0.985,
        useNativeDriver: true,
        friction: 7,
        tension: 120,
      }).start();

    const pressOut = () =>
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
        tension: 160,
      }).start();

    const sizeStyle =
      size === "xl" ? s.btnXL : size === "lg" ? s.btnLG : s.btnMD;

    return (
      <Animated.View style={{ transform: [{ scale }] }}>
        <TouchableOpacity
          onPress={onPress}
          onPressIn={disabled ? undefined : pressIn}
          onPressOut={disabled ? undefined : pressOut}
          style={[
            s.btnBase,
            sizeStyle,
            fullWidth && { width: "100%" },
            style,
            disabled && s.btnDisabled,
          ]}
          activeOpacity={disabled ? 1 : 0.88}
          disabled={disabled}
        >
          <View style={s.iconPill}>
            {icon ?? <Ionicons name="flash-outline" size={18} color="#fff" />}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
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
      </Animated.View>
    );
  };

  /** -----------------------------------------------------------
   *  Neutral SurfaceButton (secondary actions)
   *  -----------------------------------------------------------
   */
  const SurfaceButton = ({
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
          s.surfaceBtnBase,
          sizeStyle,
          fullWidth && { width: "100%" },
          style,
          disabled && s.surfaceBtnDisabled,
        ]}
        activeOpacity={disabled ? 1 : 0.9}
        disabled={disabled}
      >
        <View style={s.surfaceIconPill}>
          {icon ?? (
            <Ionicons
              name="ellipse-outline"
              size={16}
              color={isDark ? "#A3AED0" : "#64748B"}
            />
          )}
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.surfaceBtnText} numberOfLines={1}>
            {label}
          </Text>
          {subtitle ? (
            <Text style={s.surfaceBtnSubText} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <Ionicons
          name="chevron-forward"
          size={18}
          color={isDark ? "#A3AED0" : "#64748B"}
        />
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

  const [buildingPickerOpen, setBuildingPickerOpen] = useState(false);

  // --- Rate Us Card (Android disabled) ---
  const RateUsCard = () => {
    const [rating, setRating] = useState<number>(0);

    const storeUrl = "https://apps.apple.com/app/id6752588044?action=write-review";

    const canRate = Platform.OS === "ios";

    const submitRating = async (stars: number) => {
      if (!canRate) return; // Android disabled (no-op)
      try {
        setRating(stars);
        const user = auth.currentUser;
        await addDoc(collection(db, "reviews"), {
          type: "rating",
          stars,
          uid: user?.uid ?? null,
          role: role ?? null,
          createdAt: serverTimestamp(),
        });
        Linking.openURL(storeUrl);
      } catch (e) {
        Alert.alert("Error", "Could not record rating. Please try again.");
      }
    };

    return (
      <View style={s.rateCard}>
        <View style={s.cardHeader}>
          <View style={s.cardHeaderRow}>
            <Ionicons name="star-outline" size={18} color={C.accent} />
            <Text style={s.cardTitle}>Rate Us</Text>
          </View>
          <Text style={s.cardSubtitle}>Your feedback helps us improve</Text>
        </View>

        {/* Star strip — visible on Android but non-interactive */}
        <View
          style={s.starBox}
          pointerEvents={canRate ? "auto" : "none"} // disable interaction on Android
        >
          <View style={s.starRow}>
            {[1, 2, 3, 4, 5].map((i) => (
              <TouchableOpacity
                key={i}
                onPress={() => submitRating(i)}
                style={s.starTap}
                activeOpacity={0.8}
                disabled={!canRate}
              >
                <Ionicons
                  name={i <= rating ? "star" : "star-outline"}
                  size={24}
                  color={
                    i <= rating
                      ? isDark
                        ? Pal.dark.primary
                        : Pal.light.primary
                      : isDark
                      ? "#A3AED0"
                      : "#94A3B8"
                  }
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Review/Suggestion link — opens modal (Home controls visibility only) */}
        <TouchableOpacity
          onPress={() => setFeedbackOpen(true)}
          activeOpacity={0.85}
        >
          <Text style={s.reviewLink}>Leave a review or suggestion</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={s.container}>
      {/* crossfade layers */}
      <View
        style={[StyleSheet.absoluteFill, { backgroundColor: Pal.light.bg }]}
      />
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: Pal.dark.bg, opacity: themeAnim },
        ]}
      />

      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={s.headerRow}>
          <View style={{ flexDirection: "row", alignItems: "baseline" }}>
            <Text style={s.headerTitle}>Home</Text>
            {!!role && <Text style={s.headerRole}> • {role}</Text>}

            {/* Building pill */}
            <TouchableOpacity
              onPress={() => setBuildingPickerOpen(true)}
              style={s.buildingPill}
              activeOpacity={0.95}
            >
              <Ionicons name="business-outline" size={14} color={C.text} />
              <Text style={s.buildingPillText} numberOfLines={1}>
                {currentBuildingName ?? "Select Building"}
              </Text>
              <Ionicons name="chevron-down" size={14} color={C.text} />
            </TouchableOpacity>
          </View>

          {/* RIGHT SIDE: theme toggle */}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              onPress={toggleTheme}
              style={s.headerIconBtn}
              activeOpacity={0.88}
              accessibilityLabel="Toggle theme"
            >
              <Ionicons
                name={isDark ? "sunny-outline" : "moon-outline"}
                size={18}
                color={isDark ? "#FDE68A" : C.text}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Security top bar — next run / next shift */}
        {role === "security" && (
          <View style={{ paddingHorizontal: 16, marginBottom: 6 }}>
            <View style={s.securityNudgeCard}>
              <SecurityHourlyNudge />
            </View>
          </View>
        )}

        {/* On-shift pill */}
        {isWorker && !!currentShiftId && (
          <View style={s.shiftThinWrap}>
            <View style={s.shiftThinBar}>
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
              >
                <Ionicons name="time-outline" size={14} color="#ECFDF5" />
                <Text style={s.shiftThinText}>On shift • {hhmmss}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Nudge to select building */}
        {!buildingId && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
            <View style={s.inlineBanner}>
              <Text style={s.inlineBannerTitle}>
                Select a building to continue
              </Text>
              <Text style={s.inlineBannerText}>
                All actions and lists are scoped to the chosen building.
              </Text>
            </View>
          </View>
        )}

        {/* Content */}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={s.scrollContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* SUPERVISOR */}
          {role === "supervisor" && (
            <>
              {/* --- TOP CARD (unchanged design) --- */}
              <View style={s.card}>
                <View style={s.cardHeader}>
                  <View style={s.cardHeaderRow}>
                    <Ionicons
                      name="briefcase-outline"
                      size={18}
                      color={C.accent}
                    />
                    <Text style={s.cardTitle}>Supervisor</Text>
                  </View>
                  <Text style={s.cardSubtitle}>Run operations efficiently</Text>
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

                <Hairline style={s.hairline} />

                {/* SWAPPED IN: Security Checklist (moved up from below) */}
                <ActionButton
                  onPress={() =>
                    buildingId
                      ? router.push("/securityChecklistCreator")
                      : Alert.alert("Pick a building first")
                  }
                  icon={
                    <Ionicons
                      name="shield-checkmark"
                      size={20}
                      color="#FFFFFF"
                    />
                  }
                  label="Security Checklist"
                  subtitle="Create or edit building checklists"
                  size="xl"
                  fullWidth
                  disabled={!buildingId}
                />

                {/* Secondary action as neutral surface */}
                <SurfaceButton
                  onPress={() =>
                    buildingId
                      ? router.push("/manageEmployees")
                      : Alert.alert("Pick a building first")
                  }
                  icon={
                    <Ionicons name="people" size={20} color={neutralIcon} />
                  }
                  label="Manage Employees"
                  size="xl"
                  fullWidth
                  disabled={!buildingId}
                />
              </View>

              {/* --- NEW GROUPED CARD: Reports & Verifications --- */}
              <View style={s.groupCard}>
                <View style={s.groupHeader}>
                  <View style={s.cardHeaderRow}>
                    <Ionicons
                      name="checkmark-done-outline"
                      size={18}
                      color={C.accent}
                    />
                    <Text style={s.cardTitle}>Reviews & Audits</Text>
                  </View>
                  <Text style={s.cardSubtitle}>
                    Verify work, review reports, and monitor security checks
                  </Text>
                </View>

                {/* View Reports (after swap) */}
                <SurfaceButton
                  onPress={() =>
                    buildingId
                      ? setManagerViewReportModal(true)
                      : Alert.alert("Pick a building first")
                  }
                  icon={
                    <MaterialIcons
                      name="assessment"
                      size={18}
                      color={neutralIcon}
                    />
                  }
                  label="View Reports"
                  subtitle={reportsSubtitle}
                  size="xl"
                  fullWidth
                  disabled={!buildingId}
                />

                {/* Verify Completed Tasks */}
                <SurfaceButton
                  onPress={() => {
                    if (!buildingId)
                      return Alert.alert("Pick a building first");
                    openVerifyCompleted();
                    setReviewModal(true);
                  }}
                  icon={
                    <MaterialIcons
                      name="task-alt"
                      size={18}
                      color={neutralIcon}
                    />
                  }
                  label="Verify Completed Tasks"
                  subtitle="Approve or return recent completions"
                  size="xl"
                  fullWidth
                  disabled={!buildingId}
                />

                {/* View Latest Security Checks */}
                <SurfaceButton
                  onPress={() =>
                    buildingId
                      ? router.push("/supervisorViewSecurity")
                      : Alert.alert("Pick a building first")
                  }
                  icon={
                    <Ionicons
                      name="shield-outline"
                      size={18}
                      color={neutralIcon}
                    />
                  }
                  label="View Latest Security Checks"
                  subtitle="Recent runs"
                  size="xl"
                  fullWidth
                  disabled={!buildingId}
                />
              </View>
            </>
          )}

          {/* MANAGER (read-only) — refined layout */}
          {role === "manager" && (
            <View style={s.card}>
              <View style={s.cardHeader}>
                <View style={s.cardHeaderRow}>
                  <Ionicons
                    name="analytics-outline"
                    size={18}
                    color={C.accent}
                  />
                  <Text style={s.cardTitle}>Manager Dashboard</Text>
                </View>
                <Text style={s.cardSubtitle}>
                  Read-only overview & activity log
                </Text>
              </View>

              {/* Primary focus */}
              <ActionButton
                onPress={() =>
                  buildingId
                    ? router.push("/manager_report")
                    : Alert.alert("Pick a building first")
                }
                icon={
                  <MaterialIcons name="assessment" size={20} color="#FFFFFF" />
                }
                label="All Reports"
                size="xl"
                fullWidth
                disabled={!buildingId}
              />
              <ActionButton
                onPress={() =>
                  buildingId
                    ? router.push("/manager_activityLog")
                    : Alert.alert("Pick a building first")
                }
                icon={
                  <MaterialIcons
                    name="receipt-long"
                    size={18}
                    color="#FFFFFF"
                  />
                }
                label="Activity Log (All Events)"
                subtitle="Tasks • Schedules • Reports • Security"
                size="xl"
                fullWidth
                disabled={!buildingId}
                style={{ marginTop: 6 }}
              />

              <Hairline style={s.hairline} />

              {/* Secondary tools — two-column grid */}
              <View style={s.gridRow}>
                <View style={s.gridCol}>
                  <SurfaceButton
                    onPress={() =>
                      buildingId
                        ? router.push("/scheduledTasks")
                        : Alert.alert("Pick a building first")
                    }
                    icon={
                      <MaterialIcons
                        name="assignment"
                        size={18}
                        color={neutralIcon}
                      />
                    }
                    label="Scheduled Tasks"
                    size="lg"
                    fullWidth
                    disabled={!buildingId}
                  />
                </View>
                <View style={s.gridCol}>
                  <SurfaceButton
                    onPress={() =>
                      buildingId
                        ? router.push("/supervisorViewSecurity")
                        : Alert.alert("Pick a building first")
                    }
                    icon={
                      <Ionicons
                        name="shield-checkmark"
                        size={18}
                        color={neutralIcon}
                      />
                    }
                    label="Security Runs"
                    size="lg"
                    fullWidth
                    disabled={!buildingId}
                  />
                </View>
              </View>

              <View style={s.gridRow}>
                <View style={s.gridCol}>
                  <SurfaceButton
                    onPress={() =>
                      buildingId
                        ? router.push("/manager_scheduler")
                        : Alert.alert("Pick a building first")
                    }
                    icon={
                      <Ionicons name="calendar" size={20} color={neutralIcon} />
                    }
                    label="Scheduler"
                    size="lg"
                    fullWidth
                    disabled={!buildingId}
                  />
                </View>
                <View style={s.gridCol}>
                  <SurfaceButton
                    onPress={() =>
                      buildingId
                        ? router.push("/manager_securityChecklistCreator")
                        : Alert.alert("Pick a building first")
                    }
                    icon={
                      <Ionicons
                        name="shield-outline"
                        size={18}
                        color={neutralIcon}
                      />
                    }
                    label="Security Checklist"
                    size="lg"
                    fullWidth
                    disabled={!buildingId}
                  />
                </View>
              </View>

              <View style={s.gridRow}>
                <View style={s.gridCol}>
                  <SurfaceButton
                    onPress={() =>
                      buildingId
                        ? router.push("/manageEmployees")
                        : Alert.alert("Pick a building first")
                    }
                    icon={
                      <Ionicons name="people" size={20} color={neutralIcon} />
                    }
                    label="View Employees"
                    size="lg"
                    fullWidth
                    disabled={!buildingId}
                  />
                </View>
              </View>
            </View>
          )}

          {/* EMPLOYEE */}
          {role === "employee" && (
            <View style={s.card}>
              <View style={s.cardHeader}>
                <View style={s.cardHeaderRow}>
                  <Ionicons
                    name="clipboard-outline"
                    size={18}
                    color={C.accent}
                  />
                  <Text style={s.cardTitle}>My Work</Text>
                </View>
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
              <SurfaceButton
                onPress={() =>
                  buildingId
                    ? setReportModal(true)
                    : Alert.alert("Pick a building first")
                }
                icon={
                  <MaterialIcons
                    name="report-problem"
                    size={18}
                    color={neutralIcon}
                  />
                }
                label="Report Issue"
                size="lg"
                fullWidth
                disabled={!buildingId}
              />
            </View>
          )}

          {/* SECURITY */}
          {role === "security" && (
            <View style={s.card}>
              <View style={s.cardHeader}>
                <View style={s.cardHeaderRow}>
                  <Ionicons name="shield-outline" size={18} color={C.accent} />
                  <Text style={s.cardTitle}>Security</Text>
                </View>
                <Text style={s.cardSubtitle}>
                  Clock in, open checklist, report issues
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
                    ? router.push("/securityChecklist")
                    : Alert.alert("Pick a building first")
                }
                icon={
                  <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
                }
                label="Open Checklist"
                size="lg"
                fullWidth
                disabled={!buildingId}
              />
              <SurfaceButton
                onPress={() =>
                  buildingId
                    ? setReportModal(true)
                    : Alert.alert("Pick a building first")
                }
                icon={
                  <MaterialIcons
                    name="report-problem"
                    size={18}
                    color={neutralIcon}
                  />
                }
                label="Report Issue"
                size="lg"
                fullWidth
                disabled={!buildingId}
              />
            </View>
          )}

          {/* Always at the very bottom, for all roles */}
          <RateUsCard />
        </ScrollView>
      </SafeAreaView>

      {/* Modals */}
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

      {/* NEW: Feedback modal hosted by Home, only controls visibility */}
      <FeedbackModal visible={feedbackOpen} onClose={() => setFeedbackOpen(false)} />

      {/* Building Picker */}
      <Modal
        visible={buildingPickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setBuildingPickerOpen(false)}
      >
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Select Building</Text>
              <TouchableOpacity
                onPress={() => setBuildingPickerOpen(false)}
                style={s.closeBtn}
              >
                <Ionicons name="close" size={20} color={C.text} />
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
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
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
                        selected && s.buildingItemSelected,
                      ]}
                      activeOpacity={0.92}
                    >
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={s.buildingName} numberOfLines={1}>
                          {item.name || "Unnamed Building"}
                        </Text>
                        {!!item.address && (
                          <Text style={s.buildingAddress} numberOfLines={1}>
                            {item.address}
                          </Text>
                        )}
                      </View>
                      {selected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={20}
                          color={C.success}
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
                        { alignSelf: "center", paddingHorizontal: 20 },
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
const getStyles = (isDark: boolean) => {
  const C = isDark ? Pal.dark : Pal.light;
  const shadowBase =
    Platform.OS === "ios"
      ? {
          shadowColor: "#000",
          shadowOpacity: isDark ? 0.18 : 0.08,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 8 },
        }
      : { elevation: 5 };

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    center: { justifyContent: "center", alignItems: "center" },
    loadingText: { marginTop: 8, color: C.textMuted, fontWeight: "700" },

    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 8,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: "900",
      color: C.text,
      letterSpacing: 0.2,
    },
    headerRole: {
      fontSize: 11,
      fontWeight: "800",
      color: C.textMuted,
      marginLeft: 8,
      textTransform: "capitalize",
    },

    buildingPill: {
      marginLeft: 10,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: C.subtle,
      borderWidth: 1,
      borderColor: C.outline,
      maxWidth: 260,
    },
    buildingPillText: { fontSize: 12, fontWeight: "900", color: C.text },

    headerIconBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: C.subtle,
      borderWidth: 1,
      borderColor: C.outline,
      ...(Platform.OS === "ios"
        ? {
            shadowColor: "#000",
            shadowOpacity: 0.04,
            shadowOffset: { width: 0, height: 2 },
            shadowRadius: 3,
          }
        : { elevation: 2 }),
    },

    // SecurityHourlyNudge wrapper
    securityNudgeCard: {
      borderRadius: 12,
      backgroundColor: isDark ? "#0F172A" : "#F0F7FF",
      borderWidth: 1,
      borderColor: isDark ? C.outlineBold : "#C7DBFF",
      paddingVertical: 10,
      paddingHorizontal: 12,
      ...(Platform.OS === "ios"
        ? {
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 3 },
          }
        : { elevation: 2 }),
    },

    inlineBanner: {
      padding: 12,
      borderRadius: 12,
      backgroundColor: isDark ? "#132235" : "#FDF5E6",
      borderWidth: 1,
      borderColor: isDark ? C.outlineBold : "#F2D9A6",
    },
    inlineBannerTitle: {
      fontWeight: "900",
      color: isDark ? C.text : "#7C2D12",
    },
    inlineBannerText: {
      marginTop: 4,
      color: isDark ? C.textMuted : "#7C2D12",
      fontWeight: "700",
    },

    scrollContainer: {
      paddingHorizontal: 16,
      paddingBottom: 28,
      paddingTop: 10,
      gap: 14,
    },

    card: {
      backgroundColor: C.surface,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: C.outline,
      ...shadowBase,
    },
    cardHeader: { marginBottom: 8 },
    cardHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 2 },
    cardTitle: { fontSize: 18, fontWeight: "900", color: C.text, letterSpacing: 0.2 },
    cardSubtitle: { marginTop: 2, fontSize: 12, fontWeight: "700", color: C.textMuted },

    hairline: { backgroundColor: C.outline, marginVertical: 10, opacity: 0.9, height: StyleSheet.hairlineWidth },

    row: { flexDirection: "row", gap: 10, marginTop: 6 },
    half: { flex: 1 },
    equalHeight: { height: 56, justifyContent: "center" },

    // Primary button
    btnBase: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderRadius: 12,
      paddingHorizontal: 14,
      marginVertical: 6,
      backgroundColor: isDark ? Pal.dark.primary : Pal.light.primary,
      borderWidth: 1,
      borderColor: isDark ? Pal.dark.primaryAlt : Pal.light.primaryAlt,
      minHeight: 56,
      ...(Platform.OS === "ios"
        ? {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: isDark ? 0.22 : 0.1,
            shadowRadius: 8,
          }
        : { elevation: 4 }),
    },
    btnDisabled: { backgroundColor: isDark ? "#0F2138" : "#CBD5E1", borderColor: isDark ? "#1E3A8A" : "#94A3B8" },
    iconPill: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(255,255,255,0.18)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.24)",
    },
    btnMD: { paddingVertical: 12 },
    btnLG: { paddingVertical: 14 },
    btnXL: { paddingVertical: 18 },
    btnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "900", letterSpacing: 0.2 },
    btnSubText: { color: "rgba(255,255,255,0.92)", fontSize: 12, marginTop: 1, fontWeight: "700", letterSpacing: 0.2 },

    // Neutral button (secondary)
    surfaceBtnBase: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderRadius: 12,
      paddingHorizontal: 14,
      marginVertical: 6,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.outline,
      minHeight: 56,
      ...(Platform.OS === "ios"
        ? {
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 4,
          }
        : { elevation: 2 }),
    },
    surfaceBtnDisabled: { opacity: 0.6 },
    surfaceIconPill: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "#0F172A" : "#F3F4F6",
      borderWidth: 1,
      borderColor: isDark ? "#1F2937" : "#E5E7EB",
    },
    surfaceBtnText: { color: C.text, fontSize: 15, fontWeight: "800", letterSpacing: 0.2 },
    surfaceBtnSubText: { color: C.textMuted, fontSize: 12, marginTop: 2, fontWeight: "700", letterSpacing: 0.2 },

    // New grouped card styles
    groupCard: {
      backgroundColor: C.surface,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: C.outline,
      ...shadowBase,
    },
    groupHeader: { marginBottom: 6 },

    // Shift status
    shiftThinWrap: { paddingHorizontal: 16, marginTop: 6, marginBottom: 6 },
    shiftThinBar: {
      height: 30,
      borderRadius: 999,
      backgroundColor: isDark ? Pal.dark.success : Pal.light.success,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: isDark ? "rgba(6,78,59,0.5)" : "rgba(16,185,129,0.45)",
      ...(Platform.OS === "ios"
        ? {
            shadowColor: "#000",
            shadowOpacity: 0.1,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 4 },
          }
        : { elevation: 3 }),
    },
    shiftThinText: { color: "#FFFFFF", fontWeight: "900", fontSize: 12, letterSpacing: 0.2 },

    // Modal
    modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", justifyContent: "flex-end" },
    modalCard: {
      padding: 14,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      maxHeight: SCREEN_H * 0.6,
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.outline,
      ...shadowBase,
    },
    modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
    modalTitle: { fontSize: 16, fontWeight: "900", color: C.text },
    closeBtn: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.subtle,
      borderWidth: 1,
      borderColor: C.outline,
    },
    buildingItem: {
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderColor: C.outline,
      backgroundColor: C.surface,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      ...(Platform.OS === "ios"
        ? {
            shadowColor: "#000",
            shadowOpacity: 0.06,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 3 },
          }
        : { elevation: 2 }),
    },
    buildingItemSelected: {
      borderColor: isDark ? Pal.dark.success : Pal.light.success,
      backgroundColor: isDark ? "#0B3B2F" : "#ECFDF5",
    },
    buildingName: { fontSize: 15, fontWeight: "900", color: C.text },
    buildingAddress: { fontSize: 12, fontWeight: "700", opacity: 0.9, marginTop: 2, color: C.textMuted },

    gridRow: { flexDirection: "row", gap: 10, marginTop: 6 },
    gridCol: { flex: 1 },

    // Rate Us styles
    rateCard: {
      backgroundColor: C.surface,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1,
      borderColor: C.outline,
      marginTop: 6,
      ...(Platform.OS === "ios"
        ? {
            shadowColor: "#000",
            shadowOpacity: isDark ? 0.18 : 0.08,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 8 },
          }
        : { elevation: 5 }),
    },
    starBox: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.outline,
      backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
      paddingVertical: 12,
      paddingHorizontal: 14,
      marginTop: 6,
      marginBottom: 8,
    },
    starRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    starTap: { padding: 2 },
    reviewLink: {
      textAlign: "center",
      textDecorationLine: "underline",
      color: C.textMuted,
      fontSize: 12,
      fontWeight: "800",
    },
  });
};

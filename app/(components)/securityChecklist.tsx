import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  FlatList,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db } from "../../firebaseConfig";
import { useTheme } from "../ThemeContext";
import { useBuilding } from "../BuildingContext";

type ChecklistItem = {
  id: string;
  place: string;
  description?: string;
  order: number;
  active?: boolean;
};

/* ---------- helpers ---------- */
const pad2 = (n: number) => String(n).padStart(2, "0");

const ymd = (d = new Date()) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

// Hour bucket label like "10:00" or "22:00"
const hourBucket = (d = new Date()) => `${pad2(d.getHours())}:00`;

// Local storage key now includes the hour bucket so it resets each hour
const progressKey = (buildingId?: string | null, d = new Date()) =>
  buildingId ? `secChecklistProgress:${buildingId}:${ymd(d)}-${hourBucket(d)}` : "";

function SecurityChecklist() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const s = getStyles(isDark);

  const { buildingId } = useBuilding();

  // data
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ChecklistItem[]>([]);

  // UI state for checks & filters
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [onlyUnchecked, setOnlyUnchecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // keep a live "time bucket" so we know when the hour changes
  const [now, setNow] = useState(() => new Date());
  const [hourKey, setHourKey] = useState(() => `${ymd(now)}-${hourBucket(now)}`);

  // tick every ~30s (lightweight) to catch hour changes
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(id);
  }, []);

  // whenever "now" crosses into a new hour bucket, update hourKey
  useEffect(() => {
    const nextKey = `${ymd(now)}-${hourBucket(now)}`;
    if (nextKey !== hourKey) setHourKey(nextKey);
  }, [now, hourKey]);

  // subtle header fade
  const hdrAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(hdrAnim, {
      toValue: 1,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  // ─────────────────────────────
  // 1) Load items (live) from scheduler
  // ─────────────────────────────
  useEffect(() => {
    setItems([]);
    setChecked({});
    setLoading(true);

    if (!buildingId) {
      setLoading(false);
      return;
    }

    const qy = query(
      collection(db, "buildings", buildingId, "security_checklist_scheduler"),
      orderBy("order")
    );

    const unsub = onSnapshot(
      qy,
      (snap) => {
        const arr: ChecklistItem[] = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            place: typeof data.place === "string" ? data.place : "Untitled",
            description:
              typeof data.description === "string" ? data.description : "",
            order: typeof data.order === "number" ? data.order : 999,
            active: data.active !== false,
          };
        });

        setItems(arr);
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [buildingId]);

  // ─────────────────────────────
  // 2) Hydrate check state from AsyncStorage whenever building **or hour** changes
  // ─────────────────────────────
  useEffect(() => {
    (async () => {
      if (!buildingId) return;
      try {
        const raw = await AsyncStorage.getItem(progressKey(buildingId, now));
        if (raw) {
          const saved = JSON.parse(raw) as Record<string, boolean>;
          setChecked(saved || {});
        } else {
          // New hour (no saved state) → reset to all unchecked
          setChecked({});
        }
      } catch (e) {
        console.warn("Failed loading checklist progress:", e);
        setChecked({});
      }
    })();
    // depend on hourKey so we reload when the hour flips
  }, [buildingId, hourKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Merge: when items change, ensure we keep any existing check states
  useEffect(() => {
    if (!items.length) return;
    setChecked((prev) => {
      const next: Record<string, boolean> = {};
      items.forEach((it) => {
        next[it.id] = prev[it.id] ?? false;
      });
      return next;
    });
  }, [items]);

  // ─────────────────────────────
  // 3) Persist check state (debounced) to AsyncStorage, scoped per-hour
  // ─────────────────────────────
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!buildingId) return;
    if (!items.length) return;

    // only persist keys that exist in the current list
    const trimmed: Record<string, boolean> = {};
    items.forEach((it) => (trimmed[it.id] = !!checked[it.id]));

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await AsyncStorage.setItem(
          progressKey(buildingId, now),
          JSON.stringify(trimmed)
        );
      } catch (e) {
        console.warn("Failed saving checklist progress:", e);
      }
    }, 200); // small debounce
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [checked, items, buildingId, hourKey]); // include hourKey so we save under the right bucket

  // derived
  const visibleItems = useMemo(
    () => items.filter((it) => (onlyUnchecked ? !checked[it.id] : true)),
    [items, onlyUnchecked, checked]
  );

  const total = items.length;
  const done = useMemo(
    () => items.reduce((acc, it) => acc + (checked[it.id] ? 1 : 0), 0),
    [items, checked]
  );

  const disabledUI = !buildingId || loading || total === 0;

  // actions
  const toggle = (id: string) =>
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));

  // ─────────────────────────────
  // 4) Submit run — Firestore docId now includes hour bucket (YYYY-MM-DD-HH:00)
  // ─────────────────────────────
  const submitRun = async () => {
    if (!buildingId) {
      Alert.alert("Select a building first.");
      return;
    }
    if (total === 0) {
      Alert.alert(
        "No checklist items",
        "Add items in the Security Checklist Creator first."
      );
      return;
    }

    const when = new Date(); // current time / window
    const today = ymd(when);
    const bucket = hourBucket(when); // e.g. "10:00" or "22:00"
    const runId = `${today}-${bucket}`;

    try {
      setSubmitting(true);

      const runRef = doc(
        db,
        "buildings",
        buildingId,
        "security_checklist_runs",
        runId
      );

      await setDoc(
        runRef,
        {
          buildingId,
          runId,               // "YYYY-MM-DD-HH:00"
          dateYYYYMMDD: today,
          hourHHmm: bucket,
          totalItems: total,
          checkedCount: done,
          uncheckedCount: total - done,
          submittedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Store each item state under subcollection "items"
      const writes = items.map((it, idx) =>
        setDoc(
          doc(runRef, "items", it.id),
          {
            itemId: it.id,
            place: it.place,
            description: it.description ?? "",
            order: idx,
            checked: !!checked[it.id],
            checkedAt: checked[it.id] ? serverTimestamp() : null,
            savedAt: serverTimestamp(),
          },
          { merge: true }
        )
      );
      await Promise.all(writes);

      // keep local progress for this hour bucket
      await AsyncStorage.setItem(
        progressKey(buildingId, when),
        JSON.stringify(checked)
      );

      Alert.alert(
        "Checklist Submitted",
        `Saved ${done}/${total} completed for ${runId}.`
      );
    } catch (e: any) {
      console.error(e);
      Alert.alert("Error", e?.message ?? "Failed to submit checklist.");
    } finally {
      setSubmitting(false);
    }
  };

  const Row = ({ item }: { item: ChecklistItem }) => {
    const isChecked = !!checked[item.id];
    return (
      <TouchableOpacity
        onPress={() => toggle(item.id)}
        activeOpacity={0.9}
        style={s.row}
      >
        <View
          style={[
            s.checkbox,
            {
              borderColor: isDark ? "#334155" : "#CBD5E1",
              backgroundColor: isChecked
                ? isDark
                  ? "#10B98133"
                  : "#D1FAE5"
                : isDark
                ? "#0F172A"
                : "#FFFFFF",
            },
          ]}
        >
          {isChecked && (
            <Ionicons
              name="checkmark"
              size={16}
              color={isDark ? "#34D399" : "#059669"}
            />
          )}
        </View>

        <View style={{ flex: 1 }}>
          <Text
            style={[
              s.placeText,
              isChecked && { textDecorationLine: "line-through", opacity: 0.8 },
            ]}
            numberOfLines={1}
          >
            {item.place}
          </Text>
          {!!item.description && (
            <Text
              style={[
                s.descText,
                isChecked && { textDecorationLine: "line-through", opacity: 0.7 },
              ]}
              numberOfLines={2}
            >
              {item.description}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <Animated.View
          style={[
            s.headerWrap,
            {
              transform: [
                {
                  translateY: hdrAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-8, 0],
                  }),
                },
              ],
              opacity: hdrAnim,
            },
          ]}
        >
          <Text style={s.headerTitle}>Security Checklist</Text>
          <Text style={s.headerSub}>
            {buildingId
              ? `Building: ${buildingId.slice(0, 8)}… • Window: ${hourBucket(now)}`
              : "Select a building"}
          </Text>
        </Animated.View>

        {/* Status / controls */}
        <View style={s.controlsCard}>
          <View style={s.progressRow}>
            <View style={s.badge}>
              <Ionicons
                name="shield-checkmark-outline"
                size={14}
                color="#10B981"
              />
              <Text style={s.badgeText}>{done}/{total} completed</Text>
            </View>

            <TouchableOpacity
              onPress={() => setOnlyUnchecked((v) => !v)}
              style={[
                s.filterChip,
                onlyUnchecked && {
                  backgroundColor: isDark ? "#0B3B2F" : "#ECFDF5",
                  borderColor: isDark ? "#065F46" : "#A7F3D0",
                },
              ]}
              activeOpacity={0.9}
              disabled={items.length === 0}
            >
              <Ionicons
                name={onlyUnchecked ? "filter" : "filter-outline"}
                size={14}
                color={
                  onlyUnchecked ? "#10B981" : isDark ? "#E5E7EB" : "#111827"
                }
              />
              <Text
                style={[
                  s.filterChipText,
                  onlyUnchecked && { color: isDark ? "#D1FAE5" : "#065F46" },
                ]}
              >
                {onlyUnchecked ? "Showing unchecked" : "All items"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* List */}
        {!buildingId || loading ? (
          <View style={[s.center, { paddingTop: 24 }]}>
            <ActivityIndicator />
            <Text style={s.loadingText}>
              {!buildingId ? "Select a building…" : "Loading checklist…"}
            </Text>
          </View>
        ) : visibleItems.length === 0 ? (
          <View style={[s.center, { paddingTop: 32 }]}>
            <Ionicons
              name="checkmark-done-circle-outline"
              size={26}
              color={isDark ? "#94A3B8" : "#64748B"}
            />
            <Text style={s.emptyText}>
              {onlyUnchecked ? "Nothing left to check." : "No items yet."}
            </Text>
            {!onlyUnchecked && (
              <Text style={s.emptySubtle}>
                Create items in Security Checklist Creator.
              </Text>
            )}
          </View>
        ) : (
          <FlatList
            data={visibleItems}
            keyExtractor={(it) => it.id}
            renderItem={({ item }) => <Row item={item} />}
            contentContainerStyle={{
              paddingHorizontal: 14,
              paddingBottom: 110,
              paddingTop: 6,
            }}
          />
        )}

        {/* Bottom submit bar */}
        <View style={s.bottomBar}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={s.summaryDot} />
            <Text style={s.bottomSummary}>{done}/{total} done</Text>
          </View>

          <TouchableOpacity
            onPress={submitRun}
            disabled={disabledUI || submitting}
            activeOpacity={0.9}
            style={[s.submitBtn, (disabledUI || submitting) && { opacity: 0.6 }]}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="save-outline" size={16} color="#fff" />
                <Text style={s.submitText}>Submit Checklist</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

export default SecurityChecklist;

/* ----------------------------- Styles ----------------------------- */
const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? "#0C1220" : "#F6F7FB",
    },
    center: { alignItems: "center", justifyContent: "center" },
    loadingText: { marginTop: 8, color: isDark ? "#E5E7EB" : "#111827" },

    headerWrap: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 8,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: "900",
      color: isDark ? "#F3F4F6" : "#0F172A",
      letterSpacing: 0.2,
    },
    headerSub: {
      marginTop: 2,
      fontSize: 12,
      fontWeight: "700",
      color: isDark ? "#94A3B8" : "#64748B",
    },

    controlsCard: {
      marginHorizontal: 14,
      marginTop: 8,
      marginBottom: 6,
      borderRadius: 16,
      padding: 12,
      backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
      borderWidth: 1,
      borderColor: isDark ? "#1F2937" : "#EAECEE",
      shadowColor: "#000",
      shadowOpacity: isDark ? 0.18 : 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
    },
    progressRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 10,
    },
    badge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: isDark ? "#0B3B2F" : "#ECFDF5",
      borderColor: isDark ? "#065F46" : "#A7F3D0",
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    badgeText: {
      color: isDark ? "#D1FAE5" : "#065F46",
      fontWeight: "900",
      fontSize: 12,
      letterSpacing: 0.2,
    },
    filterChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
      backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
      borderWidth: 1,
      borderColor: isDark ? "#1F2937" : "#E5E7EB",
    },
    filterChipText: {
      fontSize: 12,
      fontWeight: "900",
      color: isDark ? "#E5E7EB" : "#0F172A",
      letterSpacing: 0.2,
    },

    actionsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    smallBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      flex: 1,
      justifyContent: "center",
    },
    smallBtnText: {
      fontWeight: "800",
      fontSize: 12,
      letterSpacing: 0.2,
    },

    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 12,
      marginHorizontal: 14,
      marginVertical: 6,
      padding: 14,
      backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
      borderRadius: 14,
      borderWidth: 1,
      borderColor: isDark ? "#1F2937" : "#EAECEE",
      shadowColor: "#000",
      shadowOpacity: isDark ? 0.18 : 0.06,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 4,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
    },
    placeText: {
      fontSize: 15,
      fontWeight: "900",
      color: isDark ? "#F3F4F6" : "#0F172A",
    },
    descText: {
      marginTop: 2,
      fontSize: 12,
      fontWeight: "700",
      color: isDark ? "#CBD5E1" : "#475569",
    },

    emptyText: {
      marginTop: 8,
      fontSize: 16,
      fontWeight: "800",
      color: isDark ? "#E5E7EB" : "#0F172A",
      letterSpacing: 0.2,
    },
    emptySubtle: {
      marginTop: 2,
      fontSize: 12,
      fontWeight: "700",
      color: isDark ? "#94A3B8" : "#64748B",
    },

    bottomBar: {
      position: "absolute",
      left: 14,
      right: 14,
      bottom: 12,
      borderRadius: 16,
      padding: 12,
      backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
      borderWidth: 1,
      borderColor: isDark ? "#1F2937" : "#EAECEE",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 10,
    },
    summaryDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: "#10B981",
    },
    bottomSummary: {
      fontWeight: "900",
      color: isDark ? "#E5E7EB" : "#0F172A",
      letterSpacing: 0.2,
    },
    submitBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderRadius: 12,
      backgroundColor: "#10B981",
    },
    submitText: {
      color: "#fff",
      fontWeight: "900",
      letterSpacing: 0.2,
    },
  });

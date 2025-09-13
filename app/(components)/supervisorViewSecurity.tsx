// app/supervisorViewSecurity.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { useTheme } from "../ThemeContext";
import { useBuilding } from "../BuildingContext";
import { router } from "expo-router";

type RunDoc = {
  runId?: string; // "YYYY-MM-DD-HH:00"
  dateYYYYMMDD?: string; // "YYYY-MM-DD"
  hourHHmm?: string; // "HH:00"
  submittedAt?: Timestamp | null;
  totalItems?: number;
  checkedCount?: number;
  uncheckedCount?: number;
  buildingId?: string;
  _id: string; // document id
};

export default function SupervisorViewSecurity() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const s = getStyles(isDark);

  const { buildingId } = useBuilding();

  const [runs, setRuns] = useState<RunDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 250,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [anim]);

  const fetchRuns = async () => {
    if (!buildingId) {
      setRuns([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }
    try {
      const qy = query(
        collection(db, "buildings", buildingId, "security_checklist_runs"),
        orderBy("submittedAt", "desc"),
        limit(50)
      );
      const snap = await getDocs(qy);
      const list: RunDoc[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          _id: d.id,
          runId: data.runId,
          dateYYYYMMDD: data.dateYYYYMMDD,
          hourHHmm: data.hourHHmm,
          submittedAt: data.submittedAt ?? null,
          totalItems: data.totalItems ?? 0,
          checkedCount: data.checkedCount ?? 0,
          uncheckedCount: data.uncheckedCount ?? 0,
          buildingId: data.buildingId,
        };
      });
      setRuns(list);
    } catch (e) {
      console.error("Failed to load runs:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchRuns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildingId]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchRuns();
  };

  const renderItem = ({ item }: { item: RunDoc }) => {
    const ts =
      item.submittedAt instanceof Timestamp ? item.submittedAt.toDate() : null;
    const submittedLabel = ts
      ? `${ts.toLocaleDateString()} ${ts.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}`
      : "—";

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() =>
          router.push({
            pathname: "/supervisorViewSecurityClicked/[runId]" as const,
            params: { runId: item._id, buildingId },
          })
        }
        style={s.row}
      >
        <View style={s.rowLeft}>
          <View style={s.iconBadge}>
            <Ionicons
              name="shield-checkmark"
              size={16}
              color={isDark ? "#D1FAE5" : "#065F46"}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.rowTitle} numberOfLines={1}>
              {item.runId || item._id}
            </Text>
            <Text style={s.rowSub} numberOfLines={1}>
              Submitted: {submittedLabel}
            </Text>
          </View>
        </View>

        <View style={s.countPill}>
          <Text style={s.countPillText}>
            {item.checkedCount ?? 0}/{item.totalItems ?? 0}
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={18}
          color={isDark ? "#E5E7EB" : "#111827"}
          style={{ marginLeft: 8 }}
        />
      </TouchableOpacity>
    );
  };

  return (
    <View style={s.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <Animated.View
          style={[
            s.header,
            {
              opacity: anim,
              transform: [
                {
                  translateY: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-8, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={s.headerTitle}>Security Runs</Text>
          <Text style={s.headerSub}>
            {buildingId
              ? `Building: ${buildingId.slice(0, 8)}…`
              : "Select a building"}
          </Text>
        </Animated.View>

        {!buildingId ? (
          <View style={[s.center, { paddingTop: 24 }]}>
            <Ionicons
              name="business-outline"
              size={22}
              color={isDark ? "#94A3B8" : "#64748B"}
            />
            <Text style={s.muted}>Pick a building to view runs.</Text>
          </View>
        ) : loading ? (
          <View style={[s.center, { paddingTop: 24 }]}>
            <ActivityIndicator />
            <Text style={s.muted}>Loading latest runs…</Text>
          </View>
        ) : runs.length === 0 ? (
          <View style={[s.center, { paddingTop: 32 }]}>
            <Ionicons
              name="document-text-outline"
              size={26}
              color={isDark ? "#94A3B8" : "#64748B"}
            />
            <Text style={s.muted}>No runs found.</Text>
          </View>
        ) : (
          <FlatList
            data={runs}
            keyExtractor={(it) => it._id}
            renderItem={renderItem}
            contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 14 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}

/* ------------------ styles ------------------ */
const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
    },
    center: { alignItems: "center", justifyContent: "center" },
    header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
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
    muted: {
      marginTop: 8,
      color: isDark ? "#94A3B8" : "#64748B",
      fontWeight: "700",
    },

    row: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 12,
      paddingHorizontal: 12,
      marginTop: 10,
      borderRadius: 14,
      backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
      borderWidth: 1,
      borderColor: isDark ? "#111827" : "#E5E7EB",
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 3,
    },
    rowLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
    iconBadge: {
      width: 28,
      height: 28,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "#0B3B2F" : "#ECFDF5",
      borderWidth: 1,
      borderColor: isDark ? "#065F46" : "#A7F3D0",
    },
    rowTitle: {
      fontSize: 15,
      fontWeight: "900",
      color: isDark ? "#F3F4F6" : "#0F172A",
    },
    rowSub: {
      marginTop: 2,
      fontSize: 12,
      fontWeight: "700",
      color: isDark ? "#94A3B8" : "#64748B",
    },
    countPill: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: isDark ? "#0B3B2F" : "#ECFDF5",
      borderWidth: 1,
      borderColor: isDark ? "#065F46" : "#A7F3D0",
    },
    countPillText: {
      fontSize: 12,
      fontWeight: "900",
      color: isDark ? "#D1FAE5" : "#065F46",
    },
  });

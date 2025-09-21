// app/(components)/SecurityHourlyNudge.tsx
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useServerTime } from "../serverTimeContext";
import { useTheme } from "../ThemeContext";
import { useBuilding } from "../BuildingContext";
import { router } from "expo-router";

const ackKey = (buildingId: string, ymd: string, hour: number) =>
  `secCheckAck:${buildingId}:${ymd}:${hour}`;

function ymd(dt: Date) {
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const d = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function SecurityHourlyNudge() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const s = getStyles(isDark);

  const { buildingId } = useBuilding();
  const { tzNow, security } = useServerTime();

  const dt = tzNow(); // Luxon DateTime
  const jsNow = dt.toJSDate();
  const today = ymd(jsNow);
  const hour = dt.hour;

  const [dismissed, setDismissed] = useState(false);
  const [ack, setAck] = useState(false);

  // Load acknowledge state for this hour (per building)
  useEffect(() => {
    (async () => {
      if (!buildingId) return;
      const raw = await AsyncStorage.getItem(ackKey(buildingId, today, hour));
      setAck(!!raw);
      setDismissed(false);
    })();
  }, [buildingId, today, hour]);

  // Active banner visibility (first ~9 minutes within hours, not acknowledged/dismissed)
  const showActiveBanner = useMemo(() => {
    if (!buildingId) return false;
    if (!security.isWithinSecurityHours) return false;
    if (!security.isPingWindow) return false;
    if (ack || dismissed) return false;
    return true;
  }, [buildingId, security, ack, dismissed]);

  const onStart = async () => {
    if (!buildingId) return;
    await AsyncStorage.setItem(ackKey(buildingId, today, hour), "1");
    setAck(true);
    router.push("/securityChecklist");
  };

  // Quiet/placeholder state (no button, just info & countdown)
  if (!showActiveBanner) {
    if (!buildingId || !security.isWithinSecurityHours) return null;

    // Countdown formatting
    const secs = Math.max(0, security.secondsToNextPing);
    const showCountdown = Number.isFinite(secs) && secs <= 3600; // only show if ≤ 1 hour
    const mm = String(Math.floor(secs / 60)).padStart(2, "0");
    const ss = String(secs % 60).padStart(2, "0");

    // Progress toward next ping (0 → 1 across the hour)
    const progress = Math.max(0, Math.min(1, 1 - secs / 3600));

    return (
      <View style={s.placeholderCard}>
        <View style={s.placeholderHeader}>
          <View style={s.iconBadge}>
            <Ionicons
              name="shield-checkmark"
              size={14}
              color={isDark ? "#D1FAE5" : "#065F46"}
            />
          </View>
          <Text style={s.placeholderTitle}>Next security check</Text>
          <View style={s.dot} />
          <Text style={s.timeText}>{security.nextPing.toFormat("h:mm a")}</Text>
        </View>

        {showCountdown && (
          <>
            <View style={s.countdownRow}>
              <Ionicons
                name="time-outline"
                size={14}
                color={isDark ? "#CBD5E1" : "#64748B"}
              />
              <Text style={s.countdownLabel}>Time remaining</Text>
              <Text style={s.countdownValue}>{mm}:{ss}</Text>
            </View>

            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${progress * 100}%` }]} />
            </View>
          </>
        )}
      </View>
    );
  }

  // Active banner (actionable)
  return (
    <View style={s.activeWrap}>
      <View style={s.activeRow}>
        <View style={s.activeIconBadge}>
          <Ionicons
            name="alarm-outline"
            size={16}
            color={isDark ? "#FDE68A" : "#92400E"}
          />
        </View>

        <View style={{ flex: 1 }}>
          <Text style={s.activeTitle}>Hourly Security Check</Text>
          <Text style={s.activeSub}>
            It’s {dt.toFormat("h:mm a")} — start your {dt.toFormat("h a")} round.
          </Text>
        </View>

        <TouchableOpacity onPress={onStart} style={s.cta} activeOpacity={0.9}>
          <Text style={s.ctaText}>Start</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setDismissed(true)}
          style={s.dismissBtn}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Ionicons
            name="close"
            size={16}
            color={isDark ? "#E5E7EB" : "#1F2937"}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    /* ---------- Active banner ---------- */
    activeWrap: {
      marginHorizontal: 14,
      marginTop: 8,
      marginBottom: 6,
      borderRadius: 14,
      backgroundColor: isDark ? "#182235" : "#FFF7ED",
      borderWidth: 1,
      borderColor: isDark ? "#2A3951" : "#FED7AA",
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 4,
    },
    activeRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 12,
      paddingVertical: 12,
    },
    activeIconBadge: {
      width: 28,
      height: 28,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "#1F2937" : "#FDE68A33",
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#273244" : "transparent",
    },
    activeTitle: {
      fontSize: 14,
      fontWeight: "900",
      color: isDark ? "#F3F4F6" : "#7C2D12",
      letterSpacing: 0.2,
    },
    activeSub: {
      marginTop: 2,
      fontSize: 12,
      fontWeight: "700",
      color: isDark ? "#CBD5E1" : "#7C2D12",
    },
    cta: {
      backgroundColor: isDark ? "#2563EB" : "#1D4ED8",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
    },
    ctaText: { color: "#fff", fontWeight: "900" },
    dismissBtn: {
      marginLeft: 6,
      width: 28,
      height: 28,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "#111827" : "#E5E7EB",
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#1F2937" : "transparent",
    },

    /* ---------- Quiet/placeholder card (no button) ---------- */
    placeholderCard: {
      marginHorizontal: 14,
      marginTop: 8,
      marginBottom: 6,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: 14,
      backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
      borderWidth: 1,
      borderColor: isDark ? "#1F2937" : "#E5E7EB",
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 3,
    },
    placeholderHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 10,
    },
    iconBadge: {
      width: 22,
      height: 22,
      borderRadius: 7,
      alignItems: "center",
      justifyContent: "center",
      marginRight: 8,
      backgroundColor: isDark ? "#0B3B2F" : "#ECFDF5",
      borderWidth: 1,
      borderColor: isDark ? "#065F46" : "#A7F3D0",
    },
    placeholderTitle: {
      fontSize: 13,
      fontWeight: "900",
      color: isDark ? "#E5E7EB" : "#0F172A",
      letterSpacing: 0.2,
    },
    dot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      backgroundColor: isDark ? "#334155" : "#CBD5E1",
      marginHorizontal: 8,
    },
    timeText: {
      fontSize: 12,
      fontWeight: "800",
      color: isDark ? "#93C5FD" : "#1D4ED8",
      letterSpacing: 0.3,
    },
    countdownRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 8,
      gap: 8,
    },
    countdownLabel: {
      fontSize: 12,
      fontWeight: "800",
      color: isDark ? "#94A3B8" : "#64748B",
      letterSpacing: 0.2,
    },
    countdownValue: {
      marginLeft: "auto",
      fontVariant: ["tabular-nums"],
      fontSize: 14,
      fontWeight: "900",
      color: isDark ? "#F3F4F6" : "#0F172A",
      letterSpacing: 0.3,
    },
    progressTrack: {
      height: 6,
      borderRadius: 999,
      backgroundColor: isDark ? "#111827" : "#F1F5F9",
      overflow: "hidden",
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#1F2937" : "transparent",
    },
    progressFill: {
      height: "100%",
      borderRadius: 999,
      backgroundColor: isDark ? "#10B981" : "#059669",
    },
  });

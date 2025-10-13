// app/(manager)/securityChecklist_readonly.tsx
// Read-only view of the Security Checklist. Matches the Creator UI but blocks all mutations.

import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../ThemeContext";
import { useBuilding } from "../../BuildingContext";
import { db } from "../../../firebaseConfig";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { router } from "expo-router";

/* ---------------------------- Types & helpers ---------------------------- */

type ChecklistItem = {
  id: string;
  place: string;
  description: string;
  order: number;
  active?: boolean;
};

function deepClone<T>(arr: T[]): T[] {
  return arr.map((x) => ({ ...(x as any) }));
}

/* ------------------------------ Minimal palette ------------------------------ */
const Pal = {
  light: {
    bg: "#F7F8FA",
    surface: "#FFFFFF",
    text: "#0B1220",
    textMuted: "#5B6472",
    hairline: "#E7EAF0",
    accent: "#147CE5",
    accentSoft: "#E8F1FF",
    success: "#16A34A",
    subtle: "#F3F4F6",
  },
  dark: {
    bg: "#0A0F1A",
    surface: "#0F1626",
    text: "#E6EAF2",
    textMuted: "#9AA4B2",
    hairline: "#1F2A3A",
    accent: "#4CA2FF",
    accentSoft: "#11233B",
    success: "#22C55E",
    subtle: "#121A28",
  },
};

/* --------------------------------- Empty ---------------------------------- */

const EmptyState = ({ isDark }: { isDark: boolean }) => {
  const C = isDark ? Pal.dark : Pal.light;
  return (
    <View style={{ alignItems: "center", paddingVertical: 48, gap: 8 }}>
      <Ionicons name="shield-checkmark-outline" size={28} color={C.textMuted} />
      <Text style={{ fontSize: 16, fontWeight: "900", color: C.text }}>
        No items yet
      </Text>
      <Text style={{ color: C.textMuted, fontWeight: "700" }}>
        Supervisor will add items to this checklist.
      </Text>
    </View>
  );
};

/* ------------------------- Main Screen Component ------------------------ */

const SecurityChecklistReadOnly: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const C = isDark ? Pal.dark : Pal.light;
  const s = getStyles(isDark);
  const { buildingId } = useBuilding();

  // subtle bg crossfade (matches Scheduled Tasks vibe)
  const themeAnim = useRef(new Animated.Value(isDark ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(themeAnim, {
      toValue: isDark ? 1 : 0,
      duration: 180,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [isDark, themeAnim]);

  const [items, setItems] = useState<ChecklistItem[]>([]);
  const originalRef = useRef<ChecklistItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const disabledUI = !buildingId;

  // Live subscription (read-only)
  useEffect(() => {
    setItems([]);
    originalRef.current = [];
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
        setLoading(false);
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
        originalRef.current = deepClone(arr);
      },
      () => setLoading(false)
    );

    return () => unsub();
  }, [buildingId]);

  /* ------------------------------ Render Item ------------------------------ */
  const renderItem = ({ item }: { item: ChecklistItem }) => {
    const dotColor = item.active ? C.success : C.textMuted;

    return (
      <View style={s.row}>
        <View style={[s.dot, { backgroundColor: dotColor }]} />

        <View style={{ flex: 1 }}>
          <Text style={s.title} numberOfLines={1}>
            {item.place}
          </Text>

          {!!item.description && (
            <Text style={s.desc} numberOfLines={2}>
              {item.description}
            </Text>
          )}
        </View>

        {/* Keep a disabled affordance to signal read-only (very subtle) */}
        <View style={s.iconGhost}>
          <Ionicons name="trash-outline" size={18} color={C.textMuted} />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={s.container}>
      {/* crossfade background */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: Pal.light.bg }]} />
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: Pal.dark.bg, opacity: themeAnim },
        ]}
      />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.iconBtn} activeOpacity={0.9}>
          <Ionicons name="chevron-back" size={18} color={C.text} />
        </TouchableOpacity>

        <View style={s.headerMid}>
          <Text style={s.headerTitle}>Security Checklist</Text>
          <Text style={s.headerSub}>{disabledUI ? "Select a building" : "View only"}</Text>
        </View>

        {/* inert Add button for parity with creator UI (muted) */}
        <View style={[s.iconBtn, { opacity: 0.35 }]}>
          <Ionicons name="add" size={18} color={C.text} />
        </View>
      </View>

      {/* Content */}
      {disabledUI ? (
        <View style={[s.center, { paddingVertical: 24 }]}>
          <ActivityIndicator />
          <Text style={s.muted}>Waiting for building…</Text>
        </View>
      ) : loading ? (
        <View style={[s.center, { paddingVertical: 24 }]}>
          <ActivityIndicator />
          <Text style={s.muted}>Loading…</Text>
        </View>
      ) : items.length === 0 ? (
        <EmptyState isDark={isDark} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          ItemSeparatorComponent={() => <View style={s.hairline} />}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 28 }}
          extraData={items.map((i) => i.id).join("|")}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

export default SecurityChecklistReadOnly;

/* -------------------------------- Styles -------------------------------- */

const getStyles = (isDark: boolean) => {
  const C = isDark ? Pal.dark : Pal.light;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.bg,
    },

    /* Header (mirrors Scheduled Tasks) */
    header: {
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 10,
      backgroundColor: C.bg,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: C.hairline,
    },
    iconBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.hairline,
    },
    headerMid: { alignItems: "center", gap: 2 },
    headerTitle: {
      fontSize: 20,
      fontWeight: "900",
      color: C.text,
      letterSpacing: 0.2,
    },
    headerSub: {
      fontSize: 12,
      fontWeight: "700",
      color: C.textMuted,
    },

    /* List rows (minimal) */
    hairline: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: C.hairline,
      marginLeft: 16 + 10 + 8, // align under content, not the dot
    },
    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      marginTop: 6,
      marginLeft: 10,
    },
    title: {
      fontSize: 16,
      fontWeight: "900",
      color: C.text,
      letterSpacing: 0.2,
    },
    desc: {
      marginTop: 6,
      fontSize: 13,
      lineHeight: 18,
      color: C.textMuted,
      fontWeight: "700",
    },
    iconGhost: {
      opacity: 0.25,
      paddingLeft: 8,
      paddingTop: Platform.select({ ios: 0, android: 2, default: 0 }),
    },

    /* Misc */
    center: { alignItems: "center", justifyContent: "center" },
    muted: { color: C.textMuted, fontWeight: "700" },
  });
};

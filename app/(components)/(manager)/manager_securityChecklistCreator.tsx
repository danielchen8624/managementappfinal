// app/(manager)/securityChecklist_readonly.tsx
// Read-only view of the Security Checklist. Matches the Creator UI but blocks all mutations.

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
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

/* --------------------------------- UI ---------------------------------- */

const EmptyState = ({ isDark }: { isDark: boolean }) => (
  <View style={{ alignItems: "center", paddingVertical: 48, gap: 8 }}>
    <Ionicons
      name="shield-checkmark-outline"
      size={28}
      color={isDark ? "#94A3B8" : "#64748B"}
    />
    <Text
      style={{
        fontSize: 16,
        fontWeight: "800",
        color: isDark ? "#E5E7EB" : "#0F172A",
      }}
    >
      No items yet
    </Text>
    <Text style={{ color: isDark ? "#94A3B8" : "#64748B" }}>
      Supervisor will add items to this checklist.
    </Text>
  </View>
);

/* ------------------------- Main Screen Component ------------------------ */

const SecurityChecklistReadOnly: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const styles = getStyles(isDark);
  const { buildingId } = useBuilding();

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

  const renderItem = ({ item }: { item: ChecklistItem }) => (
    <View style={styles.card}>
      <View style={styles.itemTextWrap}>
        <Text style={styles.placeText} numberOfLines={1}>
          {item.place}
        </Text>
        {!!item.description && (
          <Text style={styles.descText} numberOfLines={2}>
            {item.description}
          </Text>
        )}
      </View>

      {/* Keep delete button visible but disabled to match UI */}
      <TouchableOpacity
        onPress={() => {}}
        disabled
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={[styles.deleteBtn, { opacity: 0.6 }]}
      >
        <Ionicons name="trash-outline" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header (matches creator UI) */}
        <View style={styles.headerRow}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.smallGreyBtn}
            accessibilityLabel="Back"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="chevron-back"
              size={20}
              color={isDark ? "#E5E7EB" : "#111827"}
            />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Security Checklist Creator</Text>
            <Text style={styles.headerSub}>
              {disabledUI ? "Select a building to continue" : "View-only"}
            </Text>
          </View>

          {/* Add item button present but inert */}
          <TouchableOpacity
            style={[styles.addBtn, { opacity: 0.6 }]}
            disabled
            onPress={() => {}}
          >
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.addBtnText}>Add item</Text>
          </TouchableOpacity>
        </View>

        {!buildingId ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
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
                Building not selected
              </Text>
              <Text
                style={{ marginTop: 4, color: isDark ? "#CBD5E1" : "#7C2D12" }}
              >
                Use the building switcher to scope your checklist.
              </Text>
            </View>
          </View>
        ) : null}

        {/* List */}
        {disabledUI ? (
          <View style={styles.center}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Waiting for building…</Text>
          </View>
        ) : loading ? (
          <View style={styles.center}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Loading…</Text>
          </View>
        ) : items.length === 0 ? (
          <EmptyState isDark={isDark} />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(it) => it.id}
            renderItem={renderItem}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: 96,
              paddingTop: 8,
            }}
            extraData={items.map((i) => i.id).join("|")}
          />
        )}

        {/* Save/Discard bar intentionally omitted in read-only */}
      </SafeAreaView>
    </View>
  );
};

export default SecurityChecklistReadOnly;

/* -------------------------------- Styles -------------------------------- */

const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? "#0B1220" : "#F8FAFC",
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 12,
      paddingTop: 12,
      paddingBottom: 8,
      gap: 8,
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "800",
      color: isDark ? "#F3F4F6" : "#111827",
      letterSpacing: 0.2,
    },
    headerSub: {
      marginTop: 2,
      color: isDark ? "#A1A1AA" : "#6B7280",
      fontSize: 12,
    },
    addBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: isDark ? "#2563EB" : "#1D4ED8",
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
    },
    addBtnText: { color: "#FFF", fontWeight: "800" },

    card: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      backgroundColor: isDark ? "#111827" : "#FFFFFF",
      borderRadius: 16,
      padding: 14,
      marginVertical: 8,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#1F2937" : "transparent",
      shadowColor: "#000",
      shadowOpacity: 0.08,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    itemTextWrap: { flex: 1 },
    placeText: {
      fontSize: 15,
      fontWeight: "800",
      color: isDark ? "#E5E7EB" : "#0F172A",
    },
    descText: {
      marginTop: 2,
      fontSize: 12,
      color: isDark ? "#CBD5E1" : "#475569",
    },
    deleteBtn: {
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 10,
      backgroundColor: "#EF4444",
    },
    smallGreyBtn: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "#111827" : "#E5E7EB",
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#1F2937" : "transparent",
    },

    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    loadingText: { marginTop: 8, color: isDark ? "#E5E7EB" : "#111827" },
  });

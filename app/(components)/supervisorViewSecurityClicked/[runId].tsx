// app/supervisorViewSecurityClicked/[runId].tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../../../firebaseConfig";
import { useTheme } from "../../ThemeContext";

type Item = {
  itemId: string;
  place: string;
  description: string;
  order: number;
  checked: boolean;
};

export default function SupervisorRunDetail() {
  const { runId, buildingId } = useLocalSearchParams<{
    runId: string;
    buildingId: string;
  }>();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const s = getStyles(isDark);

  const [meta, setMeta] = useState<any>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!runId || !buildingId) return;
      try {
        const runRef = doc(
          db,
          "buildings",
          String(buildingId),
          "security_checklist_runs",
          String(runId)
        );
        const runSnap = await getDoc(runRef);
        setMeta(runSnap.exists() ? runSnap.data() : null);

        const qy = query(collection(runRef, "items"), orderBy("order"));
        const snap = await getDocs(qy);
        const list: Item[] = snap.docs.map((d) => {
          const x = d.data() as any;
          return {
            itemId: x.itemId ?? d.id,
            place: x.place ?? "Untitled",
            description: x.description ?? "",
            order: x.order ?? 999,
            checked: !!x.checked,
          };
        });
        setItems(list);
      } finally {
        setLoading(false);
      }
    })();
  }, [runId, buildingId]);

  if (loading) {
    return (
      <View style={[s.container, s.center]}>
        <ActivityIndicator />
        <Text style={s.muted}>Loading run…</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Ionicons
              name="chevron-back"
              size={20}
              color={isDark ? "#E5E7EB" : "#111827"}
            />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Security Run</Text>
            <Text style={s.sub}>
              {(meta?.runId ?? runId) as string} • {meta?.checkedCount ?? 0}/
              {meta?.totalItems ?? 0} checked
            </Text>
          </View>
        </View>

        <FlatList
          data={items}
          keyExtractor={(it) => it.itemId}
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 14 }}
          renderItem={({ item }) => (
            <View style={s.row}>
              <View style={[s.check, item.checked && s.checked]}>
                {item.checked && (
                  <Ionicons
                    name="checkmark"
                    size={14}
                    color={isDark ? "#34D399" : "#059669"}
                  />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={[s.place, item.checked && s.dimStrike]}
                  numberOfLines={1}
                >
                  {item.place}
                </Text>
                {!!item.description && (
                  <Text
                    style={[s.desc, item.checked && s.dimStrike]}
                    numberOfLines={2}
                  >
                    {item.description}
                  </Text>
                )}
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={[s.center, { paddingTop: 24 }]}>
              <Ionicons
                name="document-text-outline"
                size={22}
                color={isDark ? "#94A3B8" : "#64748B"}
              />
              <Text style={s.muted}>No items saved for this run.</Text>
            </View>
          }
        />
      </SafeAreaView>
    </View>
  );
}

const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? "#0F172A" : "#F8FAFC" },
    center: { alignItems: "center", justifyContent: "center" },
    muted: {
      marginTop: 8,
      color: isDark ? "#94A3B8" : "#64748B",
      fontWeight: "700",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingTop: 8,
      paddingBottom: 8,
    },
    backBtn: {
      width: 34,
      height: 34,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "#111827" : "#E5E7EB",
      marginRight: 8,
    },
    title: {
      fontSize: 18,
      fontWeight: "900",
      color: isDark ? "#F3F4F6" : "#0F172A",
    },
    sub: {
      marginTop: 2,
      fontSize: 12,
      fontWeight: "700",
      color: isDark ? "#94A3B8" : "#64748B",
    },
    row: {
      flexDirection: "row",
      gap: 12,
      marginTop: 10,
      padding: 12,
      borderRadius: 14,
      backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
      borderWidth: 1,
      borderColor: isDark ? "#111827" : "#E5E7EB",
    },
    check: {
      width: 22,
      height: 22,
      borderRadius: 6,
      borderWidth: 1,
      borderColor: isDark ? "#334155" : "#CBD5E1",
      alignItems: "center",
      justifyContent: "center",
      marginTop: 2,
      backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
    },
    checked: { backgroundColor: isDark ? "#10B98133" : "#D1FAE5" },
    place: {
      fontSize: 15,
      fontWeight: "900",
      color: isDark ? "#F3F4F6" : "#0F172A",
    },
    desc: {
      marginTop: 2,
      fontSize: 12,
      fontWeight: "700",
      color: isDark ? "#CBD5E1" : "#475569",
    },
    dimStrike: { textDecorationLine: "line-through", opacity: 0.75 },
  });

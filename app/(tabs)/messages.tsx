import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  SafeAreaView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Animated,
  Easing,
} from "react-native";
import { router } from "expo-router";
import { db } from "../../firebaseConfig";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { useTheme } from "../ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { useBuilding } from "../BuildingContext";

type Message = {
  id: string;
  title: string;
  content: string;
  createdBy: string;   // firstName, per your sendMessage change
  author_email?: string;
  createdAt?: Timestamp;
};

type TabKey = "local" | "global";

function formatDate(ts?: Timestamp) {
  if (!ts) return "Unknown date";
  const date = ts.toDate();
  const options: Intl.DateTimeFormatOptions = {
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  };
  return new Intl.DateTimeFormat("en-US", options)
    .format(date)
    .replace(",", " at");
}

// NEW: helper for 24h window
const isNewWithin24h = (ts?: Timestamp) => {
  if (!ts?.toDate) return false;
  const ageMs = Date.now() - ts.toDate().getTime();
  return ageMs < 24 * 60 * 60 * 1000;
};

function MessagePage() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const styles = getStyles(isDark);

  const { buildingId } = useBuilding();

  const [activeTab, setActiveTab] = useState<TabKey>("local");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  // THEME CROSSFADE
  const themeAnim = useRef(new Animated.Value(isDark ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(themeAnim, {
      toValue: isDark ? 1 : 0,
      duration: 220,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [isDark, themeAnim]);

  // Subscribe per tab
  useEffect(() => {
    setLoading(true);

    if (activeTab === "local" && !buildingId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    const colRef =
      activeTab === "global"
        ? collection(db, "global_messages")
        : collection(db, "buildings", String(buildingId), "messages");

    const qy = query(colRef, orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      qy,
      (snap) => {
        const data: Message[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Message, "id">),
        }));
        setMessages(data);
        setLoading(false);
      },
      (err) => {
        console.error("onSnapshot(messages) error:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [activeTab, buildingId]);

  const renderItem = ({ item }: { item: Message }) => {
    const when = formatDate(item.createdAt);
    const fresh = isNewWithin24h(item.createdAt); // NEW

    return (
      <View style={[styles.card, fresh && styles.cardNew]}>
        {/* Top row: Name (left) • Time (right) */}
        <View style={styles.topRow}>
          <Text style={styles.topName} numberOfLines={1}>
            {item.createdBy || "Unknown"}
          </Text>
          <Text style={styles.topTime} numberOfLines={1}>
            {when}
          </Text>
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {item.title || "(No title)"}
        </Text>

        {/* Description */}
        <Text style={styles.content}>{item.content}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* crossfade layers */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "#F8FAFC" }]} />
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "#0F172A", opacity: themeAnim },
        ]}
      />

      {/* Header */}
      <View style={styles.headerBar}>
        {/* Tabs - percentage widths to stretch near the + button */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            onPress={() => setActiveTab("local")}
            style={[styles.tabBtn, activeTab === "local" && styles.tabBtnActive]}
            accessibilityLabel="Local messages"
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Text style={[styles.tabText, activeTab === "local" && styles.tabTextActive]}>
              Local
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab("global")}
            style={[styles.tabBtn, activeTab === "global" && styles.tabBtnActive]}
            accessibilityLabel="Global messages"
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Text style={[styles.tabText, activeTab === "global" && styles.tabTextActive]}>
              Global
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ flexDirection: "row", gap: 10 }}>
          {/* Add message */}
          <TouchableOpacity
            style={styles.smallGreyBtn}
            onPress={() => router.push("/sendMessage")}
            accessibilityLabel="New message"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="add" size={20} color={isDark ? "#E5E7EB" : "#111827"} />
          </TouchableOpacity>
          {/* Theme toggle */}
          <TouchableOpacity
            style={styles.smallGreyBtn}
            onPress={toggleTheme}
            accessibilityLabel="Toggle theme"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name={isDark ? "sunny-outline" : "moon-outline"} size={18} color={isDark ? "#FDE68A" : "#111827"} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {activeTab === "local" && !buildingId ? (
        <View style={styles.center}>
          <Text style={styles.empty}>Select a building to view local messages.</Text>
        </View>
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      ) : messages.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.empty}>No messages yet.</Text>
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.divider} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

export default MessagePage;

const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
      paddingTop: 4,
    },

    /* Header */
    headerBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 8,
    },

    // Tabs use % widths to stretch near the + icon
    tabsRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      width: "72%",
    },
    tabBtn: {
      width: "48%",
      paddingVertical: 6,
      borderRadius: 10,
      alignItems: "center",
      backgroundColor: isDark ? "#111827" : "#E5E7EB",
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#1F2937" : "transparent",
    },
    tabBtnActive: {
      backgroundColor: isDark ? "#1E3A8A" : "#3B82F6",
      borderColor: "transparent",
    },
    tabText: {
      fontSize: 13,
      fontWeight: "800",
      color: isDark ? "#C7D2FE" : "#1E3A8A",
      letterSpacing: 0.2,
    },
    tabTextActive: {
      color: "#FFFFFF",
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

    /* List */
    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 24,
    },
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    loadingText: {
      marginTop: 8,
      color: isDark ? "#CBD5E1" : "#444",
    },
    empty: {
      fontSize: 16,
      color: isDark ? "#94A3B8" : "#777",
    },

    /* Card */
    card: {
      backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
      borderRadius: 16,
      padding: 14,
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 6,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#111827" : "transparent",
    },

    // NEW: highlighted border for <24h old messages
    cardNew: {
      borderWidth: 2,
      borderColor: isDark ? "#60A5FA" : "#2563EB",
      shadowOpacity: 0.18,
      shadowRadius: 8,
      shadowColor: isDark ? "#60A5FA" : "#2563EB",
    },

    // Top row: name left, time right
    topRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 6,
    },
    topName: {
      flexShrink: 1,
      fontSize: 13,
      fontWeight: "800",
      color: isDark ? "#E5E7EB" : "#111827",
      marginRight: 8,
    },
    topTime: {
      fontSize: 12,
      fontWeight: "700",
      color: isDark ? "#B6C2CF" : "#4B5563",
    },

    title: {
      fontSize: 16,
      fontWeight: "800",
      color: isDark ? "#F3F4F6" : "#0F172A",
      marginBottom: 6,
    },

    content: {
      fontSize: 14,
      color: isDark ? "#CBD5E1" : "#334155",
      lineHeight: 20,
    },

    divider: {
      height: 10,
      backgroundColor: "transparent",
    },
  });

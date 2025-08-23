import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { db, auth } from "../../firebaseConfig";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
} from "firebase/firestore";
import { useTheme } from "../ThemeContext";
import { Ionicons } from "@expo/vector-icons";

type Message = {
  id: string;
  title: string;
  content: string;
  createdBy: string;
  createdAt?: Timestamp;
};

function timeAgo(ts?: Timestamp) {
  if (!ts?.toDate) return "";
  const d = ts.toDate().getTime();
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  return `${days}d ago`;
}

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

function MessagePage() {
  const currentUserName = auth.currentUser?.displayName;
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const styles = getStyles(isDark);

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

  useEffect(() => {
    const q = query(collection(db, "messages"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
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
  }, []);

  const renderItem = ({ item }: { item: Message }) => {
    const ago = timeAgo(item.createdAt);
    const isNew =
      item.createdAt?.toDate &&
      Date.now() - item.createdAt.toDate().getTime() < 24 * 60 * 60 * 1000;

    const initials =
      (item.createdBy || "?")
        .split(/\s+/)
        .map((s) => s[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "?";

    return (
      <View style={styles.card}>
        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {item.title || "(No title)"}
        </Text>

        {/* Meta row */}
        <View style={styles.metaRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.metaText} numberOfLines={1}>
            {item.createdBy || "Unknown"} • {formatDate(item.createdAt)}
          </Text>
          {!!ago && (
            <View style={styles.agoPill}>
              <Ionicons name="time-outline" size={12} color="#fff" />
              <Text style={styles.agoPillText}>{ago}</Text>
            </View>
          )}
          {isNew && (
            <View style={styles.newPill}>
              <Text style={styles.newPillText}>New</Text>
            </View>
          )}
        </View>

        {/* Body */}
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
        <Text style={styles.headerTitle}>Messages</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          {/* Add message */}
          <TouchableOpacity
            style={styles.smallGreyBtn}
            onPress={() => router.push("/sendMessage")}
            accessibilityLabel="New message"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="add"
              size={20}
              color={isDark ? "#E5E7EB" : "#111827"}
            />
          </TouchableOpacity>
          {/* Theme toggle */}
          <TouchableOpacity
            style={styles.smallGreyBtn}
            onPress={toggleTheme}
            accessibilityLabel="Toggle theme"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isDark ? "sunny-outline" : "moon-outline"}
              size={18}
              color={isDark ? "#FDE68A" : "#111827"}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content */}
      {loading ? (
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
    headerTitle: {
      fontSize: 22,
      fontWeight: "800",
      color: isDark ? "#F3F4F6" : "#111827",
      letterSpacing: 0.2,
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
    title: {
      fontSize: 16,
      fontWeight: "800",
      color: isDark ? "#F3F4F6" : "#0F172A",
      marginBottom: 6,
    },

    /* Meta row */
    metaRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
      flexWrap: "nowrap",
    },
    avatar: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "#0B1220" : "#E5E7EB",
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#1F2937" : "transparent",
    },
    avatarText: {
      fontSize: 11,
      fontWeight: "800",
      color: isDark ? "#E5E7EB" : "#111827",
    },
    metaText: {
      flexShrink: 1,
      flexGrow: 1,
      fontSize: 12,
      color: isDark ? "#B6C2CF" : "#4B5563",
    },
    agoPill: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: "#3B82F6",
    },
    agoPillText: {
      color: "#fff",
      fontSize: 11,
      fontWeight: "700",
      letterSpacing: 0.2,
    },
    newPill: {
      marginLeft: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: 999,
      backgroundColor: "#10B981",
    },
    newPillText: {
      color: "#fff",
      fontSize: 11,
      fontWeight: "800",
      letterSpacing: 0.2,
    },

    /* Body */
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

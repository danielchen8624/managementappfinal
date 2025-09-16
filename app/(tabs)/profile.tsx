import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Animated,
  Easing,
  Image, // <-- added
} from "react-native";
import { signOut } from "firebase/auth";
// If your project exports db from the same module, keep this import.
// If not, change to your actual path (e.g., "../../firebaseConfig").
import { auth, db } from "@/firebaseConfig";
import { router } from "expo-router";
import { useTheme } from "../ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { doc, onSnapshot } from "firebase/firestore"; // <-- added

type UserDoc = {
  firstName?: string;
  lastName?: string;
  birthday?: string;
  employeeId?: string;
  profileImageUri?: string | null;
  email?: string;
  displayName?: string | null;
};

/* ---------- Pretty row for settings ---------- */
function SettingsRow({
  label,
  onPress,
  isDark,
  icon,
}: {
  label: string;
  onPress: () => void;
  isDark: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.88}
      style={{
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 14,
        paddingHorizontal: 14,
        borderRadius: 14,
        backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
        borderWidth: isDark ? 1 : 0,
        borderColor: isDark ? "#111827" : "transparent",
        shadowColor: "#000",
        shadowOpacity: 0.08,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 4,
        marginTop: 10,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: isDark ? "#111827" : "#E5E7EB",
            borderWidth: isDark ? 1 : 0,
            borderColor: isDark ? "#1F2937" : "transparent",
          }}
        >
          {icon}
        </View>
        <Text
          style={{
            fontSize: 16,
            fontWeight: "700",
            color: isDark ? "#F3F4F6" : "#0F172A",
          }}
        >
          {label}
        </Text>
      </View>

      <Ionicons
        name="chevron-forward"
        size={18}
        color={isDark ? "#C7D2FE" : "#1E3A8A"}
      />
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const s = getStyles(isDark);

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

  const user = auth.currentUser;

  // ---- NEW: live user doc (for profileImageUri + displayName) ----
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  useEffect(() => {
    if (!user?.uid || !db) return;
    const ref = doc(db, "users", user.uid);
    const unsub = onSnapshot(ref, (snap) => {
      setUserDoc((snap.data() as UserDoc) || null);
    });
    return unsub;
  }, [user?.uid]);

  // Prefer Firestore displayName, then auth.displayName, then email prefix
  const displayName =
    userDoc?.displayName ||
    user?.displayName ||
    user?.email?.split("@")[0] ||
    "User";

  const email = user?.email || "—";

  const initials = useMemo(() => {
    const base = displayName || user?.email || "U";
    return base
      .split(/\s+|@/g)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() || "")
      .join("");
  }, [displayName, user?.email]);

  // Prefer Firestore image; fall back to auth.photoURL if you use it
  const profileImageUri = userDoc?.profileImageUri || user?.photoURL || null;

  const handleLogout = async () => {
    Alert.alert("Sign out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut(auth);
          } catch {
            Alert.alert("Error", "Please try again.");
          }
        },
      },
    ]);
  };

  const editProfile = () => {
    if (auth.currentUser) router.push("/editProfile");
  };

  return (
    <SafeAreaView style={s.screen}>
      {/* crossfade layers */}
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "#F8FAFC" }]} />
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "#0F172A", opacity: themeAnim },
        ]}
      />

      <ScrollView
        style={s.scrollView}
        contentContainerStyle={s.scrollContent}
        indicatorStyle={isDark ? "white" : "black"}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header bar with pills */}
        <View style={s.headerBar}>
          <Text style={s.headerTitle}>Profile</Text>
          <View style={{ flexDirection: "row", gap: 10 }}>
            <TouchableOpacity
              onPress={editProfile}
              style={s.smallGreyBtn}
              accessibilityLabel="Edit profile"
            >
              <Ionicons
                name="create-outline"
                size={18}
                color={isDark ? "#E5E7EB" : "#111827"}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={toggleTheme}
              style={s.smallGreyBtn}
              accessibilityLabel="Toggle theme"
            >
              <Ionicons
                name={isDark ? "sunny-outline" : "moon-outline"}
                size={18}
                color={isDark ? "#FDE68A" : "#111827"}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.contentWrap}>
          {/* Profile card */}
          <View style={s.profileCard}>
            {profileImageUri ? (
              <Image source={{ uri: profileImageUri }} style={s.avatarImg} />
            ) : (
              <View style={s.avatar}>
                <Text style={s.avatarText}>{initials || "U"}</Text>
              </View>
            )}

            <View style={{ flex: 1 }}>
              {/* displayName above email */}
              <Text style={s.nameText} numberOfLines={1}>
                {displayName}
              </Text>
              <Text style={s.emailText} numberOfLines={1}>
                {email}
              </Text>
            </View>
          </View>

          {/* Primary actions */}
          <TouchableOpacity
            style={s.primaryBtn}
            onPress={editProfile}
            activeOpacity={0.9}
          >
            <Ionicons name="person-circle-outline" size={18} color="#fff" />
            <Text style={s.primaryBtnText}>Edit Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[s.primaryBtn, s.logoutBtn]}
            onPress={handleLogout}
            activeOpacity={0.9}
          >
            <Ionicons name="log-out-outline" size={18} color="#fff" />
            <Text style={s.primaryBtnText}>Sign Out</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={s.primaryBtn}
            onPress={() => router.push("/deleteAccount")}
            activeOpacity={0.9}
          >
            <Ionicons name="person-circle-outline" size={18} color="#fff" />
            <Text style={s.primaryBtnText}>Delete Account</Text>
          </TouchableOpacity>

          {/* Secondary action */}
          <TouchableOpacity
            style={s.secondaryBtn}
            onPress={toggleTheme}
            activeOpacity={0.9}
          >
            <Ionicons
              name={isDark ? "sunny-outline" : "moon-outline"}
              size={16}
              color={isDark ? "#FDE68A" : "#111827"}
            />
            <Text
              style={[
                s.secondaryBtnText,
                { color: isDark ? "#F3F4F6" : "#111827" },
              ]}
            >
              Toggle Theme
            </Text>
          </TouchableOpacity>

          {/* Settings */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Settings</Text>

            <SettingsRow
              label="Privacy Policy"
              onPress={() => router.push("/privacyPolicy")}
              isDark={isDark}
              icon={
                <Ionicons
                  name="shield-checkmark-outline"
                  size={16}
                  color={isDark ? "#E5E7EB" : "#111827"}
                />
              }
            />
            <SettingsRow
              label="Terms of Use"
              onPress={() => router.push("/termsOfUse")}
              isDark={isDark}
              icon={
                <Ionicons
                  name="document-text-outline"
                  size={16}
                  color={isDark ? "#E5E7EB" : "#111827"}
                />
              }
            />
            <SettingsRow
              label="Help & Support"
              onPress={() => router.push("/helpAndSupport")}
              isDark={isDark}
              icon={
                <Ionicons
                  name="help-buoy-outline"
                  size={16}
                  color={isDark ? "#E5E7EB" : "#111827"}
                />
              }
            />

            <SettingsRow
              label="About"
              onPress={() => router.push("/about")}
              isDark={isDark}
              icon={
                <Ionicons
                  name="information-circle-outline"
                  size={16}
                  color={isDark ? "#E5E7EB" : "#111827"}
                />
              }
            />
            <SettingsRow
              label="Contact Us"
              onPress={() => router.push("/contactUs")}
              isDark={isDark}
              icon={
                <Ionicons
                  name="mail-outline"
                  size={16}
                  color={isDark ? "#E5E7EB" : "#111827"}
                />
              }
            />
            <SettingsRow
              label="Add New Building"
              onPress={() => router.push("/addNewBuilding")}
              isDark={isDark}
              icon={
                <Ionicons
                  name="mail-outline"
                  size={16}
                  color={isDark ? "#E5E7EB" : "#111827"}
                />
              }
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
    },
    scrollView: {
      flex: 1,
      backgroundColor: "transparent",
    },
    scrollContent: {
      flexGrow: 1,
      padding: 16,
      paddingBottom: 28,
    },

    /* Header */
    headerBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 4,
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

    contentWrap: {
      gap: 12,
    },

    /* Profile card */
    profileCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
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
    // Existing fallback avatar
    avatar: {
      width: 56,
      height: 56,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "#0B1220" : "#E5E7EB",
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#1F2937" : "transparent",
    },
    // NEW: image style (same sizing as avatar)
    avatarImg: {
      width: 56,
      height: 56,
      borderRadius: 12,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#1F2937" : "transparent",
    },
    avatarText: {
      fontSize: 18,
      fontWeight: "800",
      color: isDark ? "#E5E7EB" : "#111827",
      letterSpacing: 0.3,
    },
    nameText: {
      fontSize: 18,
      fontWeight: "800",
      color: isDark ? "#F3F4F6" : "#0F172A",
    },
    emailText: {
      marginTop: 2,
      fontSize: 13,
      fontWeight: "600",
      color: isDark ? "#9CA3AF" : "#4B5563",
    },

    /* Buttons */
    primaryBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: isDark ? "#2563EB" : "#1D4ED8",
      paddingVertical: 14,
      borderRadius: 12,
      width: "100%",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
      elevation: 3,
    },
    logoutBtn: {
      backgroundColor: isDark ? "#B91C1C" : "#DC2626",
    },
    primaryBtnText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "800",
      letterSpacing: 0.3,
    },

    secondaryBtn: {
      marginTop: 6,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      backgroundColor: isDark ? "#111827" : "#E5E7EB",
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#1F2937" : "transparent",
      paddingVertical: 12,
      borderRadius: 12,
      width: "100%",
    },
    secondaryBtnText: {
      fontSize: 14,
      fontWeight: "800",
    },

    /* Section */
    section: {
      marginTop: 18,
      width: "100%",
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: isDark ? "#1F2937" : "#E5E7EB",
      paddingTop: 12,
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: "800",
      marginBottom: 8,
      color: isDark ? "#C7D2FE" : "#1E3A8A",
      letterSpacing: 0.2,
    },
  });

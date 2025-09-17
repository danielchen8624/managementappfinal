import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
  Image,
  Platform,
  Animated,
  Easing,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { db, auth } from "../../firebaseConfig";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../ThemeContext";
import { Ionicons } from "@expo/vector-icons";

type UserDoc = {
  firstName?: string;
  lastName?: string;
  birthday?: string;
  employeeId?: string;
  profileImageUri?: string | null;
  email?: string;
  displayName?: string;
};

function EditProfile() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const styles = getStyles(isDark);

  const userId = auth.currentUser?.uid || null;

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(true);
  const [saving, setSaving] = useState(false);

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

  // Load existing user doc once
  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!userId) {
        setLoadingDoc(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", userId));
        const data = (snap.data() as UserDoc) || {};
        if (!mounted) return;
        setFirstName(data.firstName || "");
        setLastName(data.lastName || "");
        setBirthday(data.birthday || "");
        setEmployeeId(data.employeeId || "");
        setProfileImage(data.profileImageUri || null);
      } catch (e) {
        console.error(e);
        Alert.alert("Error", "Failed to load your profile.");
      } finally {
        if (mounted) setLoadingDoc(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [userId]);

  const currentDisplayName =
    auth.currentUser?.displayName ||
    [firstName, lastName].filter(Boolean).join(" ") ||
    auth.currentUser?.email?.split("@")[0] ||
    "User";

  const initials = useMemo(() => {
    const src =
      currentDisplayName ||
      auth.currentUser?.email ||
      `${firstName} ${lastName}` ||
      "U";
    return src
      .split(/\s+|@/g)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase() || "")
      .join("");
  }, [currentDisplayName, firstName, lastName]);

  // ✅ Ask permission BEFORE opening the picker + try/catch guard
  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission required",
          "We need access to your photo library."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        setProfileImage(result.assets[0].uri);
      }
    } catch (err: any) {
      console.error("Image picker error:", err);
      Alert.alert("Error", err?.message || "Could not open photo library.");
    }
  };

  // ✅ New: Take photo with camera permission flow
  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission required",
          "We need camera access to take a photo."
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.9,
      });

      if (!result.canceled) {
        setProfileImage(result.assets[0].uri);
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      Alert.alert("Error", err?.message || "Could not open camera.");
    }
  };

  const hasChanges = useMemo(() => {
    if (loadingDoc) return false;
    return true;
  }, [loadingDoc, firstName, lastName, birthday, employeeId, profileImage]);

  const updateUser = async () => {
    if (!userId) {
      Alert.alert("Not signed in", "Please sign in again.");
      return;
    }
    try {
      setSaving(true);
      await setDoc(
        doc(db, "users", userId),
        {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          birthday: birthday.trim(),
          employeeId: employeeId.trim().toUpperCase(),
          profileImageUri: profileImage || null,
          displayName:
            firstName.trim() || lastName.trim()
              ? `${firstName.trim()} ${lastName.trim()}`.trim()
              : auth.currentUser?.displayName || null,
          email: auth.currentUser?.email || null,
        } as UserDoc,
        { merge: true }
      );
      Alert.alert("Saved", "Your profile was updated.");
      router.back();
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Please try again.");
    } finally {
      setSaving(false);
    }
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
        <View style={{ flexDirection: "row", gap: 10 }}>
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

          <TouchableOpacity
            onPress={toggleTheme}
            style={styles.smallGreyBtn}
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

        <Text style={styles.headerTitle}>Edit Profile</Text>

        <View style={{ width: 36, height: 36 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={{ flex: 1 }}
      >
        {loadingDoc ? (
          <View style={styles.loaderWrap}>
            <ActivityIndicator />
            <Text style={styles.loaderText}>Loading…</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
          >
            {/* Profile card w/ avatar */}
            <View style={styles.card}>
              <View style={styles.avatarWrap}>
                {profileImage ? (
                  <Image
                    source={{ uri: profileImage }}
                    style={styles.avatarImg}
                  />
                ) : (
                  <View style={styles.avatarFallback}>
                    <Text style={styles.avatarText}>{initials || "U"}</Text>
                  </View>
                )}

                {/* Actions: choose or take */}
                <View style={styles.photoActionsRow}>
                  <TouchableOpacity
                    style={[
                      styles.photoBtn,
                      { backgroundColor: isDark ? "#2563EB" : "#1D4ED8" },
                    ]}
                    onPress={pickImage}
                    activeOpacity={0.9}
                  >
                    <Ionicons name="image-outline" size={14} color="#fff" />
                    <Text style={styles.photoBtnText}>Choose photo</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.photoBtn,
                      { backgroundColor: isDark ? "#0EA5E9" : "#0284C7" },
                    ]}
                    onPress={takePhoto}
                    activeOpacity={0.9}
                  >
                    <Ionicons name="camera-outline" size={14} color="#fff" />
                    <Text style={styles.photoBtnText}>Take photo</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Inputs */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>First name</Text>
                <TextInput
                  placeholder="First name"
                  value={firstName}
                  onChangeText={(v) => setFirstName(v)}
                  style={[
                    styles.input,
                    {
                      backgroundColor: isDark ? "#111827" : "#FFFFFF",
                      borderColor: isDark ? "#1F2937" : "#E5E7EB",
                      color: isDark ? "#E5E7EB" : "#111827",
                    },
                  ]}
                  placeholderTextColor={isDark ? "#9CA3AF" : "#9AA1AA"}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Last name</Text>
                <TextInput
                  placeholder="Last name"
                  value={lastName}
                  onChangeText={(v) => setLastName(v)}
                  style={[
                    styles.input,
                    {
                      backgroundColor: isDark ? "#111827" : "#FFFFFF",
                      borderColor: isDark ? "#1F2937" : "#E5E7EB",
                      color: isDark ? "#E5E7EB" : "#111827",
                    },
                  ]}
                  placeholderTextColor={isDark ? "#9CA3AF" : "#9AA1AA"}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Date of birth</Text>
                <TextInput
                  placeholder="YYYY-MM-DD"
                  value={birthday}
                  onChangeText={(v) => setBirthday(v)}
                  style={[
                    styles.input,
                    {
                      backgroundColor: isDark ? "#111827" : "#FFFFFF",
                      borderColor: isDark ? "#1F2937" : "#E5E7EB",
                      color: isDark ? "#E5E7EB" : "#111827",
                    },
                  ]}
                  placeholderTextColor={isDark ? "#9CA3AF" : "#9AA1AA"}
                  keyboardType="numbers-and-punctuation"
                  returnKeyType="next"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Employee ID</Text>
                <TextInput
                  placeholder="EMP123"
                  value={employeeId}
                  onChangeText={(v) => setEmployeeId(v.toUpperCase())}
                  style={[
                    styles.input,
                    {
                      backgroundColor: isDark ? "#111827" : "#FFFFFF",
                      borderColor: isDark ? "#1F2937" : "#E5E7EB",
                      color: isDark ? "#E5E7EB" : "#111827",
                    },
                  ]}
                  placeholderTextColor={isDark ? "#9CA3AF" : "#9AA1AA"}
                  autoCapitalize="characters"
                  returnKeyType="done"
                />
              </View>

              <TouchableOpacity
                onPress={updateUser}
                disabled={!hasChanges || saving}
                style={[
                  styles.saveBtn,
                  {
                    backgroundColor:
                      !hasChanges || saving
                        ? isDark
                          ? "#1E3A8A"
                          : "#93C5FD"
                        : isDark
                        ? "#2563EB"
                        : "#1D4ED8",
                    opacity: !hasChanges || saving ? 0.9 : 1,
                  },
                ]}
                activeOpacity={0.9}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={18} color="#fff" />
                    <Text style={styles.saveBtnText}>Save changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export default EditProfile;

const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
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
      fontSize: 20,
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

    loaderWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingBottom: 40,
    },
    loaderText: {
      marginTop: 8,
      color: isDark ? "#CBD5E1" : "#475569",
    },

    /* Scroll area */
    scrollContainer: {
      paddingHorizontal: 16,
      paddingBottom: 28,
      paddingTop: 8,
      alignItems: "stretch",
      gap: 12,
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

    avatarWrap: {
      alignItems: "center",
      marginTop: 6,
      marginBottom: 12,
      width: "100%",
    },
    avatarImg: {
      width: 96,
      height: 96,
      borderRadius: 16,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#1F2937" : "transparent",
    },
    avatarFallback: {
      width: 96,
      height: 96,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "#0B1220" : "#E5E7EB",
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#1F2937" : "transparent",
    },
    avatarText: {
      fontSize: 28,
      fontWeight: "900",
      color: isDark ? "#E5E7EB" : "#111827",
      letterSpacing: 0.4,
    },

    photoActionsRow: {
      marginTop: 10,
      flexDirection: "row",
      gap: 8,
      justifyContent: "center",
      alignItems: "center",
      width: "100%",
    },
    photoBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
    },
    photoBtnText: {
      color: "#fff",
      fontWeight: "800",
      fontSize: 12,
      letterSpacing: 0.2,
    },

    fieldGroup: {
      marginTop: 8,
    },
    label: {
      fontSize: 12,
      fontWeight: "800",
      marginBottom: 6,
      color: isDark ? "#C7D2FE" : "#1E3A8A",
      letterSpacing: 0.2,
    },
    input: {
      borderWidth: 1,
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 12,
      fontSize: 16,
    },

    saveBtn: {
      marginTop: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 14,
      borderRadius: 12,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
      elevation: 3,
    },
    saveBtnText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "800",
      letterSpacing: 0.3,
    },
  });

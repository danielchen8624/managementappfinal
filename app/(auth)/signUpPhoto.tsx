import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Animated,
  Easing,
  StyleProp,
  ViewStyle,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { auth, db } from "../../firebaseConfig";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { router } from "expo-router";
import { useTheme } from "../ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import { signOut } from "firebase/auth";

export default function SignUpPhoto() {
  const uid = auth.currentUser?.uid || null;

  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const s = getStyles(isDark);

  const themeAnim = useRef(new Animated.Value(isDark ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(themeAnim, {
      toValue: isDark ? 1 : 0,
      duration: 220,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    }).start();
  }, [isDark, themeAnim]);

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "We need access to your photo library."
      );
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (!res.canceled) setImageUri(res.assets[0].uri);
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission required",
        "We need camera access to take a photo."
      );
      return;
    }
    const res = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (!res.canceled) setImageUri(res.assets[0].uri);
  };

  const handleExit = async () => {
    try {
      await signOut(auth);
      router.replace("/(auth)/selectLogin");
    } catch (e: any) {
      Alert.alert("Couldn’t exit", e?.message || "Try again.");
    }
  };

  const save = async () => {
    if (!uid) {
      Alert.alert("Not signed in", "Please verify your email first.");
      return;
    }
    if (!imageUri) {
      Alert.alert("No photo", "Please select or take a photo.");
      return;
    }
    setUploading(true);
    try {
      await setDoc(
        doc(db, "users", uid),
        {
          profileImageUri: imageUri,
          signup_stage: "complete",
          signup_complete: true,
          completedAt: serverTimestamp(),
        },
        { merge: true }
      );

      Alert.alert("Account created!", "You're all set.", [
        { text: "OK", onPress: () => router.replace("/home") },
      ]);
    } catch (e: any) {
      console.error(e);
      Alert.alert("Save failed", e?.message || "Try again.");
    } finally {
      setUploading(false);
    }
  };

  if (!uid) {
    return (
      <SafeAreaView style={s.container}>
        <View
          style={[s.fill, { alignItems: "center", justifyContent: "center" }]}
        >
          <Text style={{ color: isDark ? "#E5E7EB" : "#111827" }}>
            You need to verify your email first.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: "#F8FAFC" }]} />
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "#0F172A", opacity: themeAnim },
        ]}
      />

      <View style={s.headerBar}>
        {/* Exit (sign out) */}
        <TouchableOpacity
          onPress={handleExit}
          style={s.smallGreyBtn}
          accessibilityLabel="Exit onboarding"
        >
          <Ionicons
            name="close-outline"
            size={20}
            color={isDark ? "#E5E7EB" : "#111827"}
          />
        </TouchableOpacity>

        <Text style={s.headerTitle}>Add Profile Photo</Text>

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

      <View style={s.body}>
        <View style={s.card}>
          <Text style={s.title}>Let’s put a face to your name</Text>
          <Text style={s.subTitle}>
            Upload a clear photo of your face. You can choose one from your
            library or take a new one.
          </Text>

          <View style={s.previewWrap}>
            <View style={[s.ring, ringShadow(isDark)] as StyleProp<ViewStyle>}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={s.previewImg} />
              ) : (
                <View style={[s.previewImg, s.previewPlaceholder]}>
                  <Ionicons
                    name="person-circle-outline"
                    size={64}
                    color={isDark ? "#64748B" : "#94A3B8"}
                  />
                  <Text style={s.previewText}>No photo selected</Text>
                </View>
              )}
            </View>
          </View>

          <View style={s.actionsRow}>
            <TouchableOpacity
              style={[
                s.actionBtn,
                { backgroundColor: isDark ? "#111827" : "#FFFFFF" },
              ]}
              onPress={pickFromLibrary}
              activeOpacity={0.9}
            >
              <Ionicons
                name="image-outline"
                size={18}
                color={isDark ? "#E5E7EB" : "#111827"}
              />
              <Text
                style={[
                  s.actionBtnText,
                  { color: isDark ? "#E5E7EB" : "#111827" },
                ]}
              >
                Choose Photo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                s.actionBtn,
                { backgroundColor: isDark ? "#111827" : "#FFFFFF" },
              ]}
              onPress={takePhoto}
              activeOpacity={0.9}
            >
              <Ionicons
                name="camera-outline"
                size={18}
                color={isDark ? "#E5E7EB" : "#111827"}
              />
              <Text
                style={[
                  s.actionBtnText,
                  { color: isDark ? "#E5E7EB" : "#111827" },
                ]}
              >
                Take Photo
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              s.primaryBtn,
              {
                backgroundColor:
                  imageUri && !uploading
                    ? isDark
                      ? "#2563EB"
                      : "#1D4ED8"
                    : isDark
                    ? "#1E3A8A"
                    : "#93C5FD",
              },
            ]}
            disabled={!imageUri || uploading}
            onPress={save}
            activeOpacity={0.9}
          >
            {uploading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={18}
                  color="#fff"
                />
                <Text style={s.primaryBtnText}>Finish</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={s.helperText}>
            You can change your photo any time in Profile.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

function ringShadow(isDark: boolean): ViewStyle {
  return {
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  };
}

const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? "#0F172A" : "#F8FAFC" },
    fill: { flex: 1 },
    headerBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 8,
    },
    headerTitle: {
      fontSize: 18,
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
    body: { flex: 1, paddingHorizontal: 16, paddingBottom: 20 },
    card: {
      marginTop: 8,
      backgroundColor: isDark ? "#1F2937" : "#FFFFFF",
      borderRadius: 16,
      padding: 16,
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 6,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#111827" : "transparent",
    },
    title: {
      fontSize: 20,
      fontWeight: "800",
      color: isDark ? "#F3F4F6" : "#0F172A",
    },
    subTitle: {
      marginTop: 6,
      color: isDark ? "#CBD5E1" : "#475569",
      fontSize: 14,
    },
    previewWrap: {
      marginTop: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    ring: {
      width: 190,
      height: 190,
      borderRadius: 100,
      padding: 6,
      backgroundColor: isDark ? "#0B1220" : "#EFF6FF",
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#1F2937" : "transparent",
    },
    previewImg: {
      width: "100%",
      height: "100%",
      borderRadius: 94,
      backgroundColor: isDark ? "#111827" : "#FFFFFF",
      overflow: "hidden",
    },
    previewPlaceholder: {
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: isDark ? "#1F2937" : "#E5E7EB",
    },
    previewText: {
      marginTop: 6,
      color: isDark ? "#9CA3AF" : "#94A3B8",
      fontWeight: "700",
    },
    actionsRow: { flexDirection: "row", gap: 12, marginTop: 14 },
    actionBtn: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? "#1F2937" : "#E5E7EB",
    },
    actionBtnText: { fontWeight: "800" },
    primaryBtn: {
      marginTop: 16,
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
    primaryBtnText: {
      color: "#fff",
      fontSize: 16,
      fontWeight: "800",
      letterSpacing: 0.3,
    },
    helperText: {
      marginTop: 10,
      textAlign: "center",
      color: isDark ? "#94A3B8" : "#64748B",
      fontSize: 12,
      fontWeight: "600",
    },
  });

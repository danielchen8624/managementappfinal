import React, { useState, useEffect } from "react";
import {
  Text,
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import {
  addDoc,
  collection,
  serverTimestamp,
  doc,
  updateDoc,
  query,
  where,
  limit,
  getDocs,
} from "firebase/firestore";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { db, auth } from "../../firebaseConfig";
import ProjectModal from "../(components)/taskModal";
import ReportModal from "../(components)/reportModal";
import ManagerViewReportsModal from "../(components)/managerViewReportModal";
import CurrentTaskModal from "../(components)/currentTaskModal";
import { router } from "expo-router";
import { useUser } from "../UserContext";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
import { useTheme } from "../ThemeContext";
import { useShiftTimer } from "../(hooks)/secondsCounter";

function HomePage() {
  const [taskModal, setTaskModal] = useState(false);
  const [reportModal, setReportModal] = useState(false);
  const [currentTaskModal, setCurrentTaskModal] = useState(false);
  const [managerViewReportModal, setManagerViewReportModal] = useState(false);
  const [currentShiftId, setCurrentShiftId] = useState("");
  const { role, loading } = useUser();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const styles = getStyles(isDark);
  const uid = auth.currentUser?.uid;
  const { running, hhmmss } = useShiftTimer(uid); // new

  // --- AsyncStorage helpers. allows clocking to work even if app is restarted --- //
  const shiftKey = (uid: string) => `currentShiftId:${uid}`;
  const saveShiftId = async (uid: string, id: string) => {
    try {
      await AsyncStorage.setItem(shiftKey(uid), id);
    } catch {}
  };
  const loadShiftId = async (uid: string) => {
    // new
    try {
      return await AsyncStorage.getItem(shiftKey(uid));
    } catch {
      return null;
    }
  };
  const clearShiftId = async (uid: string) => {
    // new
    try {
      await AsyncStorage.removeItem(shiftKey(uid));
    } catch {}
  };

  // Restore shift state on mount and when user changes
  useEffect(() => {
    (async () => {
      if (!uid) return;
      const stored = await loadShiftId(uid);
      if (stored) {
        // new
        setCurrentShiftId(stored);
        return;
      }
      // Fallback: query Firestore for any open shift if storage empty
      const q = query(
        collection(db, "users", uid, "shifts"),
        where("clockOut", "==", null),
        limit(1)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        // new
        const openId = snap.docs[0].id;
        setCurrentShiftId(openId);
        await saveShiftId(uid, openId);
      }
    })();
  }, [uid]);

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }
  //-----------------------   HANDLE CLOCK IN FUNCTION -------------------------------------------------------------------

  const handleClockIn = async () => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      Alert.alert("Please Sign In.");
      return;
    }
    if (!currentShiftId) {
      // Clock in
      const docRef = await addDoc(collection(db, "users", uid, "shifts"), {
        clockIn: serverTimestamp(),
        clockOut: null,
      });
      await updateDoc(doc(db, "users", uid), {
        onShift: true,
        openShiftId: docRef.id,
      });

      setCurrentShiftId(docRef.id);
      await saveShiftId(uid, docRef.id); // persist to asyncstorage
      Alert.alert("Clocked In!");
    } else {
      // Clock out
      await updateDoc(doc(db, "users", uid, "shifts", currentShiftId), {
        clockOut: serverTimestamp(),
        shiftDuration: hhmmss,
      });
      await updateDoc(doc(db, "users", uid), {
        onShift: false,
        openShiftId: null,
      });
      setCurrentShiftId("");
      await clearShiftId(uid); // removes from asynctorage
      Alert.alert("Clocked Out!");
    }
  };
  //--------------------------------------------------------------------------------------------------------------------

  return (
    <View style={styles.container}>
      <Text style={styles.welcomeText}>Welcome{role ? `, ${role}` : ""}!</Text>

      {role === "manager" && (
        <TouchableOpacity
          onPress={() => router.push("/requestHistory")}
          style={styles.grayButton}
        >
          <MaterialIcons
            name="history"
            size={20}
            color="white"
            style={styles.icon}
          />
          <Text style={styles.buttonText}>View Request History</Text>
        </TouchableOpacity>
      )}

      {role === "manager" && (
        <>
          {/* manage Employees button*/}
          <TouchableOpacity
            onPress={() => router.push("/manageEmployees")}
            style={styles.purpleButton}
          >
            <Ionicons
              name="people"
              size={20}
              color="white"
              style={styles.icon}
            />
            <Text style={styles.buttonText}>Manage Employees</Text>
          </TouchableOpacity>

          {/* add task button*/}

          <TouchableOpacity
            onPress={() => setTaskModal(true)}
            style={styles.primaryButton}
          >
            <FontAwesome5
              name="project-diagram"
              size={18}
              color="white"
              style={styles.icon}
            />
            <Text style={styles.buttonText}>Add New Task</Text>
          </TouchableOpacity>
          {/* submit reports button */}

          <TouchableOpacity
            onPress={() => setManagerViewReportModal(true)}
            style={styles.primaryButton}
          >
            <Text style={styles.buttonText}>View Reports</Text>
          </TouchableOpacity>
        </>
      )}
      {/*scheduler*/}
      <TouchableOpacity
            onPress={() => router.push("/scheduler")}
            style={styles.purpleButton}
          >
            <Ionicons
              name="people"
              size={20}
              color="white"
              style={styles.icon}
            />
            <Text style={styles.buttonText}>Scheduler</Text>
          </TouchableOpacity>

      {role === "employee" && (
        <>
          <TouchableOpacity
            onPress={handleClockIn}
            style={styles.primaryButton}
          >
            <Text style={styles.buttonText}>
              {currentShiftId ? "Clock Out" : "Clock In"}
            </Text>
          </TouchableOpacity>

          {/** Timer display under the button **/}
          {running ? ( // new
            <Text style={styles.timerText}>On shift: {hhmmss}</Text> // new
          ) : (
            // new
            <Text style={styles.timerTextMuted}>Not clocked in</Text> // new
          )}

          <TouchableOpacity
            onPress={() => setCurrentTaskModal(true)}
            style={styles.primaryButton}
          >
            <MaterialIcons
              name="assignment"
              size={20}
              color="white"
              style={styles.icon}
            />
            <Text style={styles.buttonText}>View Current Task</Text>
          </TouchableOpacity>
          {/* submit reports button */}

          <TouchableOpacity
            onPress={() => setReportModal(true)}
            style={[styles.reportButton, isDark && styles.reportButtonDark]}
            activeOpacity={0.85}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcons
              name="report-problem"
              size={20}
              color={isDark ? "#0B1220" : "#FFFFFF"}
              style={styles.reportIcon}
            />
            <Text
              style={[
                styles.reportButtonText,
                isDark && styles.reportButtonTextDark,
              ]}
            >
              Report Issue
            </Text>
          </TouchableOpacity>
        </>
      )}

      {/* Modals */}
      {taskModal && (
        <ProjectModal visible={taskModal} onClose={() => setTaskModal(false)} />
      )}
      {currentTaskModal && (
        <CurrentTaskModal
          visible={currentTaskModal}
          onClose={() => setCurrentTaskModal(false)}
        />
      )}
      {reportModal && (
        <ReportModal
          visible={reportModal}
          onClose={() => setReportModal(false)}
        />
      )}

      {managerViewReportModal && (
        <ManagerViewReportsModal
          visible={managerViewReportModal}
          onClose={() => setManagerViewReportModal(false)}
        />
      )}

      {/* Navigation Buttons */}
    </View>
  );
}

export default HomePage;

const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: isDark ? "#111827" : "#F9FAFB",
      paddingHorizontal: 24,
      paddingTop: 80,
      alignItems: "center",
    },
    welcomeText: {
      fontSize: 24,
      fontWeight: "700",
      marginBottom: 32,
      color: isDark ? "#E5E7EB" : "#111827",
    },
    primaryButton: {
      flexDirection: "row",
      backgroundColor: "#2563EB",
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 12,
      alignItems: "center",
      marginBottom: 12, // new (slightly tighter to make room for timer)
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    grayButton: {
      flexDirection: "row",
      backgroundColor: "#4B5563",
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 12,
      alignItems: "center",
      marginBottom: 16,
      elevation: 2,
    },
    purpleButton: {
      flexDirection: "row",
      backgroundColor: "#7C3AED",
      paddingVertical: 14,
      paddingHorizontal: 24,
      borderRadius: 12,
      alignItems: "center",
      marginBottom: 16,
      elevation: 2,
    },
    buttonText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "600",
    },
    icon: {
      marginRight: 10,
    },
    loadingText: {
      marginTop: 10,
      fontSize: 16,
      color: isDark ? "#D1D5DB" : "#6B7280",
    },
    reportButton: {
      flexDirection: "row",
      alignItems: "center",
      alignSelf: "center",
      gap: 8,
      paddingVertical: 12,
      paddingHorizontal: 18,
      borderRadius: 12,
      backgroundColor: "#EF4444", // red-500
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 6,
      elevation: 5,
      marginTop: 4, // new
    },
    reportButtonDark: {
      backgroundColor: "#F87171", // red-400 for better contrast on dark bg
    },
    reportIcon: {
      marginRight: 6,
    },
    reportButtonText: {
      color: "#FFFFFF",
      fontSize: 15,
      fontWeight: "700",
      letterSpacing: 0.3,
    },
    reportButtonTextDark: {
      color: "#0B1220", // very dark blue-gray for contrast on lighter red
      fontWeight: "800",
    },
    timerText: {
      // new
      marginBottom: 16, // new
      fontSize: 16, // new
      fontWeight: "700", // new
      color: isDark ? "#E5E7EB" : "#111827", // new
    }, // new
    timerTextMuted: {
      // new
      marginBottom: 16, // new
      fontSize: 14, // new
      color: isDark ? "#9CA3AF" : "#6B7280", // new
      fontStyle: "italic", // new
    }, // new
  });

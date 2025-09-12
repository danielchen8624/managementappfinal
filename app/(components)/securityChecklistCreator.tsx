// app/(manager)/securityChecklistCreator.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../ThemeContext";
import { useBuilding } from "../BuildingContext";
import { db } from "../../firebaseConfig";
import {
  collection,
  writeBatch,
  doc,
  serverTimestamp,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

/* ---------------------------- Types & helpers ---------------------------- */

type ChecklistItem = {
  id: string;          // Firestore id OR temp_ id for unsaved items
  place: string;
  description: string;
  order: number;
  active?: boolean;
};

const makeTempId = () =>
  `temp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

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
      Tap “Add item” to start your security checklist.
    </Text>
  </View>
);

/* ---------------------------- Add Item Modal ---------------------------- */

type AddItemModalProps = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (payload: { place: string; description: string }) => void;
  isDark: boolean;
};

const AddItemModal: React.FC<AddItemModalProps> = ({
  visible,
  onClose,
  onSubmit,
  isDark,
}) => {
  const [place, setPlace] = useState("");
  const [description, setDescription] = useState("");

  const reset = () => {
    setPlace("");
    setDescription("");
  };

  const handleAdd = () => {
    const p = place.trim();
    const d = description.trim();
    if (!p) {
      Alert.alert("Missing Place", "Please provide a place (e.g., Lobby, Gym).");
      return;
    }
    onSubmit({ place: p, description: d });
    reset();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={modalStyles.overlay}
      >
        <View
          style={[
            modalStyles.sheet,
            { backgroundColor: isDark ? "#0F172A" : "#FFFFFF" },
          ]}
        >
          <View style={modalStyles.headerRow}>
            <Text
              style={[
                modalStyles.headerText,
                { color: isDark ? "#E5E7EB" : "#111827" },
              ]}
            >
              Add Checklist Item
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ fontSize: 24, color: isDark ? "#93A4B3" : "#6B7280" }}>×</Text>
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            <Text
              style={[
                modalStyles.label,
                { color: isDark ? "#CBD5E1" : "#374151" },
              ]}
            >
              Place
            </Text>
            <TextInput
              value={place}
              onChangeText={setPlace}
              placeholder='e.g., "Security Room", "Lobby", "Parking Level P1"'
              placeholderTextColor="#9CA3AF"
              style={[
                modalStyles.input,
                {
                  backgroundColor: isDark ? "#111827" : "#FFFFFF",
                  borderColor: isDark ? "#1F2937" : "#E5E7EB",
                  color: isDark ? "#F9FAFB" : "#111827",
                },
              ]}
            />

            <Text
              style={[
                modalStyles.label,
                { color: isDark ? "#CBD5E1" : "#374151" },
              ]}
            >
              Description (optional)
            </Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What should be checked / verified?"
              placeholderTextColor="#9CA3AF"
              multiline
              style={[
                modalStyles.input,
                {
                  height: 110,
                  textAlignVertical: "top",
                  backgroundColor: isDark ? "#111827" : "#FFFFFF",
                  borderColor: isDark ? "#1F2937" : "#E5E7EB",
                  color: isDark ? "#F9FAFB" : "#111827",
                },
              ]}
            />
          </ScrollView>

          <TouchableOpacity style={modalStyles.submitButton} onPress={handleAdd}>
            <Text style={modalStyles.submitText}>Add</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

/* ------------------------- Main Screen Component ------------------------ */

const SecurityChecklistCreator: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const styles = getStyles(isDark);
  const { buildingId } = useBuilding();

  const [items, setItems] = useState<ChecklistItem[]>([]);
  const originalRef = useRef<ChecklistItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const dirtyRef = useRef(false);
  useEffect(() => { dirtyRef.current = dirty; }, [dirty]);

  const disabledUI = !buildingId;

  // Live subscription like scheduler.tsx
  useEffect(() => {
    setItems([]);
    originalRef.current = [];
    setLoading(true);
    setDirty(false);

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
        // Avoid stomping local unsaved edits
        if (dirtyRef.current) return;

        const arr: ChecklistItem[] = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            place: typeof data.place === "string" ? data.place : "Untitled",
            description: typeof data.description === "string" ? data.description : "",
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

  const markDirty = () => setDirty(true);

  const addItem = (payload: { place: string; description: string }) => {
    setItems((prev) => [
      ...prev,
      {
        id: makeTempId(), // temp id until saved
        place: payload.place,
        description: payload.description,
        order: prev.length, // append
        active: true,
      },
    ]);
    markDirty();
  };

  const deleteItem = (id: string) => {
    setItems((prev) =>
      prev
        .filter((it) => it.id !== id)
        .map((it, idx) => ({ ...it, order: idx }))
    );
    markDirty();
  };

  const clearAll = () => {
    Alert.alert("Clear all items?", "This will reset the checklist (unsaved).", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () => {
          setItems([]);
          markDirty();
        },
      },
    ]);
  };

  const saveList = async () => {
    if (!buildingId) {
      Alert.alert("Select a building first.");
      return;
    }
    try {
      setSaving(true);

      const batch = writeBatch(db);
      const baseCol = collection(
        db,
        "buildings",
        buildingId,
        "security_checklist_scheduler"
      );

      const orig = originalRef.current;
      const curr = items;

      const currIds = new Set(curr.map((i) => i.id));

      // Deletes: anything in orig not present now
      for (const it of orig) {
        if (!currIds.has(it.id)) {
          batch.delete(doc(baseCol, it.id));
        }
      }

      // Upserts with canonical order
      curr.forEach((it, idx) => {
        const isTemp = it.id.startsWith("temp_");
        const ref = isTemp ? doc(baseCol) : doc(baseCol, it.id);

        const payload = {
          id: ref.id,
          buildingId,
          place: it.place || "Untitled",
          description: it.description || "",
          order: idx,
          active: true,
          createdAt: serverTimestamp(),
        };

        batch.set(ref, payload, { merge: true });

        // If we created a new doc, propagate the generated id back into local state
        if (isTemp) it.id = ref.id;
      });

      await batch.commit();

      // Refresh "original" and clear dirty
      originalRef.current = deepClone(items);
      setDirty(false);

      Alert.alert(
        "Saved",
        `Checklist saved with ${items.length} item${items.length === 1 ? "" : "s"}.`
      );
    } catch (e: any) {
      console.error(e);
      Alert.alert("Error", e?.message ?? "Failed to save checklist.");
    } finally {
      setSaving(false);
    }
  };

  const renderItem = ({ item }: { item: ChecklistItem }) => (
    <View style={styles.card}>
      {/* No checkbox — checklist vibe via text rows + delete */}
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

      <TouchableOpacity
        onPress={() => deleteItem(item.id)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        style={styles.deleteBtn}
      >
        <Ionicons name="trash-outline" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Security Checklist Creator</Text>
            <Text style={styles.headerSub}>
              {disabledUI
                ? "Select a building to continue"
                : "Add items, then Save to persist"}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.addBtn, disabledUI && { opacity: 0.6 }]}
            disabled={disabledUI}
            onPress={() => setAdding(true)}
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
              <Text style={{ fontWeight: "800", color: isDark ? "#F3F4F6" : "#7C2D12" }}>
                Building not selected
              </Text>
              <Text style={{ marginTop: 4, color: isDark ? "#CBD5E1" : "#7C2D12" }}>
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

        {/* Save bar (appears only when there are unsaved local edits) */}
        {!disabledUI && dirty && (
          <View style={styles.saveBar}>
            <TouchableOpacity
              style={styles.discardBtn}
              onPress={() => {
                // discard to the last snapshot
                setItems(deepClone(originalRef.current));
                setDirty(false);
              }}
            >
              <Text style={styles.discardText}>Discard</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              onPress={saveList}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={16} color="#fff" />
                  <Text style={styles.saveText}>Save changes</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>

      {/* Modal */}
      <AddItemModal
        visible={adding}
        onClose={() => setAdding(false)}
        onSubmit={addItem}
        isDark={isDark}
      />
    </View>
  );
};

export default SecurityChecklistCreator;

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

    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    loadingText: { marginTop: 8, color: isDark ? "#E5E7EB" : "#111827" },

    saveBar: {
      position: "absolute",
      left: 12,
      right: 12,
      bottom: 12,
      backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
      borderRadius: 16,
      padding: 12,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 6,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#1F2937" : "transparent",
    },
    discardBtn: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor: isDark ? "#111827" : "#E5E7EB",
    },
    discardText: { color: isDark ? "#E5E7EB" : "#111827", fontWeight: "800" },
    saveBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor: "#10B981",
    },
    saveText: { color: "#FFF", fontWeight: "800" },
  });

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  sheet: {
    maxHeight: "88%",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  headerText: { fontSize: 18, fontWeight: "800" },
  label: { fontSize: 13, fontWeight: "800", marginTop: 12, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
  },
  submitButton: {
    marginTop: 12,
    backgroundColor: "#10B981",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});

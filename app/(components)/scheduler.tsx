// app/(manager)/scheduler.tsx
// Handles task rollout. (Cloud Function later.)
import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Modal,
  TextInput,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Animated,
} from "react-native";
import SwipeableItem, { UnderlayParams } from "react-native-swipeable-item";
import DraggableFlatList, {
  RenderItemParams,
} from "react-native-draggable-flatlist";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../ThemeContext";
import { db } from "../../firebaseConfig";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  writeBatch,
  doc,
  where,
  getDoc,
  serverTimestamp,
  getDocs,
} from "firebase/firestore";
import { Dropdown, MultiSelect } from "react-native-element-dropdown";

/* ---------- Location options ---------- */
const locationOptions = [
  { label: "Area of children", value: "Area of children" },
  { label: "Basket Ball", value: "Basket Ball" },
  { label: "BBQ Area", value: "BBQ Area" },
  { label: "Bicycle area", value: "Bicycle area" },
  { label: "Billiard Room", value: "Billiard Room" },
  { label: "Corridors & Staircase", value: "Corridors & Staircase" },
  { label: "Dog Room", value: "Dog Room" },
  { label: "Doors", value: "Doors" },
  { label: "Electrical Room", value: "Electrical Room" },
  { label: "Elevators", value: "Elevators" },
  { label: "Elevators (LD) - (HD)", value: "Elevators (LD) - (HD)" },
  { label: "Enter Lobby", value: "Enter Lobby" },
  { label: "Exterior Ground", value: "Exterior Ground" },
  { label: "Fire Box", value: "Fire Box" },
  { label: "Fire Boxes", value: "Fire Boxes" },
  { label: "Game Room", value: "Game Room" },
  { label: "Garage Chute", value: "Garage Chute" },
  { label: "General Vacuuming Carpet", value: "General Vacuuming Carpet" },
  { label: "Guess Suite", value: "Guess Suite" },
  { label: "Gym & Yoga room", value: "Gym & Yoga room" },
  { label: "Hallway", value: "Hallway" },
  { label: "Hallway lamps", value: "Hallway lamps" },
  { label: "Karaoke Room", value: "Karaoke Room" },
  { label: "Laundry & washroom", value: "Laundry & washroom" },
  { label: "Lockers Room", value: "Lockers Room" },
  { label: "Lounge Room", value: "Lounge Room" },
  { label: "Mail Boxes", value: "Mail Boxes" },
  { label: "Maintenance of all floors", value: "Maintenance of all floors" },
  { label: "Manager Office", value: "Manager Office" },
  {
    label: "Men & Women Washroom & Sauna",
    value: "Men & Women Washroom & Sauna",
  },
  { label: "Men's & Women's Gym", value: "Men's & Women's Gym" },
  { label: "Moving Room", value: "Moving Room" },
  { label: "Other", value: "Other" },
  { label: "Parking Area (in-out side)", value: "Parking Area (in-out side)" },
  { label: "Party Room", value: "Party Room" },
  { label: "Pool Area", value: "Pool Area" },
  { label: "Security Room", value: "Security Room" },
  { label: "Sprinkler System", value: "Sprinkler System" },
  { label: "Staff Room", value: "Staff Room" },
  { label: "Staircase", value: "Staircase" },
  { label: "Telecom Room", value: "Telecom Room" },
  { label: "Waiting Room", value: "Waiting Room" },
  {
    label: "Washroom (Men,Women & Security)",
    value: "Washroom (Men,Women & Security)",
  },
  { label: "Windows & Mirrors", value: "Windows & Mirrors" },
];

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri";
const DAYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri"];
const DAY_LABEL: Record<DayKey, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
};

type Worker = {
  id: string;
  name: string;
  email?: string;
};

type TemplateItem = {
  id: string;
  title: string;
  description?: string;
  defaultPriority?: number; // 1 both, 2 important, 3 urgent, 4 none
  roleNeeded?: string | null;
  assignedWorkerIds?: string[];
  order: number;
  active: boolean;
  [key: string]: any;
};

const makeTempId = () =>
  `temp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const makeEmpty = (): Record<DayKey, TemplateItem[]> => ({
  mon: [],
  tue: [],
  wed: [],
  thu: [],
  fri: [],
});

const makeLoading = (): Record<DayKey, boolean> => ({
  mon: true,
  tue: true,
  wed: true,
  thu: true,
  fri: true,
});

function deepClone<T>(arr: T[]): T[] {
  return arr.map((x) => ({ ...(x as any) }));
}

const { height: SCREEN_H } = Dimensions.get("window");
const CARD_HEIGHT = Math.max(100, Math.floor(SCREEN_H / 8));

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

// NOTE: keeping this in case you need it elsewhere; rollout now uses selectedDay, not today.
const dateToDayKey = (d: Date): DayKey | null => {
  const idx = d.getDay();
  const map: Record<number, DayKey | null> = {
    0: null,
    1: "mon",
    2: "tue",
    3: "wed",
    4: "thu",
    5: "fri",
    6: null,
  };
  return map[idx] ?? null;
};

export default function Scheduler() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const styles = getStyles(isDark);

  const [dayIndex, setDayIndex] = useState(0);
  const selectedDay: DayKey = DAYS[dayIndex];

  const [itemsByDay, setItemsByDay] = useState<Record<DayKey, TemplateItem[]>>(
    makeEmpty()
  );
  const originalRef = useRef<Record<DayKey, TemplateItem[]>>(makeEmpty());
  const [loadingByDay, setLoadingByDay] = useState<Record<DayKey, boolean>>(
    makeLoading()
  );

  const [dirtyDays, setDirtyDays] = useState<Set<DayKey>>(new Set());
  const dirtyDaysRef = useRef<Set<DayKey>>(new Set());
  useEffect(() => {
    dirtyDaysRef.current = dirtyDays;
  }, [dirtyDays]);

  const [addOpen, setAddOpen] = useState(false);

  // workers
  const [workers, setWorkers] = useState<Worker[]>([]);
  useEffect(() => {
    const qy = query(collection(db, "users"), where("role", "==", "employee"));
    return onSnapshot(qy, (snap) => {
      const arr: Worker[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          name: data.firstName || data.name || data.email || d.id,
          email: data.email,
        };
      });
      setWorkers(arr);
    });
  }, []);

  // subscribe per-day
  useEffect(() => {
    const unsubs = DAYS.map((day) => {
      const qy = query(
        collection(db, "scheduler", day, "items"),
        orderBy("order")
      );
      return onSnapshot(qy, (snap) => {
        setLoadingByDay((prev) => ({ ...prev, [day]: false }));
        if (dirtyDaysRef.current.has(day)) return;
        const arr = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as TemplateItem[];
        setItemsByDay((prev) => ({ ...prev, [day]: arr }));
        originalRef.current = { ...originalRef.current, [day]: deepClone(arr) };
      });
    });
    return () => unsubs.forEach((u) => u());
  }, []);

  // ===========================
  // helper to flip existing "today" tasks off
  // ===========================
  async function markExistingTasksNotForToday(todayStr: string) {
    const ids = new Set<string>();
    const tasksRef = collection(db, "tasks");

    const qFlag = query(tasksRef, where("forToday", "==", true));
    const snapFlag = await getDocs(qFlag);
    snapFlag.forEach((d) => ids.add(d.id));

    const qDate = query(tasksRef, where("dateYYYYMMDD", "==", todayStr));
    const snapDate = await getDocs(qDate);
    snapDate.forEach((d) => ids.add(d.id));

    const allIds = Array.from(ids);
    if (allIds.length === 0) return 0;

    const CHUNK = 450;
    for (let i = 0; i < allIds.length; i += CHUNK) {
      const batch = writeBatch(db);
      const slice = allIds.slice(i, i + CHUNK);
      slice.forEach((id) => {
        batch.update(doc(db, "tasks", id), { forToday: false });
      });
      await batch.commit();
    }
    return allIds.length;
  }

  // ===========================
  // MANUAL ROLLOUT (selected day)
  // ===========================
  const rolloutToday = async () => {
    const dayKey = selectedDay;
    const todayStr = ymd(new Date());

    if (loadingByDay[dayKey]) {
      Alert.alert("Please wait", "Scheduler is still loading. Try again in a moment.");
      return;
    }

    const cleared = await markExistingTasksNotForToday(todayStr);

    const templates = itemsByDay[dayKey] || [];
    const batch = writeBatch(db);
    let createdCount = 0;

    templates.forEach((tpl) => {
      if (!tpl?.active) return;

      const workerIds = Array.isArray(tpl.assignedWorkerIds)
        ? tpl.assignedWorkerIds
        : [];
      if (workerIds.length === 0) return;

      const ref = doc(collection(db, "tasks"));
      batch.set(ref, {
        title: tpl.title || "Untitled",
        description: tpl.description || "",
        priority: tpl.defaultPriority ?? 3,
        dayKey,
        dateYYYYMMDD: todayStr,
        templateId: tpl.id,
        assignedWorkers: workerIds,
        status: "assigned",
        order: tpl.order ?? 999,
        createdAt: serverTimestamp(),
        forToday: true,
      });

      createdCount += 1;
    });

    await batch.commit();
    Alert.alert(
      "Success",
      `Cleared ${cleared} existing task${cleared === 1 ? "" : "s"} from today.\nRolled out ${createdCount} new task${createdCount === 1 ? "" : "s"}!`
    );
  };

  const selectedListRaw = itemsByDay[selectedDay] ?? [];
  const selectedList = React.useMemo(() => {
    const seen = new Set<string>();
    return selectedListRaw.filter((it) => {
      if (!it?.id) return false;
      if (seen.has(it.id)) return false;
      seen.add(it.id);
      return true;
    });
  }, [selectedListRaw, selectedDay]);

  const selectedLoading = loadingByDay[selectedDay];
  const hasDirty = dirtyDays.size > 0;

  const markDirty = (day: DayKey) =>
    setDirtyDays((prev) => new Set(prev).add(day));
  const onReorderDay = (day: DayKey, next: TemplateItem[]) => {
    setItemsByDay((prev) => ({ ...prev, [day]: next }));
    markDirty(day);
  };
  const deleteItem = (day: DayKey, id: string) => {
    setItemsByDay((prev) => ({
      ...prev,
      [day]: (prev[day] ?? []).filter((it) => it.id !== id),
    }));
    markDirty(day);
  };

  const saveChanges = async () => {
    const batch = writeBatch(db);
    const savedDays: DayKey[] = [];

    for (const day of DAYS) {
      if (!dirtyDays.has(day)) continue;
      savedDays.push(day);

      const orig = originalRef.current[day] ?? [];
      const curr = itemsByDay[day] ?? [];
      const currIds = new Set(curr.map((i) => i.id));

      for (const it of orig) {
        if (!currIds.has(it.id)) {
          batch.delete(doc(db, "scheduler", day, "items", it.id));
        }
      }

      curr.forEach((it, idx) => {
        const isTemp = it.id.startsWith("temp_");
        const ref = isTemp
          ? doc(collection(db, "scheduler", day, "items"))
          : doc(db, "scheduler", day, "items", it.id);

        batch.set(
          ref,
          {
            ...it,
            id: ref.id,
            order: idx,
            assignedWorkerIds: Array.isArray(it.assignedWorkerIds)
              ? it.assignedWorkerIds
              : [],
          },
          { merge: true }
        );

        if (isTemp) it.id = ref.id;
      });
    }

    await batch.commit();

    for (const day of savedDays) {
      const curr = itemsByDay[day] ?? [];
      originalRef.current = { ...originalRef.current, [day]: deepClone(curr) };
    }

    setDirtyDays(new Set());
  };

  const discardChanges = () => {
    const out = makeEmpty();
    for (const d of DAYS) out[d] = deepClone(originalRef.current[d]);
    setItemsByDay(out);
    setDirtyDays(new Set());
  };

  const prevDay = () => setDayIndex((i) => (i === 0 ? DAYS.length - 1 : i - 1));
  const nextDay = () => setDayIndex((i) => (i === DAYS.length - 1 ? 0 : i + 1));

  const nameById = React.useMemo(() => {
    const m: Record<string, string> = {};
    workers.forEach((w) => (m[w.id] = w.name));
    return m;
  }, [workers]);

  const renderRow = ({
    item,
    drag,
    isActive,
  }: RenderItemParams<TemplateItem>) => {
    const assignedNames =
      (item.assignedWorkerIds || [])
        .map((id) => nameById[id] || id)
        .filter(Boolean)
        .join(", ") || "Unassigned";

    return (
      <SwipeableItem
        item={item}
        snapPointsLeft={[96]}
        overSwipe={32}
        renderUnderlayLeft={({ close }: UnderlayParams<TemplateItem>) => (
          <View style={styles.underlayLeft}>
            <TouchableOpacity
              onPress={() => {
                deleteItem(selectedDay, item.id);
                close();
              }}
              style={styles.underlayButton}
              activeOpacity={0.9}
            >
              <Ionicons name="trash-outline" size={28} color="#fff" />
              <Text style={styles.underlayText}>Delete</Text>
            </TouchableOpacity>
          </View>
        )}
        onChange={({ openDirection }) => {
          if (openDirection === "left") {
            deleteItem(selectedDay, item.id);
          }
        }}
      >
        <TouchableOpacity
          onLongPress={drag}
          delayLongPress={50}
          activeOpacity={0.9}
          style={[styles.card, isActive && { opacity: 0.9 }]}
        >
          <Text style={styles.title}>{item.title || "Untitled"}</Text>
          {!!item.description && (
            <Text style={styles.meta}>{item.description}</Text>
          )}
          <Text style={styles.meta}>
            Priority {item.defaultPriority ?? 3}
            {item.roleNeeded ? ` • ${item.roleNeeded}` : ""}
          </Text>
          <Text style={styles.meta}>Assigned: {assignedNames}</Text>
        </TouchableOpacity>
      </SwipeableItem>
    );
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.daySwitcher}>
            <TouchableOpacity onPress={prevDay} style={styles.arrowBtn}>
              <Ionicons
                name="chevron-back"
                size={18}
                color={isDark ? "#E5E7EB" : "#1F2937"}
              />
            </TouchableOpacity>

            <View style={styles.dayBadge}>
              <Text style={styles.dayLabel}>
                {DAY_LABEL[selectedDay]}
                {dirtyDays.has(selectedDay) ? " •" : ""}
              </Text>
            </View>

            <TouchableOpacity onPress={nextDay} style={styles.arrowBtn}>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={isDark ? "#E5E7EB" : "#1F2937"}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setAddOpen(true)}
          >
            <Ionicons name="add" size={16} color="#fff" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.rolloutBtn} onPress={rolloutToday}>
            <Ionicons name="rocket-outline" size={14} color="#fff" />
            <Text style={styles.rolloutText}>
              Rollout {DAY_LABEL[selectedDay]}
            </Text>
          </TouchableOpacity>
        </View>

        {/* List */}
        {selectedLoading ? (
          <View style={styles.center}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Loading…</Text>
          </View>
        ) : selectedList.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Ionicons
              name="clipboard-outline"
              size={24}
              color={isDark ? "#94A3B8" : "#64748B"}
            />
            <Text style={styles.emptyText}>
              No items for {DAY_LABEL[selectedDay]} yet.
            </Text>
            <Text style={styles.emptySubtle}>Tap “Add” to create one.</Text>
          </View>
        ) : (
          <DraggableFlatList
            data={selectedList}
            keyExtractor={(it, idx) =>
              it?.id ? `k_${it.id}` : `fallback_${idx}`
            }
            onDragEnd={({ data }) => onReorderDay(selectedDay, data)}
            renderItem={renderRow}
            activationDistance={16}
            containerStyle={{ paddingBottom: 96 }}
            contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 8 }}
          />
        )}

        {/* Save/discard bar */}
        {hasDirty && (
          <View style={styles.saveBar}>
            <TouchableOpacity
              style={styles.discardBtn}
              onPress={discardChanges}
            >
              <Text style={styles.discardText}>Discard</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={saveChanges}>
              <Text style={styles.saveText}>Save changes</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>

      {/* Add Item Modal */}
      <AddSchedulerItemModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onCreate={(payload) => {
          const next = [...itemsByDay[selectedDay], payload as any];
          setItemsByDay((prev) => ({ ...prev, [selectedDay]: next }));
          markDirty(selectedDay);
        }}
        isDark={isDark}
        workers={workers}
      />
    </View>
  );
}

/* ---------- AddSchedulerItemModal ---------- */
function AddSchedulerItemModal({
  visible,
  onClose,
  onCreate,
  isDark,
  workers,
}: {
  visible: boolean;
  onClose: () => void;
  onCreate: (item: Partial<TemplateItem>) => Promise<void> | void;
  isDark: boolean;
  workers: Worker[];
}) {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [important, setImportant] = useState(false);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);

  const reset = () => {
    setTitle("");
    setDesc("");
    setUrgent(false);
    setImportant(false);
    setSelectedWorkerIds([]);
  };

  const computePriorityFromFlags = (u: boolean, i: boolean) => {
    if (u && i) return 1;
    if (!u && i) return 2;
    if (u && !i) return 3;
    return 4;
  };

  const submit = async () => {
    const finalPriority = computePriorityFromFlags(urgent, important);

    if (finalPriority === 4) {
      Alert.alert("Please select Urgent and/or Important.");
      return;
    }

    const payload: Partial<TemplateItem> = {
      id: makeTempId(),
      title: title || "Untitled",
      description: desc || "",
      defaultPriority: finalPriority,
      assignedWorkerIds: selectedWorkerIds,
      order: 9_999,
      active: true,
    };
    await onCreate(payload);
    reset();
    onClose();
  };

  const workerOptions = workers.map((w) => ({ label: w.name, value: w.id }));

  const ToggleSwitch = ({
    label,
    value,
    onToggle,
  }: {
    label: string;
    value: boolean;
    onToggle: () => void;
  }) => (
    <View style={modalStyles.toggleRow}>
      <Text
        style={[
          modalStyles.label,
          { flex: 1, color: isDark ? "#E5E7EB" : "#333" },
        ]}
      >
        {label}
      </Text>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onToggle}
        style={[
          modalStyles.toggleContainer,
          { backgroundColor: value ? "#22C55E" : isDark ? "#374151" : "#D1D5DB" },
        ]}
      >
        <Animated.View
          style={[
            modalStyles.toggleCircle,
            { transform: [{ translateX: value ? 22 : 0 }] },
          ]}
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={modalStyles.overlay}
      >
        <View
          style={[
            modalStyles.sheet,
            { backgroundColor: isDark ? "#121826" : "#FFFFFF" },
          ]}
        >
          <View style={modalStyles.headerRow}>
            <Text
              style={[
                modalStyles.headerText,
                { color: isDark ? "#E5E7EB" : "#111827" },
              ]}
            >
              Add Scheduler Item
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text
                style={{ fontSize: 22, color: isDark ? "#93A4B3" : "#6B7280" }}
              >
                ×
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            <Text
              style={[
                modalStyles.label,
                { color: isDark ? "#CBD5E1" : "#374151" },
              ]}
            >
              Location / Title
            </Text>
            <Dropdown
              style={[
                modalStyles.dropdown,
                {
                  borderColor: isDark ? "#374151" : "#D1D5DB",
                  backgroundColor: isDark ? "#1F2937" : "#FFF",
                },
              ]}
              placeholderStyle={{ color: "#9CA3AF" }}
              selectedTextStyle={{ color: isDark ? "#F9FAFB" : "#111827" }}
              itemTextStyle={{ color: isDark ? "#F9FAFB" : "#111827" }}
              containerStyle={{ backgroundColor: isDark ? "#111827" : "#FFF" }}
              data={locationOptions}
              labelField="label"
              valueField="value"
              placeholder="Select or type custom below"
              value={title}
              onChange={(item: any) => setTitle(item.value)}
            />

            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Or type a custom title"
              placeholderTextColor="#9CA3AF"
              style={[
                modalStyles.input,
                {
                  backgroundColor: isDark ? "#1F2937" : "#FFF",
                  color: isDark ? "#FFF" : "#111",
                  borderColor: isDark ? "#374151" : "#D1D5DB",
                },
              ]}
            />
            <Text
              style={[
                modalStyles.label,
                { color: isDark ? "#CBD5E1" : "#374151", marginTop: 8 },
              ]}
            >
              Default worker(s)
            </Text>
            <MultiSelect
              style={[
                modalStyles.dropdown,
                {
                  borderColor: isDark ? "#374151" : "#D1D5DB",
                  backgroundColor: isDark ? "#1F2937" : "#FFF",
                },
              ]}
              placeholderStyle={{ color: "#9CA3AF" }}
              selectedTextStyle={{ color: isDark ? "#F9FAFB" : "#111827" }}
              itemTextStyle={{ color: isDark ? "#F9FAFB" : "#111827" }}
              containerStyle={{ backgroundColor: isDark ? "#111827" : "#FFF" }}
              data={workerOptions}
              labelField="label"
              valueField="value"
              placeholder="Assign default worker(s)"
              value={selectedWorkerIds}
              onChange={(vals: string[]) => setSelectedWorkerIds(vals)}
            />

            <Text
              style={[
                modalStyles.label,
                { color: isDark ? "#CBD5E1" : "#374151" },
              ]}
            >
              Description
            </Text>
            <TextInput
              value={desc}
              onChangeText={setDesc}
              placeholder="Optional details"
              placeholderTextColor="#9CA3AF"
              style={[
                modalStyles.input,
                {
                  backgroundColor: isDark ? "#1F2937" : "#FFF",
                  color: isDark ? "#FFF" : "#111",
                  borderColor: isDark ? "#374151" : "#D1D5DB",
                },
              ]}
              multiline
            />

            {/* Urgent / Important toggles */}
            <ToggleSwitch
              label="Urgent"
              value={urgent}
              onToggle={() => setUrgent((prev) => !prev)}
            />
            <ToggleSwitch
              label="Important"
              value={important}
              onToggle={() => setImportant((prev) => !prev)}
            />
          </ScrollView>

          <TouchableOpacity style={modalStyles.submitButton} onPress={submit}>
            <Text style={modalStyles.submitText}>Add</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/* ---------- Styles ---------- */
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
      paddingBottom: 4,
      gap: 8,
    },
    daySwitcher: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      flex: 1,
    },
    arrowBtn: {
      backgroundColor: isDark ? "#111827" : "#E5E7EB",
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    dayBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: isDark ? "#111827" : "#E5E7EB",
      borderRadius: 999,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#1F2937" : "transparent",
    },
    dayLabel: {
      fontSize: 16,
      fontWeight: "800",
      color: isDark ? "#F3F4F6" : "#111827",
      letterSpacing: 0.2,
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

    rolloutBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "#10B981",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
    },
    rolloutText: { color: "#fff", fontWeight: "800" },

    center: { flex: 1, alignItems: "center", justifyContent: "center" },
    loadingText: { marginTop: 8, color: isDark ? "#E5E7EB" : "#111827" },

    emptyWrap: {
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 40,
      gap: 8,
    },
    emptyText: {
      fontSize: 16,
      fontWeight: "700",
      color: isDark ? "#E5E7EB" : "#111827",
    },
    emptySubtle: {
      fontSize: 13,
      color: isDark ? "#94A3B8" : "#64748B",
    },

    card: {
      height: CARD_HEIGHT,
      width: "100%",
      backgroundColor: isDark ? "#111827" : "#FFFFFF",
      borderRadius: 16,
      padding: 14,
      marginVertical: 8,
      shadowColor: "#000",
      shadowOpacity: 0.1,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
      borderWidth: isDark ? 1 : 0,
      borderColor: isDark ? "#1F2937" : "transparent",
    },
    title: {
      fontSize: 16,
      fontWeight: "800",
      color: isDark ? "#E5E7EB" : "#0F172A",
      marginBottom: 6,
      letterSpacing: 0.2,
    },
    meta: {
      fontSize: 13,
      color: isDark ? "#CBD5E1" : "#4B5563",
    },

    underlayLeft: {
      flex: 1,
      marginVertical: 8,
      borderRadius: 16,
      overflow: "hidden",
      backgroundColor: "#EF4444",
      justifyContent: "center",
      alignItems: "center",
    },
    underlayButton: {
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      width: "100%",
      height: "100%",
    },
    underlayText: {
      marginTop: 6,
      color: "#fff",
      fontWeight: "800",
    },

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
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor: isDark ? "#2563EB" : "#1D4ED8",
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
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  headerText: { fontSize: 18, fontWeight: "800" },
  label: { fontSize: 13, fontWeight: "800", marginTop: 12, marginBottom: 6 },
  dropdown: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
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

  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 8,
  },
  toggleContainer: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: "center",
  },
  toggleCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
});

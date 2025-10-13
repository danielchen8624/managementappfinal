// Handles task rollout, per-building.
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
import { router } from "expo-router";
import DraggableFlatList, {
  RenderItemParams,
} from "react-native-draggable-flatlist";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../ThemeContext";
import { db, auth } from "../../firebaseConfig";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  writeBatch,
  doc,
  where,
  serverTimestamp,
  getDocs,
  Timestamp,
  getDoc, // 👈 added
} from "firebase/firestore";
import { Dropdown, MultiSelect } from "react-native-element-dropdown";

// 🔑 Building context
import { useBuilding } from "../BuildingContext";

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

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
const DAYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
const DAY_LABEL: Record<DayKey, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

type Worker = {
  id: string;
  name: string;
  email?: string;
};

/** Actor written to Firestore (and read back) */
type Actor = {
  id?: string | null;
  name?: string | null; // ← will carry displayName/firstName/etc.
  role?: string | null;
} | null;

export type TemplateItem = {
  id: string;
  title: string;
  description?: string;
  defaultPriority?: number; // 1 both, 2 important, 3 urgent, 4 none
  roleNeeded?: string | null;
  assignedWorkerIds?: string[];
  order: number;
  active: boolean;
  roomNumber?: string | null;

  // audit (create only)
  createdBy?: Actor;
  createdAt?: Timestamp | null;

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
  sat: [],
  sun: [],
});

const makeLoading = (): Record<DayKey, boolean> => ({
  mon: true,
  tue: true,
  wed: true,
  thu: true,
  fri: true,
  sat: true,
  sun: true,
});

function deepClone<T>(arr: T[]): T[] {
  return arr.map((x) => ({ ...(x as any) }));
}

const { height: SCREEN_H } = Dimensions.get("window");
const CARD_HEIGHT = Math.max(100, Math.floor(SCREEN_H / 6));

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

/* =====================  MAIN  ===================== */
export default function Scheduler() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const styles = getStyles(isDark);

  // 🔑 building context
  const { buildingId } = useBuilding();

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

  // workers (scoped)
  const [workers, setWorkers] = useState<Worker[]>([]);
  useEffect(() => {
    if (!buildingId) {
      setWorkers([]);
      return;
    }

    // If you have building-assigned employees, prefer:
    // const qy = query(collection(db, "buildings", buildingId, "employees"));
    // Here we fall back to global employees. You can add a membership filter if you store it.
    const qy = query(collection(db, "users"), where("role", "==", "employee"));
    const unsub = onSnapshot(qy, (snap) => {
      const arr: Worker[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          name: data.displayName || data.firstName || data.email || d.id,
          email: data.email,
        };
      });
      setWorkers(arr);
    });
    return () => unsub();
  }, [buildingId]);

  // 🔹 load current user's profile once to build actor names
  const [me, setMe] = useState<{
    displayName?: string;
    firstName?: string;
    lastName?: string;
    role?: string;
  } | null>(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", uid));
        setMe((snap.data() as any) || null);
      } catch {
        setMe(null);
      }
    })();
  }, []);

  // helper to build actor object (uses Firestore user doc first, then Auth)
  const buildActor = (fallbackRole: string = "manager") => {
    const u = auth.currentUser;
    const candidateName =
      me?.displayName ||
      [me?.firstName, me?.lastName].filter(Boolean).join(" ").trim() ||
      u?.displayName ||
      u?.email ||
      u?.uid ||
      "unknown";
    return {
      id: u?.uid ?? null,
      name: candidateName,
      role: me?.role || fallbackRole,
    };
  };

  // subscribe per-day (scoped to building)
  useEffect(() => {
    // reset when building changes
    setItemsByDay(makeEmpty());
    setLoadingByDay(makeLoading());
    if (!buildingId) return;

    const unsubs = DAYS.map((day) => {
      const qy = query(
        collection(db, "buildings", buildingId, "scheduler", day, "items"),
        orderBy("order")
      );
      return onSnapshot(
        qy,
        (snap) => {
          setLoadingByDay((prev) => ({ ...prev, [day]: false }));
          if (dirtyDaysRef.current.has(day)) return; // don't stomp local edits
          const arr = snap.docs.map((d) => {
            const raw = d.data() as any;
            return {
              id: d.id,
              title:
                typeof raw.title === "string" && raw.title.trim()
                  ? raw.title
                  : "Untitled",
              description:
                typeof raw.description === "string" ? raw.description : "",
              defaultPriority:
                typeof raw.defaultPriority === "number"
                  ? raw.defaultPriority
                  : 3,
              roleNeeded: raw.roleNeeded ?? null,
              assignedWorkerIds: Array.isArray(raw.assignedWorkerIds)
                ? raw.assignedWorkerIds
                : [],
              order: typeof raw.order === "number" ? raw.order : 999,
              active: raw.active !== false,
              roomNumber:
                typeof raw.roomNumber === "string" ? raw.roomNumber : null,

              // carry through create audit if present
              createdBy: raw.createdBy ?? null,
              createdAt: (raw.createdAt as Timestamp) ?? null,
            } as TemplateItem;
          });
          setItemsByDay((prev) => ({ ...prev, [day]: arr }));
          originalRef.current = {
            ...originalRef.current,
            [day]: deepClone(arr),
          };
        },
        () => setLoadingByDay((prev) => ({ ...prev, [day]: false }))
      );
    });
    return () => unsubs.forEach((u) => u && u());
  }, [buildingId]);

  // helper to flip existing "today" tasks off (scoped)
  async function markExistingTasksNotForToday(todayStr: string) {
    if (!buildingId) return 0;
    const ids = new Set<string>();
    const tasksRef = collection(db, "buildings", buildingId, "tasks");

    const qFlag = query(tasksRef, where("forToday", "==", true));
    const snapFlag = await getDocs(qFlag);
    snapFlag.forEach((d) => ids.add(d.id));

    const qDate = query(tasksRef, where("dateYYYYMMDD", "==", todayStr));
    const snapDate = await getDocs(qDate);
    snapDate.forEach((d) => ids.add(d.id));

    const allIds = Array.from(ids);
    if (allIds.length === 0) return 0;

    // batched updates
    const CHUNK = 450;
    for (let i = 0; i < allIds.length; i += CHUNK) {
      const batch = writeBatch(db);
      const slice = allIds.slice(i, i + CHUNK);
      slice.forEach((id) => {
        batch.update(doc(db, "buildings", buildingId, "tasks", id), {
          forToday: false,
        });
      });
      await batch.commit();
    }
    return allIds.length;
  }

  // MANUAL ROLLOUT (selected day, scoped)
  const rolloutToday = async () => {
    if (!buildingId) {
      return Alert.alert("Select a building first.");
    }
    const dayKey = selectedDay;
    const todayStr = ymd(new Date());

    if (loadingByDay[dayKey]) {
      Alert.alert(
        "Please wait",
        "Scheduler is still loading. Try again in a moment."
      );
      return;
    }

    const cleared = await markExistingTasksNotForToday(todayStr);

    const templates = itemsByDay[dayKey] || [];
    const batch = writeBatch(db);
    let createdCount = 0;

    const actor = buildActor("manager"); // 👈 who is creating these tasks

    templates.forEach((tpl) => {
      if (!tpl?.active) return;

      const workerIds = Array.isArray(tpl.assignedWorkerIds)
        ? tpl.assignedWorkerIds
        : [];

      const status = workerIds.length > 0 ? "assigned" : "pending";

      const ref = doc(collection(db, "buildings", buildingId, "tasks"));
      batch.set(ref, {
        buildingId, // helpful for cross-building queries
        title: tpl.title || "Untitled",
        description: tpl.description || "",
        priority: tpl.defaultPriority ?? 3,
        dayKey,
        dateYYYYMMDD: todayStr,
        templateId: tpl.id,
        assignedWorkers: workerIds, // can be empty
        status,
        order: tpl.order ?? 999,
        createdAt: serverTimestamp(),
        createdBy: actor, // 👈 createdBy only
        forToday: true,
        roomNumber: tpl.roomNumber ?? null,
      });

      createdCount += 1;
    });

    await batch.commit();
    Alert.alert(
      "Success",
      `Cleared ${cleared} existing task${
        cleared === 1 ? "" : "s"
      } from today.\n` +
        `Rolled out ${createdCount} new task${createdCount === 1 ? "" : "s"}!`
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
    if (!buildingId) {
      Alert.alert("Select a building first.");
      return;
    }

    const batch = writeBatch(db);
    const savedDays: DayKey[] = [];

    for (const day of DAYS) {
      if (!dirtyDays.has(day)) continue;
      savedDays.push(day);

      const orig = originalRef.current[day] ?? [];
      const curr = itemsByDay[day] ?? [];
      const currIds = new Set(curr.map((i) => i.id));

      // deletes
      for (const it of orig) {
        if (!currIds.has(it.id)) {
          batch.delete(
            doc(db, "buildings", buildingId, "scheduler", day, "items", it.id)
          );
        }
      }

      // upserts
      curr.forEach((it, idx) => {
        const isTemp = it.id.startsWith("temp_");
        const ref = isTemp
          ? doc(
              collection(db, "buildings", buildingId, "scheduler", day, "items")
            )
          : doc(db, "buildings", buildingId, "scheduler", day, "items", it.id);

        const baseFields = {
          id: ref.id,
          title: it.title || "Untitled",
          description: typeof it.description === "string" ? it.description : "",
          defaultPriority:
            typeof it.defaultPriority === "number" ? it.defaultPriority : 3,
          roleNeeded: it.roleNeeded ?? null,
          assignedWorkerIds: Array.isArray(it.assignedWorkerIds)
            ? it.assignedWorkerIds
            : [],
          order: idx,
          active: it.active !== false,
          roomNumber:
            typeof it.roomNumber === "string" && it.roomNumber.trim()
              ? it.roomNumber.trim()
              : null,
        } as const;

        // only set createdBy/createdAt on brand-new docs
        const auditFields = isTemp
          ? {
              createdBy: buildActor("manager"),
              createdAt: serverTimestamp(),
            }
          : {};

        batch.set(ref, { ...baseFields, ...auditFields }, { merge: true });

        if (isTemp) it.id = ref.id; // keep local id in sync after first save
      });
    }

    await batch.commit();

    // refresh originals snapshot
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
        key={`sw-${item.id}`}
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
          if (openDirection === "left") deleteItem(selectedDay, item.id);
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
          {!!item.roomNumber && (
            <Text style={styles.meta}>Room: {item.roomNumber}</Text>
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

  const disabledUI = !buildingId;

  return (
    <View style={styles.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
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

          <View style={styles.daySwitcher}>
            <TouchableOpacity
              onPress={prevDay}
              style={styles.arrowBtn}
              disabled={disabledUI}
            >
              <Ionicons
                name="arrow-back-circle-outline"
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

            <TouchableOpacity
              onPress={nextDay}
              style={styles.arrowBtn}
              disabled={disabledUI}
            >
              <Ionicons
                name="arrow-forward-circle-outline"
                size={18}
                color={isDark ? "#E5E7EB" : "#1F2937"}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.addBtn, disabledUI && { opacity: 0.6 }]}
            onPress={() => setAddOpen(true)}
            disabled={disabledUI}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.rolloutBtn, disabledUI && { opacity: 0.6 }]}
            onPress={rolloutToday}
            disabled={disabledUI}
          >
            <Ionicons name="rocket-outline" size={14} color="#fff" />
            <Text style={styles.rolloutText}>Rollout</Text>
          </TouchableOpacity>
        </View>

        {/* If no building selected, show a gentle nudge */}
        {!buildingId && (
          <View style={{ paddingHorizontal: 16, paddingBottom: 6 }}>
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
                Select a building to manage its scheduler
              </Text>
              <Text
                style={{ marginTop: 4, color: isDark ? "#CBD5E1" : "#7C2D12" }}
              >
                All templates and rollouts are scoped per building.
              </Text>
            </View>
          </View>
        )}

        {/* List */}
        {disabledUI ? (
          <View style={styles.center}>
            <ActivityIndicator />
            <Text style={styles.loadingText}>Waiting for building…</Text>
          </View>
        ) : selectedLoading ? (
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
            keyExtractor={(it) => it.id}
            onDragEnd={({ data }) => onReorderDay(selectedDay, data)}
            renderItem={renderRow}
            activationDistance={16}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingTop: 8,
              paddingBottom: 96,
            }}
            dragItemOverflow={true}
            extraData={selectedList.map((i) => i.id).join("|")}
          />
        )}

        {/* Save/discard bar */}
        {!disabledUI && hasDirty && (
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
        onCreate={(payload: Partial<TemplateItem>) => {
          const next: TemplateItem[] = [
            ...(itemsByDay[selectedDay] ?? []),
            payload as TemplateItem,
          ];
          setItemsByDay((prev) => ({ ...prev, [selectedDay]: next }));
          markDirty(selectedDay);
        }}
        isDark={isDark}
        workers={workers}
      />
    </View>
  );
}

/* ---------- AddSchedulerItemModal (typed & exported) ---------- */
export type AddSchedulerItemModalProps = {
  visible: boolean;
  onClose: () => void;
  onCreate: (item: Partial<TemplateItem>) => Promise<void> | void;
  isDark: boolean;
  workers: Worker[];
};

export const AddSchedulerItemModal: React.FC<AddSchedulerItemModalProps> = ({
  visible,
  onClose,
  onCreate,
  isDark,
  workers,
}) => {
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [roomNumber, setRoomNumber] = useState("");
  const [urgent, setUrgent] = useState(false);
  const [important, setImportant] = useState(false);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<string[]>([]);

  const reset = () => {
    setTitle("");
    setDesc("");
    setRoomNumber("");
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
      roomNumber: roomNumber.trim() || undefined,
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
          {
            backgroundColor: value ? "#22C55E" : isDark ? "#374151" : "#D1D5DB",
          },
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
                  height: 100,
                  textAlignVertical: "top",
                },
              ]}
              multiline
            />

            <Text
              style={[
                modalStyles.label,
                { color: isDark ? "#CBD5E1" : "#374151", marginTop: 8 },
              ]}
            >
              Default Room Number
            </Text>
            <TextInput
              value={roomNumber}
              onChangeText={setRoomNumber}
              placeholder="e.g., 1205"
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
};

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
      paddingHorizontal: 6,
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
      paddingHorizontal: 10,
      paddingVertical: 7,
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
      minHeight: CARD_HEIGHT,
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

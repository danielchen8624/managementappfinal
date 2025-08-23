// src/context/ServerTimeContext.tsx
// Server-authoritative, timezone-aware time context with active priority windows.
// - Primary time source: Firebase Realtime Database .info/serverTimeOffset
// - Fallback: HTTPS callable that returns Date.now() from your backend
// - Timezone handling: Luxon in a fixed business TZ
//
// How to use:
// 1) Wrap your app with <ServerTimeProvider> in App.tsx
// 2) const { now, tzNow, activePriority } = useServerTime()
// 3) Use activePriority to filter queries, tzNow() for business-day logic

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DateTime } from "luxon";
import { getDatabase, ref, onValue } from "firebase/database";
import { getFunctions, httpsCallable } from "firebase/functions";

/* --------------------------- CONFIG: schedule/TZ --------------------------- */

// Business timezone you operate in (change if needed)
const DEFAULT_BUSINESS_TZ = "America/Toronto";

// Priority windows in local business time
const DEFAULT_PRIORITY_WINDOWS = [
  { priority: 1, start: "9:00", end: "10:30" },
  { priority: 2, start: "11:00", end: "12:00" },
  { priority: 3, start: "13:00", end: "22:00" },
];

// Weekdays only by default
const isActiveBusinessDay = (d: Date) => true;

/* ----------------------------- time utilities ----------------------------- */

type WindowDef = { priority: number; start: string; end: string };

const toMins = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

function getActivePriorityFromDate(
  date: Date,
  BUSINESS_TZ: string,
  windows: WindowDef[]
): number | null {
  const dt = DateTime.fromJSDate(date).setZone(BUSINESS_TZ);
  const mins = dt.hour * 60 + dt.minute;
  for (const w of windows) {
    const s = toMins(w.start);
    const e = toMins(w.end);
    if (mins >= s && mins <= e) return w.priority;
  }
  return null;
}

// NEW: compute the next change boundary (start or end of any window) from a given time
function getNextBoundary(
  date: Date,
  BUSINESS_TZ: string,
  windows: WindowDef[]
): DateTime | null {
  const dt = DateTime.fromJSDate(date).setZone(BUSINESS_TZ);
  const candidates: DateTime[] = [];

  for (const w of windows) {
    const [sh, sm] = w.start.split(":").map(Number);
    const [eh, em] = w.end.split(":").map(Number);
    const startToday = dt.set({ hour: sh, minute: sm, second: 0, millisecond: 0 });
    const endToday = dt.set({ hour: eh, minute: em, second: 0, millisecond: 0 });
    if (startToday > dt) candidates.push(startToday);
    if (endToday > dt) candidates.push(endToday);
  }

  // also consider tomorrow’s first window just in case we’re after all windows
  const tomorrow = dt.plus({ days: 1 }).startOf("day");
  const [firstStartH, firstStartM] = windows[0].start.split(":").map(Number);
  candidates.push(
    tomorrow.set({
      hour: firstStartH,
      minute: firstStartM,
      second: 0,
      millisecond: 0,
    })
  );

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.toMillis() - b.toMillis());
  return candidates[0];
}

/* --------------------- server clock offset implementations --------------------- */

// Option A: Realtime Database live offset
function watchClockOffsetRTDB(onOffset: (ms: number) => void): () => void {
  const db = getDatabase(); // make sure you initialized RTDB in your firebaseConfig
  const offsetRef = ref(db, ".info/serverTimeOffset");
  const unsub = onValue(offsetRef, (snap) => {
    const offset = snap.val() ?? 0;
    onOffset(offset);
  });
  return () => unsub();
}

// Option B: HTTPS callable fallback (create a CF named "getServerTime")
async function fetchClockOffsetViaCallable(): Promise<number> {
  try {
    const fn = httpsCallable(getFunctions(), "getServerTime");
    const t0 = Date.now();
    const res: any = await fn({});
    const t1 = Date.now();
    const serverNowMs = res?.data?.serverNowMs as number | undefined;
    if (typeof serverNowMs !== "number") return 0;
    const midpoint = t0 + (t1 - t0) / 2;
    return serverNowMs - midpoint;
  } catch {
    return 0;
  }
}

/* ------------------------------- context types ------------------------------- */

type ServerTimeCtx = {
  now: () => Date;                // JS Date using server offset
  tzNow: () => DateTime;          // Luxon DateTime in BUSINESS_TZ
  offsetMs: number;               // server - device delta in ms
  activePriority: number | null;  // 1 | 2 | 3 | null
  nextBoundary: DateTime | null;  // NEW: next start/end change in BUSINESS_TZ
  secondsToNextChange: number | null; // NEW: countdown helper
};

type ServerTimeProviderProps = {
  children: React.ReactNode;
  businessTz?: string;                // NEW: override TZ if needed
  windows?: WindowDef[];              // NEW: override windows if needed
};

const Ctx = createContext<ServerTimeCtx | null>(null);

/* --------------------------------- provider --------------------------------- */

export const ServerTimeProvider: React.FC<ServerTimeProviderProps> = ({
  children,
  businessTz = DEFAULT_BUSINESS_TZ, // NEW
  windows = DEFAULT_PRIORITY_WINDOWS, // NEW
}) => {
  const [offsetMs, setOffsetMs] = useState(0);
  const haveRTDBOffset = useRef(false);

  // Keep a lightweight tick so consumers update smoothly
  const [tick, setTick] = useState(0); // NEW: keep the tick value
  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 5000);
    return () => clearInterval(id);
  }, []);

  // Start RTDB offset listener, and also try callable as a one-shot fallback
  useEffect(() => {
    const unsub = watchClockOffsetRTDB((ms) => {
      haveRTDBOffset.current = true;
      setOffsetMs(ms);
    });

    // If RTDB does not report within a short window, try callable once
    const fallbackTimer = setTimeout(async () => {
      if (!haveRTDBOffset.current) {
        const ms = await fetchClockOffsetViaCallable();
        // Only set if RTDB has not set it yet
        if (!haveRTDBOffset.current) setOffsetMs(ms);
      }
    }, 2000);

    return () => {
      clearTimeout(fallbackTimer);
      unsub();
    };
  }, []);

  const value = useMemo<ServerTimeCtx>(() => {
    const now = () => new Date(Date.now() + offsetMs);
    const tzNow = () =>
      DateTime.fromMillis(Date.now() + offsetMs).setZone(businessTz); // NEW use injected TZ

    const d = now();
    const activePriority = isActiveBusinessDay(d)
      ? getActivePriorityFromDate(d, businessTz, windows) // NEW use injected windows
      : null;

    // NEW: compute next boundary + countdown
    const boundary = getNextBoundary(d, businessTz, windows);
    const secondsToNextChange =
      boundary ? Math.max(0, Math.floor((boundary.toMillis() - (Date.now() + offsetMs)) / 1000)) : null;

    return {
      now,
      tzNow,
      offsetMs,
      activePriority,
      nextBoundary: boundary,
      secondsToNextChange,
    };
    // IMPORTANT: include tick so this recomputes every interval even when offsetMs doesn't change
  }, [offsetMs, tick, businessTz, windows]); // NEW: added tick, TZ, windows to deps

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

/* ---------------------------------- hook ---------------------------------- */

export function useServerTime(): ServerTimeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useServerTime must be used within ServerTimeProvider");
  return ctx;
}

/* ---------------------------- optional exports ---------------------------- */
// Export these if you want to unit test or reuse defaults elsewhere
export {
  DEFAULT_BUSINESS_TZ as BUSINESS_TZ,                // keep name parity with your old export
  DEFAULT_PRIORITY_WINDOWS as priorityWindows,
  isActiveBusinessDay,
  getActivePriorityFromDate,
};

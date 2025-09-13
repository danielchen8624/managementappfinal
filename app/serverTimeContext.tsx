// app/TimeContext.tsx
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
  { priority: 1, start: "7:00",  end: "10:15" },
  { priority: 2, start: "10:30", end: "12:45" },
  { priority: 3, start: "13:15", end: "14:45" },
];

// Project time slot
const PROJECT_WINDOW = { start: "15:00", end: "15:30" } as const;

// Weekday filter if needed; currently always true (24/7)
const isActiveBusinessDay = (_d: Date) => true;

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
    const endToday   = dt.set({ hour: eh, minute: em, second: 0, millisecond: 0 });
    if (startToday > dt) candidates.push(startToday);
    if (endToday > dt)   candidates.push(endToday);
  }

  // include project window boundaries
  {
    const [psh, psm] = PROJECT_WINDOW.start.split(":").map(Number);
    const [peh, pem] = PROJECT_WINDOW.end.split(":").map(Number);
    const pStart = dt.set({ hour: psh, minute: psm, second: 0, millisecond: 0 });
    const pEnd   = dt.set({ hour: peh, minute: pem, second: 0, millisecond: 0 });
    if (pStart > dt) candidates.push(pStart);
    if (pEnd > dt)   candidates.push(pEnd);
  }

  // fallback to tomorrow’s first window
  const tomorrow = dt.plus({ days: 1 }).startOf("day");
  const [firstStartH, firstStartM] = windows[0].start.split(":").map(Number);
  candidates.push(
    tomorrow.set({ hour: firstStartH, minute: firstStartM, second: 0, millisecond: 0 })
  );

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.toMillis() - b.toMillis());
  return candidates[0];
}

/* -------------------- Security hourly cadence helpers --------------------- */

const SECURITY_START_HOUR = 8;   // inclusive (08:00)
const SECURITY_END_HOUR   = 22;  // inclusive (22:00)
const SECURITY_ALERT_GRACE_SECONDS = 9 * 60; // show “it’s time” banner for first 9 min of the hour

function nextSecurityPing(dt: DateTime): DateTime {
  // If before 08:00 → 08:00 today
  if (dt.hour < SECURITY_START_HOUR) {
    return dt.set({ hour: SECURITY_START_HOUR, minute: 0, second: 0, millisecond: 0 });
  }
  // If between 08:00 and 22:00 → next top of hour (inclusive)
  if (dt.hour < SECURITY_END_HOUR) {
    const nextHour = dt.plus({ hours: 1 }).set({ minute: 0, second: 0, millisecond: 0 });
    return nextHour;
  }
  // If at/after 22:00 → next day 08:00
  const nextDay8 = dt.plus({ days: 1 }).set({
    hour: SECURITY_START_HOUR,
    minute: 0,
    second: 0,
    millisecond: 0,
  });
  return nextDay8;
}

function currentHourIsSecurityWindow(dt: DateTime): boolean {
  return dt.hour >= SECURITY_START_HOUR && dt.hour <= SECURITY_END_HOUR;
}

function secondsIntoHour(dt: DateTime): number {
  return dt.minute * 60 + dt.second;
}

/* --------------------- server clock offset implementations --------------------- */

function watchClockOffsetRTDB(onOffset: (ms: number) => void): () => void {
  const db = getDatabase();
  const offsetRef = ref(db, ".info/serverTimeOffset");
  const unsub = onValue(offsetRef, (snap) => {
    const offset = snap.val() ?? 0;
    onOffset(offset);
  });
  return () => unsub();
}

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
  // existing
  now: () => Date;
  tzNow: () => DateTime;
  offsetMs: number;
  activePriority: number | null;
  nextBoundary: DateTime | null;
  secondsToNextChange: number | null;
  isProjectTime: boolean;

  // NEW: security cadence
  security: {
    isWithinSecurityHours: boolean;     // 08:00–22:59 (by hour)
    isPingWindow: boolean;              // first ~9 min of each eligible hour
    nextPing: DateTime;                 // next scheduled top-of-hour ping
    secondsToNextPing: number;          // countdown to next top-of-hour
    hourLabel: string;                  // e.g. "14:00"
  };
};

type ServerTimeProviderProps = {
  children: React.ReactNode;
  businessTz?: string;
  windows?: WindowDef[];
};

const Ctx = createContext<ServerTimeCtx | null>(null);

/* --------------------------------- provider --------------------------------- */

export const ServerTimeProvider: React.FC<ServerTimeProviderProps> = ({
  children,
  businessTz = DEFAULT_BUSINESS_TZ,
  windows = DEFAULT_PRIORITY_WINDOWS,
}) => {
  const [offsetMs, setOffsetMs] = useState(0);
  const haveRTDBOffset = useRef(false);

  // 1s tick so the security banner feels snappy
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // server offset sources
  useEffect(() => {
    const unsub = watchClockOffsetRTDB((ms) => {
      haveRTDBOffset.current = true;
      setOffsetMs(ms);
    });
    const fallbackTimer = setTimeout(async () => {
      if (!haveRTDBOffset.current) {
        const ms = await fetchClockOffsetViaCallable();
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
      DateTime.fromMillis(Date.now() + offsetMs).setZone(businessTz);

    const d = now();
    const dt = DateTime.fromJSDate(d).setZone(businessTz);

    // existing
    const activePriority = isActiveBusinessDay(d)
      ? getActivePriorityFromDate(d, businessTz, windows)
      : null;

    const boundary = getNextBoundary(d, businessTz, windows);
    const secondsToNextChange =
      boundary
        ? Math.max(0, Math.floor((boundary.toMillis() - (Date.now() + offsetMs)) / 1000))
        : null;

    const mins = dt.hour * 60 + dt.minute;
    const projStart = toMins(PROJECT_WINDOW.start);
    const projEnd   = toMins(PROJECT_WINDOW.end);
    const isProjectTime = mins >= projStart && mins <= projEnd;

    // NEW: security cadence
    const inHours = currentHourIsSecurityWindow(dt);
    const nextPing = nextSecurityPing(dt);
    const secondsToNextPing = Math.max(
      0,
      Math.floor((nextPing.toMillis() - dt.toMillis()) / 1000)
    );

    const secInto = secondsIntoHour(dt);
    const isPingWindow = inHours && secInto <= SECURITY_ALERT_GRACE_SECONDS;

    const hourLabel = dt.set({ minute: 0, second: 0, millisecond: 0 }).toFormat("HH:mm");

    return {
      now,
      tzNow,
      offsetMs,
      activePriority,
      nextBoundary: boundary,
      secondsToNextChange,
      isProjectTime,
      security: {
        isWithinSecurityHours: inHours,
        isPingWindow,
        nextPing,
        secondsToNextPing,
        hourLabel,
      },
    };
  }, [offsetMs, tick, businessTz, windows]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

/* ---------------------------------- hook ---------------------------------- */

export function useServerTime(): ServerTimeCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useServerTime must be used within ServerTimeProvider");
  return ctx;
}

/* ---------------------------- optional exports ---------------------------- */
export {
  DEFAULT_BUSINESS_TZ as BUSINESS_TZ,
  DEFAULT_PRIORITY_WINDOWS as priorityWindows,
  PROJECT_WINDOW,
  isActiveBusinessDay,
  getActivePriorityFromDate,
};

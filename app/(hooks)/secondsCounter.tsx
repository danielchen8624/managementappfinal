import { useEffect, useMemo, useState } from "react";
import {
  onSnapshot,
  query,
  where,
  limit,
  collection,
  orderBy,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";

function formatHMS(totalSec: number) {
  //converts seconds to HH:MM:SS format
  const s = Math.max(0, Math.floor(totalSec));
  const hh = String(Math.floor(s / 3600)).padStart(2, "0");
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`;
}

export function useShiftTimer(uid: string | undefined) {
  // custom hook to track shift time
  const [startMs, setStartMs] = useState<number | null>(null); // start time in milliseconds
  const [loading, setLoading] = useState(true);
  const [nowMs, setNowMs] = useState(Date.now());

  // Subscribe to the open shift for the user
  useEffect(() => {
    if (!uid) return;
    const q = query(
      collection(db, "users", uid, "shifts"),
      where("clockOut", "==", null),
      //orderBy("clockIn", "desc"),

      limit(1)
    );
    const unsub = onSnapshot(q, (snap) => {
      if (snap.empty) {
        setStartMs(null);
        setLoading(false);
      } else {
        const data = snap.docs[0].data() as any; //gets the first and only open shift
        const t = data.clockIn?.toMillis?.();
        setStartMs(typeof t === "number" ? t : Date.now());
        setLoading(false);
      }
    });
    return unsub;
  }, [uid]);

  // Update clock every second
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const seconds = useMemo(() => {
    if (!startMs) return 0;
    return (nowMs - startMs) / 1000;
  }, [nowMs, startMs]);

  return {
    loading,
    running: startMs != null,
    seconds,
    hhmmss: formatHMS(seconds),
  };
}

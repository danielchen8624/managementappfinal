// LEARN WHAT EVERYTHING DOES
import React, { useEffect, useMemo, useState } from "react";
import { Text, TextProps } from "react-native";
import type { Timestamp } from "firebase/firestore";

type TimeLike = Timestamp | Date | number | null | undefined;

type Props = TextProps & {
  /** Firestore Timestamp, Date, or ms since epoch */
  start: TimeLike;
  /** (optional) when provided, timer stops and shows total duration */
  end?: TimeLike;
  /** how often to refresh (ms) */
  refreshMs?: number;
  /** what to render if start is missing */
  fallback?: string;
  /** prefix text (e.g., "Elapsed: ") */
  prefix?: string;
  /** showHours pads to HH:mm:ss (default true) */
  showHours?: boolean;
};

export default function ElapsedTimer({
  start,
  end,
  refreshMs = 1000,
  fallback = "—",
  prefix = "",
  showHours = true,
  style,
  ...textProps
}: Props) {
  const [now, setNow] = useState<number>(Date.now());

  const startMs = useMemo(() => toMs(start), [start]);
  const endMs   = useMemo(() => toMs(end),   [end]);

  useEffect(() => {
    // If we don't have a valid start, or we already have an end, no ticking needed
    if (!startMs || endMs) return;

    const id = setInterval(() => setNow(Date.now()), refreshMs);
    return () => clearInterval(id);
  }, [startMs, endMs, refreshMs]);

  if (!startMs) {
    return <Text style={style} {...textProps}>{fallback}</Text>;
  }

  const effectiveEnd = endMs ?? now;
  const diff = Math.max(0, effectiveEnd - startMs);

  return (
    <Text style={style} {...textProps}>
      {prefix}
      {formatDuration(diff, showHours)}
    </Text>
  );
}

/* ---------------- helpers ---------------- */

function toMs(value: TimeLike): number | undefined {
  if (!value) return undefined;
  // Firestore Timestamp
  if (typeof (value as any)?.toMillis === "function") {
    return (value as Timestamp).toMillis();
  }
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  return undefined;
}

function formatDuration(ms: number, forceHours: boolean) {
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  if (forceHours || h > 0) {
    return [h, m, s].map(n => String(n).padStart(2, "0")).join(":"); // HH:MM:SS
  }
  // mm:ss
  return [m, s].map(n => String(n).padStart(2, "0")).join(":");
}

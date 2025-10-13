// functions/src/activity.ts

import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { setGlobalOptions } from "firebase-functions/v2";
import {
  onDocumentWritten,
  onDocumentCreated,
} from "firebase-functions/v2/firestore";

// ---- boot -------------------------------------------------------------
try { admin.app(); } catch { admin.initializeApp(); }
const db = admin.firestore();
setGlobalOptions({ region: "northamerica-northeast2", maxInstances: 10 });

/** Activity types */
type Actor = { id?: string; name?: string | null; role?: string | null } | null;
type Target =
  | { kind: "task" | "report" | "scheduler_item" | "security_run"; id: string };
type ActivityMeta = Record<string, any>;

/** Write a single activity row */
async function writeActivity(opts: {
  buildingId: string;
  type:
    | "task_created" | "task_completed" | "task_assigned" | "task_deleted" | "task_reviewed" | "task_updated"
    | "report_created" | "report_reviewed" | "report_updated"
    | "schedule_item_added" | "schedule_item_deleted" | "schedule_item_updated"
    | "security_check_submitted";
  summary: string;
  target: Target;
  actor?: Actor;
  meta?: ActivityMeta;
  requestId?: string | null; // optional idempotency
}) {
  const col = db.collection("buildings").doc(opts.buildingId).collection("activity");
  const ref = opts.requestId ? col.doc(opts.requestId) : col.doc();
  const payload = {
    ts: FieldValue.serverTimestamp(),
    type: opts.type,
    summary: opts.summary,
    target: opts.target,
    actor: opts.actor ?? null,
    meta: opts.meta ?? {},
    requestId: opts.requestId ?? null,
  };
  await ref.set(payload, { merge: Boolean(opts.requestId) });
}

/** Helpers */
function sameArray(a?: any[], b?: any[]) {
  const A = Array.isArray(a) ? a : [];
  const B = Array.isArray(b) ? b : [];
  if (A.length !== B.length) return false;
  for (let i = 0; i < A.length; i++) if (A[i] !== B[i]) return false;
  return true;
}

function diffFields(
  before: Record<string, any>,
  after: Record<string, any>,
  ignore: string[] = ["updatedAt", "createdAt", "ts", "requestId", "_lastWriter"]
) {
  const changed: Record<string, { from: any; to: any }> = {};
  if (!before || !after) return changed;

  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const k of keys) {
    if (ignore.includes(k)) continue;
    const a = before[k];
    const b = after[k];

    const isTs = (v: any) =>
      v instanceof admin.firestore.Timestamp || (v && typeof v.toDate === "function");
    const toJson = (v: any) => (isTs(v) ? v.toMillis?.() ?? v : v);

    const aj = toJson(a);
    const bj = toJson(b);

    const same =
      (Array.isArray(aj) && Array.isArray(bj) && JSON.stringify(aj) === JSON.stringify(bj)) ||
      (!Array.isArray(aj) && !Array.isArray(bj) && (
        (aj && typeof aj === "object") || (bj && typeof bj === "object")
          ? JSON.stringify(aj) === JSON.stringify(bj)
          : aj === bj
      ));

    if (!same) changed[k] = { from: aj ?? null, to: bj ?? null };
  }
  return changed;
}

function changedKeysSummary(changed: Record<string, { from: any; to: any }>, limit = 4) {
  const keys = Object.keys(changed);
  if (!keys.length) return "";
  const shown = keys.slice(0, limit).join(", ");
  return keys.length > limit ? `${shown}, +${keys.length - limit} more` : shown;
}

/* ===================== TASKS ===================== */
// /buildings/{b}/tasks/{t}
export const onTaskWrite = onDocumentWritten(
  { document: "buildings/{b}/tasks/{t}" },
  async (event) => {
    const b = event.params.b as string;
    const t = event.params.t as string;

    const before = event.data?.before.exists ? (event.data?.before.data() as any) : null;
    const after  = event.data?.after.exists  ? (event.data?.after.data() as any)  : null;

    // Deleted
    if (before && !after) {
      await writeActivity({
        buildingId: b,
        type: "task_deleted",
        summary: `Task deleted: ${before.title ?? t}`,
        target: { kind: "task", id: t },
        actor: before.updatedBy ?? before.actor ?? null,
        meta: { priority: before.priority ?? null, status: before.status ?? null },
      });
      return;
    }

    // Created
    if (!before && after) {
      await writeActivity({
        buildingId: b,
        type: "task_created",
        summary: `Task created: ${after.title ?? t}`,
        target: { kind: "task", id: t },
        actor: after.createdBy ?? after.actor ?? null,
        meta: {
          priority: after.priority ?? null,
          status: after.status ?? null,
          dayKey: after.dayKey ?? null,
        },
      });
      return;
    }

    // Updated
    if (!before || !after) return;

    // Completed transition
    if (before.status !== "completed" && after.status === "completed") {
      await writeActivity({
        buildingId: b,
        type: "task_completed",
        summary: `Task completed: ${after.title ?? t}`,
        target: { kind: "task", id: t },
        actor: after.updatedBy ?? after.actor ?? null,
        meta: {
          priority: after.priority ?? null,
          assigned: Array.isArray(after.assignedWorkers) ? after.assignedWorkers : [],
          completedAt: after.completedAt ?? null,
          dateYYYYMMDD: after.dateYYYYMMDD ?? null,
        },
      });
    }

    // Assignment changed
    const beforeAssigned = Array.isArray(before.assignedWorkers) ? before.assignedWorkers : [];
    const afterAssigned  = Array.isArray(after.assignedWorkers)  ? after.assignedWorkers  : [];
    if (!sameArray(beforeAssigned, afterAssigned)) {
      await writeActivity({
        buildingId: b,
        type: "task_assigned",
        summary: `Assignment updated: ${after.title ?? t}`,
        target: { kind: "task", id: t },
        actor: after.updatedBy ?? after.actor ?? null,
        meta: { assigned: afterAssigned },
      });
    }

    // Generic updates
    const taskChanged = diffFields(before, after, [
      "updatedAt","createdAt","ts","requestId","_lastWriter",
      "status","managerHasReviewed","reviewedAt","completedAt",
      "assignedWorkers","dateYYYYMMDD"
    ]);
    if (Object.keys(taskChanged).length) {
      await writeActivity({
        buildingId: b,
        type: "task_updated",
        summary: `Task updated: ${after.title ?? t} (${changedKeysSummary(taskChanged)})`,
        target: { kind: "task", id: t },
        actor: after.updatedBy ?? after.actor ?? null,
        meta: { changed: taskChanged },
      });
    }
  }
);

/* ===================== REPORTS ===================== */
// Create: /buildings/{b}/reports/{r}
export const onReportCreate = onDocumentCreated(
  { document: "buildings/{b}/reports/{r}" },
  async (event) => {
    const b = event.params.b as string;
    const r = event.params.r as string;
    const d = event.data?.data() as any;

    await writeActivity({
      buildingId: b,
      type: "report_created",
      summary: `Report created: ${d.title ?? r}`,
      target: { kind: "report", id: r },
      actor: d.createdBy ?? d.actor ?? null,
      meta: { status: d.status ?? "open", priority: d.priority ?? null },
    });
  }
);

// Review + generic updates: /buildings/{b}/reports/{r}
export const onReportWrite = onDocumentWritten(
  { document: "buildings/{b}/reports/{r}" },
  async (event) => {
    const b = event.params.b as string;
    const r = event.params.r as string;
    const before = event.data?.before.exists ? (event.data?.before.data() as any) : null;
    const after  = event.data?.after.exists  ? (event.data?.after.data() as any)  : null;

    if (!before || !after) return;

    const beforeReviewed = !!before.managerHasReviewed;
    const afterReviewed  = !!after.managerHasReviewed;

    if (!beforeReviewed && afterReviewed) {
      await writeActivity({
        buildingId: b,
        type: "report_reviewed",
        summary: `Report reviewed by manager: ${after.title ?? r}`,
        target: { kind: "report", id: r },
        actor: after.reviewedBy ?? after.updatedBy ?? after.actor ?? null,
        meta: { managerHasReviewed: true, reviewedAt: after.reviewedAt ?? null },
      });
    }

    const reportChanged = diffFields(before, after, [
      "updatedAt","createdAt","ts","requestId","_lastWriter",
      "managerHasReviewed","reviewedAt"
    ]);
    if (Object.keys(reportChanged).length) {
      await writeActivity({
        buildingId: b,
        type: "report_updated",
        summary: `Report updated: ${after.title ?? r} (${changedKeysSummary(reportChanged)})`,
        target: { kind: "report", id: r },
        actor: after.updatedBy ?? after.actor ?? null,
        meta: { changed: reportChanged },
      });
    }
  }
);

/* ===================== SCHEDULER ITEMS ===================== */
// /buildings/{b}/scheduler/{day}/items/{i}
export const onSchedulerItemWrite = onDocumentWritten(
  { document: "buildings/{b}/scheduler/{day}/items/{i}" },
  async (event) => {
    const b   = event.params.b   as string;
    const day = event.params.day as string;
    const i   = event.params.i   as string;

    const before = event.data?.before.exists ? (event.data?.before.data() as any) : null;
    const after  = event.data?.after.exists  ? (event.data?.after.data() as any)  : null;

    // CREATED — prefer createdBy first
    if (!before && after) {
      await writeActivity({
        buildingId: b,
        type: "schedule_item_added",
        summary: `Scheduler: added “${after.title ?? "Untitled"}” to ${day.toUpperCase()}`,
        target: { kind: "scheduler_item", id: i },
        actor: after.createdBy ?? after.updatedBy ?? after.actor ?? null,
        meta: { dayKey: day, order: after.order ?? 0 },
      });
      return;
    }

    // DELETED — prefer updatedBy, then createdBy
    if (before && !after) {
      await writeActivity({
        buildingId: b,
        type: "schedule_item_deleted",
        summary: `Scheduler: removed “${before.title ?? i}” from ${day.toUpperCase()}`,
        target: { kind: "scheduler_item", id: i },
        actor: before.updatedBy ?? before.createdBy ?? before.actor ?? null,
        meta: { dayKey: day },
      });
      return;
    }

    // UPDATED — prefer updatedBy, then createdBy
    if (before && after) {
      const changed = diffFields(before, after);
      if (Object.keys(changed).length) {
        await writeActivity({
          buildingId: b,
          type: "schedule_item_updated",
          summary: `Scheduler item updated: ${after.title ?? i} (${changedKeysSummary(changed)})`,
          target: { kind: "scheduler_item", id: i },
          actor: after.updatedBy ?? after.createdBy ?? after.actor ?? null,
          meta: { dayKey: day, changed },
        });
      }
    }
  }
);

/* ===================== SECURITY RUNS ===================== */
// /buildings/{b}/security_checklist_runs/{run}
export const onSecurityRunCreate = onDocumentCreated(
  { document: "buildings/{b}/security_checklist_runs/{run}" },
  async (event) => {
    const b = event.params.b as string;
    const run = event.params.run as string;
    const d = event.data?.data() as any;

    await writeActivity({
      buildingId: b,
      type: "security_check_submitted",
      summary: `Security run submitted${d?.timeWindow ? ` (${d.timeWindow})` : ""}`,
      target: { kind: "security_run", id: run },
      actor: d.submittedBy ?? d.createdBy ?? d.actor ?? null,
      meta: {
        checklistId: d.checklistId ?? null,
        startedAt: d.startedAt ?? null,
        finishedAt: d.finishedAt ?? null,
      },
    });
  }
);

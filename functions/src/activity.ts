// functions/src/activity.ts
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { setGlobalOptions } from "firebase-functions/v2";
import {
  onDocumentWritten,
  onDocumentCreated,
} from "firebase-functions/v2/firestore";

// Initialize Admin SDK
try { admin.app(); } catch { admin.initializeApp(); }
const db = admin.firestore();

// ✅ Match your Firestore/Storage region
setGlobalOptions({ region: "northamerica-northeast2", maxInstances: 10 });

/** Activity row: small, append-only */
type Actor = { id?: string; name?: string | null; role?: string | null } | null;
type Target = { kind: "task" | "report" | "scheduler_item"; id: string };
type ActivityMeta = Record<string, any>;

async function writeActivity(opts: {
  buildingId: string;
  type:
    | "task_created" | "task_completed" | "task_assigned" | "task_deleted"
    | "report_created" | "report_completed"
    | "schedule_item_added" | "schedule_item_deleted";
  summary: string;
  target: Target;
  actor?: Actor;
  meta?: ActivityMeta;
  requestId?: string | null; // optional: idempotency
}) {
  const col = db.collection("buildings").doc(opts.buildingId).collection("activity");
  const ref = opts.requestId ? col.doc(opts.requestId) : col.doc();
  const payload = {
    ts: FieldValue.serverTimestamp(),
    type: opts.type,
    summary: opts.summary,
    target: opts.target,      // { kind, id }
    actor: opts.actor ?? null, // { id, name, role } | null
    meta: opts.meta ?? {},     // tiny, queryable extras
    requestId: opts.requestId ?? null,
  };
  await ref.set(payload, { merge: Boolean(opts.requestId) });
}

/** Helper: shallow-equal arrays for assignment detection */
function sameArray(a?: any[], b?: any[]) {
  const A = Array.isArray(a) ? a : [];
  const B = Array.isArray(b) ? b : [];
  if (A.length !== B.length) return false;
  for (let i = 0; i < A.length; i++) if (A[i] !== B[i]) return false;
  return true;
}

/* ===================== TASKS ===================== */
// Listens to /buildings/{b}/tasks/{t}
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
        summary: `Completed: ${after.title ?? t}`,
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

// Completed transition: listen to writes if you want completion logs too
export const onReportWrite = onDocumentWritten(
  { document: "buildings/{b}/reports/{r}" },
  async (event) => {
    const b = event.params.b as string;
    const r = event.params.r as string;
    const before = event.data?.before.exists ? (event.data?.before.data() as any) : null;
    const after  = event.data?.after.exists  ? (event.data?.after.data() as any)  : null;
    if (!before || !after) return;

    if (before.status !== "completed" && after.status === "completed") {
      await writeActivity({
        buildingId: b,
        type: "report_completed",
        summary: `Report completed: ${after.title ?? r}`,
        target: { kind: "report", id: r },
        actor: after.updatedBy ?? after.actor ?? null,
        meta: { completedAt: after.completedAt ?? null },
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

    if (!before && after) {
      await writeActivity({
        buildingId: b,
        type: "schedule_item_added",
        summary: `Scheduler: added “${after.title ?? "Untitled"}” to ${day.toUpperCase()}`,
        target: { kind: "scheduler_item", id: i },
        actor: after.updatedBy ?? after.actor ?? null,
        meta: { dayKey: day, order: after.order ?? 0 },
      });
      return;
    }
    if (before && !after) {
      await writeActivity({
        buildingId: b,
        type: "schedule_item_deleted",
        summary: `Scheduler: removed “${before.title ?? i}” from ${day.toUpperCase()}`,
        target: { kind: "scheduler_item", id: i },
        actor: before.updatedBy ?? before.actor ?? null,
        meta: { dayKey: day },
      });
      return;
    }
    // (Optional) if you want reorder logs, compare before.order vs after.order
  }
);

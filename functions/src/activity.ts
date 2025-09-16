// functions/src/activity.ts
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { setGlobalOptions } from "firebase-functions/v2";
import {
  onDocumentWritten,
  onDocumentCreated,
} from "firebase-functions/v2/firestore";

// ---- boot logs -------------------------------------------------------------
console.log("[activity] module loaded");

// Initialize Admin SDK
try { admin.app(); } catch { admin.initializeApp(); }
const db = admin.firestore();

//  Match your Firestore/Storage region
setGlobalOptions({ region: "northamerica-northeast2", maxInstances: 10 });
console.log("[activity] setGlobalOptions", { region: "northamerica-northeast2", maxInstances: 10 });

/** Activity row: small, append-only */
type Actor = { id?: string; name?: string | null; role?: string | null } | null;
type Target =
  | { kind: "task" | "report" | "scheduler_item" | "security_run"; id: string };
type ActivityMeta = Record<string, any>;

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
  requestId?: string | null; // optional: idempotency
}) {
  console.log("[activity] writeActivity() start", {
    buildingId: opts.buildingId,
    type: opts.type,
    target: opts.target,
    requestId: opts.requestId ?? null,
  });

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
  console.log("[activity] writeActivity() wrote doc", { path: ref.path, id: ref.id, merge: Boolean(opts.requestId) });
}

/** Helper: shallow-equal arrays for assignment detection */
function sameArray(a?: any[], b?: any[]) {
  const A = Array.isArray(a) ? a : [];
  const B = Array.isArray(b) ? b : [];
  if (A.length !== B.length) return false;
  for (let i = 0; i < A.length; i++) if (A[i] !== B[i]) return false;
  return true;
}

/** Primitive-diff for updates (ignores noisy/system fields) */
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

    const isTimestamp = (v: any) =>
      v instanceof admin.firestore.Timestamp || (v && typeof v.toDate === "function");
    const asJson = (v: any) => (isTimestamp(v) ? v.toMillis?.() ?? v : v);

    const aJ = asJson(a);
    const bJ = asJson(b);

    const same =
      (Array.isArray(aJ) && Array.isArray(bJ) && JSON.stringify(aJ) === JSON.stringify(bJ)) ||
      (!Array.isArray(aJ) && !Array.isArray(bJ) && (
        (aJ && typeof aJ === "object") || (bJ && typeof bJ === "object")
          ? JSON.stringify(aJ) === JSON.stringify(bJ)
          : aJ === bJ
      ));

    if (!same) {
      changed[k] = { from: aJ ?? null, to: bJ ?? null };
    }
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
// Listens to /buildings/{b}/tasks/{t}
export const onTaskWrite = onDocumentWritten(
  { document: "buildings/{b}/tasks/{t}" },
  async (event) => {
    const b = event.params.b as string;
    const t = event.params.t as string;
    const before = event.data?.before.exists ? (event.data?.before.data() as any) : null;
    const after  = event.data?.after.exists  ? (event.data?.after.data() as any)  : null;

    console.log("[activity] onTaskWrite fired", {
      building: b, task: t, beforeExists: !!before, afterExists: !!after
    });

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

    // Updated (existing doc changed)
    if (!before || !after) return;

    // Completed transition by status
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

    // Reviewed transition (managerHasReviewed -> true)
    const beforeReviewed = !!before.managerHasReviewed;
    const afterReviewed  = !!after.managerHasReviewed;
    if (!beforeReviewed && afterReviewed) {
      await writeActivity({
        buildingId: b,
        type: "task_reviewed",
        summary: `Task reviewed by manager: ${after.title ?? t}`,
        target: { kind: "task", id: t },
        actor: after.reviewedBy ?? after.updatedBy ?? after.actor ?? null,
        meta: { managerHasReviewed: true, reviewedAt: after.reviewedAt ?? null },
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

    // Generic field-level updates (ignore fields we already log)
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

    console.log("[activity] onReportCreate fired", { building: b, report: r });

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

// Review transition: managerHasReviewed -> true
export const onReportWrite = onDocumentWritten(
  { document: "buildings/{b}/reports/{r}" },
  async (event) => {
    const b = event.params.b as string;
    const r = event.params.r as string;
    const before = event.data?.before.exists ? (event.data?.before.data() as any) : null;
    const after  = event.data?.after.exists  ? (event.data?.after.data() as any)  : null;

    console.log("[activity] onReportWrite fired", {
      building: b, report: r, beforeExists: !!before, afterExists: !!after
    });

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

    // Generic field-level updates (ignore review-related/system fields)
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

    console.log("[activity] onSchedulerItemWrite fired", {
      building: b, day, item: i, beforeExists: !!before, afterExists: !!after
    });

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

    // Field-level updates
    if (before && after) {
      const changed = diffFields(before, after);
      if (Object.keys(changed).length) {
        await writeActivity({
          buildingId: b,
          type: "schedule_item_updated",
          summary: `Scheduler item updated: ${after.title ?? i} (${changedKeysSummary(changed)})`,
          target: { kind: "scheduler_item", id: i },
          actor: after.updatedBy ?? after.actor ?? null,
          meta: { dayKey: day, changed },
        });
      }
    }
  }
);

/* ===================== SECURITY RUNS ===================== */
// Completed when a new run doc is created at /buildings/{b}/security_checklist_runs/{run}
export const onSecurityRunCreate = onDocumentCreated(
  { document: "buildings/{b}/security_checklist_runs/{run}" },
  async (event) => {
    const b = event.params.b as string;
    const run = event.params.run as string;
    const d = event.data?.data() as any;

    console.log("[activity] onSecurityRunCreate fired", { building: b, run });

    await writeActivity({
      buildingId: b,
      type: "security_check_submitted",
      summary: `Security run submitted${d?.timeWindow ? ` (${d.timeWindow})` : ""}`,
      target: { kind: "security_run", id: run },
      actor: d.submittedBy ?? d.createdBy ?? d.actor ?? null,
      meta: { checklistId: d.checklistId ?? null, startedAt: d.startedAt ?? null, finishedAt: d.finishedAt ?? null },
    });
  }
);

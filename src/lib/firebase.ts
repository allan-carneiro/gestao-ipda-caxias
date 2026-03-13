// src/lib/firebase.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  addDoc,
  collection,
  getFirestore,
  serverTimestamp,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { getStorage } from "firebase/storage";

import { getPaths } from "./demo/paths";
import { getUserRoleFromToken } from "./auth/getUserRole";

const firebaseConfig = {
  apiKey: "AIzaSyDs0q_-lJbt21SazyTX3Dj4R4NXVy2_5Yc",
  authDomain: "gestao-igreja-deus-e-amor.firebaseapp.com",
  projectId: "gestao-igreja-deus-e-amor",
  storageBucket: "gestao-igreja-deus-e-amor.appspot.com",
  messagingSenderId: "1018859862216",
  appId: "1:1018859862216:web:cf53c31ba6408b119e4dfd",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, "southamerica-east1");

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "activate"
  | "inactivate"
  | "mark_presence_control"
  | "unmark_presence_control"
  | "add_month_record"
  | "remove_month_record"
  | "finalize_month"
  | "clear_control_month"
  | "sync_control_from_sheets"
  | "sync_record_from_sheets";

export type AuditEntity =
  | "membro"
  | "ceia_controle"
  | "ceia_registro"
  | "ceia_mes"
  | "sistema";

export type WriteAuditLogInput = {
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string | null;
  entityLabel?: string | null;
  details?: string | null;
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
  metadata?: Record<string, any> | null;
};

function sanitizeForAudit(value: unknown): unknown {
  if (value === undefined || value === null) return null;

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, 50).map(sanitizeForAudit);
  }

  if (typeof value === "object") {
    const out: Record<string, unknown> = {};

    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      out[key] = sanitizeForAudit(val);
    }

    return out;
  }

  return String(value);
}

export async function writeAuditLog(input: WriteAuditLogInput) {
  try {
    const user = auth.currentUser;
    const role = await getUserRoleFromToken();
    const paths = getPaths(role ?? undefined);

    await addDoc(collection(db, paths.auditoria), {
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      entityLabel: input.entityLabel ?? null,
      details: input.details ?? null,

      userUid: user?.uid ?? null,
      userEmail: user?.email ?? null,
      userDisplayName: user?.displayName ?? null,

      before: sanitizeForAudit(input.before ?? null),
      after: sanitizeForAudit(input.after ?? null),
      metadata: sanitizeForAudit(input.metadata ?? null),

      occurredAtIso: new Date().toISOString(),
      createdAt: serverTimestamp(),
    });

    return true;
  } catch (error) {
    console.error("Falha ao gravar auditoria:", error);
    return false;
  }
}

export const resetDemoDataCallable = httpsCallable(functions, "resetDemoData");
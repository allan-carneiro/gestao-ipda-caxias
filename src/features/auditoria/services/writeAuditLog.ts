import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/src/lib/firebase";
import { getPaths } from "@/src/lib/demo/paths";
import { getUserRoleFromToken } from "@/src/lib/auth/getUserRole";
import type { WriteAuditLogInput } from "../types";

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
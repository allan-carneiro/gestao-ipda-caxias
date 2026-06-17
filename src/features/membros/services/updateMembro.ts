import { doc, updateDoc } from "firebase/firestore";

import { db } from "@/src/lib/firebase";
import { writeAuditLog } from "@/src/features/auditoria/services/writeAuditLog";
import type { AuditAction, AuditEntity } from "@/src/features/auditoria/types";
import type { Membro } from "../types";

type UpdateMembroInput = {
  id: string;
  payload: Partial<Membro>;
  paths: {
    membros: string;
  };
  audit?: {
    action: AuditAction;
    entity: AuditEntity;
    entityId?: string | null;
    entityLabel?: string | null;
    details?: string | null;
    before?: Record<string, any> | null;
    after?: Record<string, any> | null;
    metadata?: Record<string, any> | null;
  };
};

export async function updateMembro({
  id,
  payload,
  paths,
  audit,
}: UpdateMembroInput) {
  await updateDoc(doc(db, paths.membros, id), payload);

  if (audit) {
    await writeAuditLog({
      action: audit.action,
      entity: audit.entity,
      entityId: audit.entityId,
      entityLabel: audit.entityLabel,
      details: audit.details,
      before: audit.before,
      after: audit.after,
      metadata: audit.metadata,
    });
  }

  return {
    id,
  };
}
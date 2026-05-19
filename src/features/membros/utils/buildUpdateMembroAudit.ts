import type { Membro } from "../types";

type BuildUpdateMembroAuditInput = {
  id: string;
  original: Membro | null;
  updated: Partial<Membro>;
};

export function buildUpdateMembroAudit({
  id,
  original,
  updated,
}: BuildUpdateMembroAuditInput) {
  return {
    action: "update" as const,
    entity: "membro" as const,
    entityId: id,

    before: original
      ? {
          nomeCompleto: original.nomeCompleto,
          status: original.status,
          telefoneCelular: original.telefoneCelular,
          email: original.email,
        }
      : null,

    after: {
      nomeCompleto: updated.nomeCompleto,
      status: updated.status,
      telefoneCelular: updated.telefoneCelular,
      email: updated.email,
    },

    metadata: {
      origem: "editar_membro_page",
    },
  };
}
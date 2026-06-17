import { addDoc, collection } from "firebase/firestore";

import { db } from "@/src/lib/firebase";
import { writeAuditLog } from "@/src/features/auditoria/services/writeAuditLog";

import type { Membro } from "../types";

type CreateMembroInput = {
  payload: Membro;
  paths: {
    membros: string;
  };
  userRole?: string | null;
};

function buildMembroAuditSnapshot(payload: Partial<Membro>) {
  return {
    nomeCompleto: payload.nomeCompleto ?? null,
    status: payload.status ?? null,
    cpf: payload.cpf ?? null,
    telefoneCelular: payload.telefoneCelular ?? null,
    email: payload.email ?? null,
    dataNascimento: payload.dataNascimento ?? null,
    congregacao: payload.congregacao ?? null,
    pastor: payload.pastor ?? null,
    campo: payload.campo ?? null,
    cargoEclesiastico: payload.cargoEclesiastico ?? null,
    numeroRol: payload.numeroRol ?? null,
    telCarta: payload.telCarta ?? null,
    fotoUrl: payload.fotoUrl ?? null,
    endereco: payload.endereco ?? null,
    updatedAt: payload.updatedAt ?? null,
    createdAt: payload.createdAt ?? null,
  };
}

export async function createMembro({
  payload,
  paths,
  userRole,
}: CreateMembroInput) {
  const ref = await addDoc(
  collection(db, paths.membros),
  payload
);

  await writeAuditLog({
    action: "create",
    entity: "membro",
    entityId: ref.id,
    entityLabel: payload.nomeCompleto ?? "(Sem nome)",
    details: "Cadastro de membro criado.",
    after: buildMembroAuditSnapshot(payload),
    metadata: {
      origem: "app/membros/novo",
      role: userRole ?? null,
      dataRoot: paths.membros,
    },
  });

  return {
    id: ref.id,
  };
}
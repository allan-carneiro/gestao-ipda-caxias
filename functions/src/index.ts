/**
 * Cloud Functions — Gestão IPDA Caxias
 * Enterprise mode: deletes only via server (Admin SDK)
 */

import { setGlobalOptions } from "firebase-functions";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

// Recomendado: região BR (São Paulo)
setGlobalOptions({
  region: "southamerica-east1",
  maxInstances: 10,
});

// Inicializa Admin SDK uma vez
admin.initializeApp();

function isValidYearMonth(ym: string) {
  // YYYY-MM com mês 01-12
  return /^[0-9]{4}-(0[1-9]|1[0-2])$/.test(ym);
}

function isValidMembroId(id: string) {
  // id de documento Firestore não pode ter "/" e não pode ser "[object Object]"
  // Ajuste aqui se você tiver um padrão específico de IDs.
  if (typeof id !== "string") return false;
  const s = id.trim();
  if (!s) return false;
  if (s.includes("/")) return false;
  if (s.includes("[object Object]")) return false;
  if (s.length < 6 || s.length > 128) return false;
  return true;
}

/**
 * Callable: deleteCeiaRegistro
 * Input: { yearMonth: "YYYY-MM", membroId: "..." }
 * Deletes:
 *  - ceia_registros/{YYYY-MM}-{membroId}
 *  - ceia_controle/{YYYY-MM}/participantes/{membroId}
 */
export const deleteCeiaRegistro = onCall(async (request) => {
  // 1) Auth obrigatório
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Login obrigatório.");
  }

  // 2) Role via custom claims
  const role = (request.auth.token as any)?.role;
  if (role !== "admin" && role !== "secretaria") {
    throw new HttpsError("permission-denied", "Sem permissão.");
  }

  // 3) Validar payload
  const yearMonth = String((request.data as any)?.yearMonth ?? "");
  const membroId = String((request.data as any)?.membroId ?? "");

  if (!isValidYearMonth(yearMonth)) {
    throw new HttpsError(
      "invalid-argument",
      "yearMonth inválido. Use o formato YYYY-MM (ex: 2026-02)."
    );
  }

  if (!isValidMembroId(membroId)) {
    throw new HttpsError("invalid-argument", "membroId inválido.");
  }

  const db = admin.firestore();

  const registroId = `${yearMonth}-${membroId}`;

  const registroRef = db.collection("ceia_registros").doc(registroId);
  const participanteRef = db
    .collection("ceia_controle")
    .doc(yearMonth)
    .collection("participantes")
    .doc(membroId);

  // (Opcional, mas útil): confirmar que existe algo antes de deletar
  // Assim você consegue retornar um feedback mais claro no client
  const [registroSnap, participanteSnap] = await Promise.all([
    registroRef.get(),
    participanteRef.get(),
  ]);

  if (!registroSnap.exists && !participanteSnap.exists) {
    // nada para deletar (não é erro fatal)
    return { ok: true, deleted: 0 };
  }

  const batch = db.batch();
  if (registroSnap.exists) batch.delete(registroRef);
  if (participanteSnap.exists) batch.delete(participanteRef);
  await batch.commit();

  return { ok: true, deleted: 1 };
});
import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  deleteDoc,
  where,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import { validateAnoMes } from "@/src/lib/validators";

import { atualizarFaltasSeguidasCeia } from "@/src/lib/ceiaRecorrencia";

/* =============================
   TIPOS
============================= */

export type CeiaControleItem = {
  membroId: string;
  nome: string;
  presente: boolean;
};

export type CeiaRegistroItem = {
  id: string;
  ano: number;
  mes: number;
  membroId: string;
  nome: string;
};

/* =============================
   HELPERS
============================= */

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function assertAnoMes(ano: number, mes: number) {
  const v = validateAnoMes(ano, mes);
  if (!v.ok) {
    const msg =
      (v as any).message ??
      (v as any).mensagem ??
      (v as any).error ??
      "Ano/mês inválidos.";
    throw new Error(msg);
  }
}

function ymDocId(ano: number, mes: number) {
  assertAnoMes(ano, mes);
  return `${ano}-${pad2(mes)}`;
}

function normalizeNome(v: any) {
  const s = String(v ?? "").trim();
  return s || "";
}

/**
 * ✅ ID do membro no Firestore NÃO pode ter "/"
 * (e não pode ser vazio)
 */
function assertValidMemberId(membroId: string) {
  const id = String(membroId ?? "").trim();
  if (!id) throw new Error("membroId inválido (vazio).");
  if (id.includes("/")) throw new Error("membroId inválido (contém '/').");
  return id;
}

/**
 * ✅ FIX: batch Firestore tem limite (500 ops).
 * Faz commit em lotes (default 450 pra margem de segurança).
 */
async function commitInChunks(
  buildOps: (batch: ReturnType<typeof writeBatch>) => number,
  chunkSize = 450
) {
  let totalOps = 0;

  while (true) {
    const batch = writeBatch(db);
    const ops = buildOps(batch);

    if (!ops) break;

    if (ops > chunkSize) {
      // proteção: se alguém programar buildOps errado, evita loop infinito
      throw new Error(
        `Batch excedeu o limite interno (ops=${ops}, chunkSize=${chunkSize}).`
      );
    }

    await batch.commit();
    totalOps += ops;
  }

  return totalOps;
}

/**
 * ID determinístico do registro do mês:
 * ceia_registros/{YYYY-MM}-{membroId}
 */
function registroDocId(ano: number, mes: number, membroId: string) {
  const ym = ymDocId(ano, mes);
  const memberId = assertValidMemberId(membroId);
  return `${ym}-${memberId}`;
}

/* =============================
   CONTROLE AO VIVO
============================= */

export async function listarControleCeia(
  ano: number,
  mes: number
): Promise<CeiaControleItem[]> {
  assertAnoMes(ano, mes);

  const ym = ymDocId(ano, mes);
  const colRef = collection(db, "ceia_controle", ym, "participantes");
  const snap = await getDocs(colRef);

  return snap.docs.map((d) => {
    const data = d.data() as any;

    // compat: aceita docId antigo ou membroId salvo no campo
    const membroId = String(data?.membroId ?? d.id).trim();
    const nome = normalizeNome(data?.membroNome ?? data?.nome);

    return {
      membroId,
      nome,
      presente: data?.presente === true,
    };
  });
}

/**
 * ✅ BLINDADO:
 * - grava no controle
 * - se presente=false => apaga automaticamente o registro do mês em ceia_registros
 *   (evita "registro preso" no dashboard)
 */
export async function marcarPresencaNoControle(
  ano: number,
  mes: number,
  membroId: string,
  nome: string,
  presente: boolean
) {
  assertAnoMes(ano, mes);

  const ym = ymDocId(ano, mes);
  const memberId = assertValidMemberId(membroId);
  const ref = doc(db, "ceia_controle", ym, "participantes", memberId);

  const nomeNorm = normalizeNome(nome);

  await setDoc(
    ref,
    {
      membroId: memberId,
      nome: nomeNorm,
      membroNome: nomeNorm, // compat com seus fallbacks no dashboard.ts
      presente: presente === true,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  // ✅ Se desmarcou no controle, remove o registro do mês também
  if (presente !== true) {
    const regId = registroDocId(ano, mes, memberId);
    await deleteDoc(doc(db, "ceia_registros", regId));
  }
}

/* =============================
   REGISTRO MENSAL
============================= */

export async function listarRegistroCeia(
  ano: number,
  mes: number
): Promise<CeiaRegistroItem[]> {
  assertAnoMes(ano, mes);

  const q = query(
    collection(db, "ceia_registros"),
    where("ano", "==", ano),
    where("mes", "==", mes)
  );

  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data() as any;

    return {
      id: d.id,
      ano: Number(data?.ano) || ano,
      mes: Number(data?.mes) || mes,
      membroId: String(data?.membroId ?? "").trim() || d.id,
      nome: normalizeNome(data?.nome),
    };
  });
}

export async function registrarCeiaNoMes(
  ano: number,
  mes: number,
  membroId: string,
  nome: string
) {
  assertAnoMes(ano, mes);

  const memberId = assertValidMemberId(membroId);
  const id = registroDocId(ano, mes, memberId);
  const ref = doc(db, "ceia_registros", id);

  await setDoc(
    ref,
    {
      ano,
      mes,
      membroId: memberId,
      nome: normalizeNome(nome),
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function removerRegistroCeiaNoMes(
  ano: number,
  mes: number,
  membroId: string
) {
  assertAnoMes(ano, mes);

  const memberId = assertValidMemberId(membroId);
  const id = registroDocId(ano, mes, memberId);
  await deleteDoc(doc(db, "ceia_registros", id));
}

/* =============================
   FINALIZAR MÊS
============================= */

export async function finalizarCeiaDoMes(ano: number, mes: number) {
  assertAnoMes(ano, mes);

  const ym = ymDocId(ano, mes);

  const controle = await listarControleCeia(ano, mes);
  const presentes = controle.filter((p) => p.presente);

  const batch = writeBatch(db);
  let total = 0;

  const presentesIds: string[] = [];

  for (const p of presentes) {
    const memberId = assertValidMemberId(p.membroId);
    presentesIds.push(memberId);

    const id = registroDocId(ano, mes, memberId);
    const ref = doc(db, "ceia_registros", id);

    batch.set(
      ref,
      {
        ano,
        mes,
        membroId: memberId,
        nome: normalizeNome(p.nome),
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      },
      { merge: true }
    );

    total++;
  }

  await batch.commit();

  await atualizarFaltasSeguidasCeia({
    mesKey: ym,
    presentesIds,
  });

  return { total };
}

/* =============================
   DESMARCAR TODOS (CONTROLE)
   ✅ BLINDADO: também apaga todos os registros do mês
   ✅ FIX: chunk batches (limite 500 ops)
============================= */

export async function desmarcarTodosNoControle(ano: number, mes: number) {
  assertAnoMes(ano, mes);

  const ym = ymDocId(ano, mes);
  const colRef = collection(db, "ceia_controle", ym, "participantes");
  const snap = await getDocs(colRef);

  // 1) desmarca presentes no controle (em chunks)
  const docsToUnmark = snap.docs.filter((d) => (d.data() as any)?.presente === true);

  let idx1 = 0;
  const total = await commitInChunks((batch) => {
    if (idx1 >= docsToUnmark.length) return 0;

    let ops = 0;
    while (idx1 < docsToUnmark.length && ops < 450) {
      const d = docsToUnmark[idx1];
      batch.set(
        doc(db, "ceia_controle", ym, "participantes", d.id),
        { presente: false, updatedAt: serverTimestamp() },
        { merge: true }
      );
      idx1++;
      ops++;
    }
    return ops;
  });

  // 2) apaga todos os registros daquele ano/mês (em chunks)
  const qRegs = query(
    collection(db, "ceia_registros"),
    where("ano", "==", ano),
    where("mes", "==", mes)
  );
  const regsSnap = await getDocs(qRegs);

  if (!regsSnap.empty) {
    const regs = regsSnap.docs;
    let idx2 = 0;

    await commitInChunks((batch) => {
      if (idx2 >= regs.length) return 0;

      let ops = 0;
      while (idx2 < regs.length && ops < 450) {
        batch.delete(regs[idx2].ref);
        idx2++;
        ops++;
      }
      return ops;
    });
  }

  return { total };
}

/* =============================
   REGISTRO ANUAL
============================= */

export async function listarRegistroCeiaAno(
  ano: number
): Promise<CeiaRegistroItem[]> {
  const q = query(collection(db, "ceia_registros"), where("ano", "==", ano));
  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data() as any;

    return {
      id: d.id,
      ano: Number(data?.ano) || ano,
      mes: Number(data?.mes) || 0,
      membroId: String(data?.membroId ?? "").trim() || d.id,
      nome: normalizeNome(data?.nome),
    };
  });
}
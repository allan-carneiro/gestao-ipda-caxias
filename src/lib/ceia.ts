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
import { getPaths, getCeiaParticipantesPath } from "@/src/lib/demo/paths";
import { getUserRoleFromToken } from "@/src/lib/auth/getUserRole";

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

function assertValidMemberId(membroId: string) {
  const id = String(membroId ?? "").trim();
  if (!id) throw new Error("membroId inválido (vazio).");
  if (id.includes("/")) throw new Error("membroId inválido (contém '/').");
  return id;
}

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
      throw new Error(
        `Batch excedeu o limite interno (ops=${ops}, chunkSize=${chunkSize}).`
      );
    }

    await batch.commit();
    totalOps += ops;
  }

  return totalOps;
}

function registroDocId(ano: number, mes: number, membroId: string) {
  const ym = ymDocId(ano, mes);
  const memberId = assertValidMemberId(membroId);
  return `${ym}-${memberId}`;
}

async function resolvePaths() {
  const role = await getUserRoleFromToken();
  return getPaths(role ?? undefined);
}

/* =============================
   CONTROLE AO VIVO
============================= */

export async function listarControleCeia(
  ano: number,
  mes: number
): Promise<CeiaControleItem[]> {
  assertAnoMes(ano, mes);

  const role = await getUserRoleFromToken();
  const colRef = collection(db, getCeiaParticipantesPath(role ?? undefined, ano, mes));
  const snap = await getDocs(colRef);

  return snap.docs.map((d) => {
    const data = d.data() as any;

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
 * grava no controle
 * se presente=false => apaga automaticamente o registro do mês em ceia_registros
 */
export async function marcarPresencaNoControle(
  ano: number,
  mes: number,
  membroId: string,
  nome: string,
  presente: boolean
) {
  assertAnoMes(ano, mes);

  const role = await getUserRoleFromToken();
  const paths = getPaths(role ?? undefined);

  const ym = ymDocId(ano, mes);
  const memberId = assertValidMemberId(membroId);
  const ref = doc(
    db,
    getCeiaParticipantesPath(role ?? undefined, ano, mes),
    memberId
  );

  const nomeNorm = normalizeNome(nome);

  await setDoc(
    ref,
    {
      membroId: memberId,
      nome: nomeNorm,
      membroNome: nomeNorm,
      presente: presente === true,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  if (presente !== true) {
    const regId = registroDocId(ano, mes, memberId);
    await deleteDoc(doc(db, paths.ceiaRegistros, regId));
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

  const paths = await resolvePaths();

  const q = query(
    collection(db, paths.ceiaRegistros),
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

  const paths = await resolvePaths();

  const memberId = assertValidMemberId(membroId);
  const id = registroDocId(ano, mes, memberId);
  const ref = doc(db, paths.ceiaRegistros, id);

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

  const paths = await resolvePaths();

  const memberId = assertValidMemberId(membroId);
  const id = registroDocId(ano, mes, memberId);
  await deleteDoc(doc(db, paths.ceiaRegistros, id));
}

/* =============================
   FINALIZAR MÊS
============================= */

export async function finalizarCeiaDoMes(ano: number, mes: number) {
  assertAnoMes(ano, mes);

  const paths = await resolvePaths();
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
    const ref = doc(db, paths.ceiaRegistros, id);

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
   também apaga todos os registros do mês
============================= */

export async function desmarcarTodosNoControle(ano: number, mes: number) {
  assertAnoMes(ano, mes);

  const role = await getUserRoleFromToken();
  const paths = getPaths(role ?? undefined);
  const ym = ymDocId(ano, mes);

  const colRef = collection(db, getCeiaParticipantesPath(role ?? undefined, ano, mes));
  const snap = await getDocs(colRef);

  const docsToUnmark = snap.docs.filter((d) => (d.data() as any)?.presente === true);

  const participantesPath = getCeiaParticipantesPath(role ?? undefined, ano, mes);

  const total = await commitInChunks((batch) => {
    let ops = 0;

    while (docsToUnmark.length > 0 && ops < 450) {
      const d = docsToUnmark.shift()!;
      batch.set(
        doc(db, participantesPath, d.id),
        { presente: false, updatedAt: serverTimestamp() },
        { merge: true }
      );
      ops++;
    }

    return ops;
  });

  const qRegs = query(
    collection(db, paths.ceiaRegistros),
    where("ano", "==", ano),
    where("mes", "==", mes)
  );
  const regsSnap = await getDocs(qRegs);

  if (!regsSnap.empty) {
    const regs = [...regsSnap.docs];

    await commitInChunks((batch) => {
      let ops = 0;

      while (regs.length > 0 && ops < 450) {
        const reg = regs.shift()!;
        batch.delete(reg.ref);
        ops++;
      }

      return ops;
    });
  }

  return { total, ym };
}

/* =============================
   REGISTRO ANUAL
============================= */

export async function listarRegistroCeiaAno(
  ano: number
): Promise<CeiaRegistroItem[]> {
  const paths = await resolvePaths();

  const q = query(collection(db, paths.ceiaRegistros), where("ano", "==", ano));
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
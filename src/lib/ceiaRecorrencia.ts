import {
  collection,
  getDocs,
  writeBatch,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import { getPaths } from "@/src/lib/demo/paths";
import { getUserRoleFromToken } from "@/src/lib/auth/getUserRole";

type Params = {
  mesKey: string;
  presentesIds: string[];
};

function toMonthIndex(mesKey: string): number | null {
  const m = String(mesKey ?? "").trim().match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;

  const ano = Number(m[1]);
  const mes = Number(m[2]);

  if (!Number.isFinite(ano) || mes < 1 || mes > 12) return null;

  return ano * 12 + (mes - 1);
}

function isValidMesKey(mesKey: string) {
  return toMonthIndex(mesKey) != null;
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatMesKeyToPtBR(mesKey: string): string {
  const m = String(mesKey ?? "").trim().match(/^(\d{4})-(\d{2})$/);
  if (!m) return "";
  return `${m[2]}/${m[1]}`;
}

function formatSeqLabel(seq: string[]): string {
  return seq.map(formatMesKeyToPtBR).filter(Boolean).join(" → ");
}

function makeMesKey(ano: number, mes: number) {
  return `${ano}-${pad2(mes)}`;
}

export async function atualizarFaltasSeguidasCeia({
  mesKey,
  presentesIds,
}: Params) {
  const mk = String(mesKey ?? "").trim();

  if (!isValidMesKey(mk)) {
    throw new Error(`mesKey inválido: "${mesKey}". Esperado "YYYY-MM".`);
  }

  const role = await getUserRoleFromToken();
  const paths = getPaths(role ?? undefined);

  const membrosSnap = await getDocs(collection(db, paths.membros));
  const registrosSnap = await getDocs(collection(db, paths.ceiaRegistros));

  const presentesPorMes = new Map<string, Set<string>>();

  registrosSnap.docs.forEach((d) => {
    const data = d.data() as any;

    const ano = Number(data?.ano);
    const mes = Number(data?.mes);
    const membroId = String(data?.membroId ?? "").trim();

    if (!ano || !mes || !membroId) return;

    const key = makeMesKey(ano, mes);

    if (!isValidMesKey(key)) return;

    if (!presentesPorMes.has(key)) {
      presentesPorMes.set(key, new Set<string>());
    }

    presentesPorMes.get(key)!.add(membroId);
  });

  presentesPorMes.set(
    mk,
    new Set(
      (presentesIds ?? [])
        .map((x) => String(x ?? "").trim())
        .filter(Boolean)
    )
  );

  const mesesFinalizados = Array.from(presentesPorMes.keys())
    .filter(isValidMesKey)
    .sort((a, b) => toMonthIndex(a)! - toMonthIndex(b)!);

  const batch = writeBatch(db);

  membrosSnap.docs.forEach((membroDoc) => {
    const data = membroDoc.data() as any;

    if (data?.status !== "Ativo") {
      batch.update(doc(db, paths.membros, membroDoc.id), {
        ceiaFaltasSeq: [],
        ceiaFaltasSeqLabel: "",
        faltasSeguidasCeia: 0,
        ceiaFaltanteRecorrente: false,
        ceiaObs: "",
        ceiaUltimoMesProcessado: mk,
        ceiaRecorrenciaUpdatedAt: serverTimestamp(),
      });
      return;
    }

    let seq: string[] = [];
    let lastIdx: number | null = null;

    for (const mesAtualKey of mesesFinalizados) {
      const idx = toMonthIndex(mesAtualKey);
      if (idx == null) continue;

      if (lastIdx != null && idx - lastIdx > 1) {
        seq = [];
      }

      const presentesDoMes = presentesPorMes.get(mesAtualKey) ?? new Set();
      const estevePresente = presentesDoMes.has(membroDoc.id);

      if (estevePresente) {
        seq = [];
      } else {
        seq.push(mesAtualKey);
      }

      if (seq.length > 6) {
        seq = seq.slice(seq.length - 6);
      }

      lastIdx = idx;
    }

    const faltas = seq.length;
    const recorrente = faltas >= 3;

    batch.update(doc(db, paths.membros, membroDoc.id), {
      ceiaFaltasSeq: seq,
      ceiaFaltasSeqLabel: formatSeqLabel(seq),
      faltasSeguidasCeia: faltas,
      ceiaFaltanteRecorrente: recorrente,
      ceiaObs: recorrente
        ? "Faltante recorrente da Santa Ceia (3+ meses consecutivos)."
        : "",
      ceiaUltimoMesProcessado: mk,
      ceiaRecorrenciaUpdatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
}
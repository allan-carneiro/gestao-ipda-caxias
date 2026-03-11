import {
  collection,
  getDocs,
  query,
  where,
  writeBatch,
  doc,
} from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import { getPaths } from "@/src/lib/demo/paths";
import { getUserRoleFromToken } from "@/src/lib/auth/getUserRole";

type Params = {
  mesKey: string; // "YYYY-MM" (ex: "2026-02")
  presentesIds: string[]; // lista de IDs presentes nesse mês finalizado
};

type CeiaSeqState = {
  seq: string[];
  label: string;
  faltas: number;
  recorrente: boolean;
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

function formatMesKeyToPtBR(mesKey: string): string {
  const m = String(mesKey ?? "").trim().match(/^(\d{4})-(\d{2})$/);
  if (!m) return "";
  return `${m[2]}/${m[1]}`;
}

function formatSeqLabel(seq: string[]): string {
  const parts = (seq ?? [])
    .map((k) => String(k ?? "").trim())
    .filter((k) => isValidMesKey(k))
    .map(formatMesKeyToPtBR)
    .filter(Boolean);

  return parts.join(" → ");
}

function normalizeSeq(raw: any, limit: number): string[] {
  const arr = Array.isArray(raw) ? raw : [];
  const valid = arr
    .map((x) => String(x ?? "").trim())
    .filter((k) => isValidMesKey(k));

  const out: string[] = [];
  const seen = new Set<string>();
  for (const k of valid) {
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }

  out.sort((a, b) => toMonthIndex(a)! - toMonthIndex(b)!);

  return out.slice(Math.max(0, out.length - limit));
}

function computeNextState(args: {
  mk: string;
  currentIdx: number;
  lastKey: string;
  lastIdx: number | null;
  isPresente: boolean;
  prevSeqRaw: any;
}): CeiaSeqState {
  const { mk, currentIdx, lastKey, lastIdx, isPresente, prevSeqRaw } = args;

  const prevSeq = normalizeSeq(prevSeqRaw, 6);

  if (isPresente) {
    return {
      seq: [],
      label: "",
      faltas: 0,
      recorrente: false,
    };
  }

  const diff = lastIdx == null ? 1 : currentIdx - lastIdx;

  let nextSeq: string[];

  if (diff > 1) {
    nextSeq = [mk];
  } else {
    const lastKeyIdx = lastKey ? toMonthIndex(lastKey) : null;
    const alignedPrev =
      lastKeyIdx == null
        ? prevSeq
        : prevSeq.filter((k) => (toMonthIndex(k) ?? -1) <= lastKeyIdx);

    const tail = alignedPrev[alignedPrev.length - 1];
    if (tail === mk) {
      nextSeq = alignedPrev;
    } else {
      nextSeq = [...alignedPrev, mk];
    }
  }

  nextSeq = normalizeSeq(nextSeq, 6);

  const faltas = nextSeq.length;
  const recorrente = faltas >= 3;

  return {
    seq: nextSeq,
    label: formatSeqLabel(nextSeq),
    faltas,
    recorrente,
  };
}

export async function atualizarFaltasSeguidasCeia({
  mesKey,
  presentesIds,
}: Params) {
  const mk = String(mesKey ?? "").trim();
  if (!isValidMesKey(mk)) {
    throw new Error(`mesKey inválido: "${mesKey}". Esperado "YYYY-MM".`);
  }

  const currentIdx = toMonthIndex(mk)!;

  const presentesSet = new Set(
    (presentesIds ?? [])
      .map((x) => String(x ?? "").trim())
      .filter(Boolean)
  );

  const role = await getUserRoleFromToken();
  const paths = getPaths(role ?? undefined);

  const membrosRef = collection(db, paths.membros);
  const qMembros = query(membrosRef, where("status", "==", "Ativo"));
  const snap = await getDocs(qMembros);

  const batch = writeBatch(db);

  snap.docs.forEach((d) => {
    const data = d.data() as any;

    const lastKey = String(data.ceiaUltimoMesProcessado ?? "").trim();

    if (lastKey === mk) return;

    const lastIdx = lastKey ? toMonthIndex(lastKey) : null;

    if (lastIdx != null && currentIdx <= lastIdx) return;

    const isPresente = presentesSet.has(d.id);
    const prevSeqRaw = data.ceiaFaltasSeq;

    const next = computeNextState({
      mk,
      currentIdx,
      lastKey,
      lastIdx,
      isPresente,
      prevSeqRaw,
    });

    batch.update(doc(db, paths.membros, d.id), {
      ceiaFaltasSeq: next.seq,
      ceiaFaltasSeqLabel: next.label,
      faltasSeguidasCeia: next.faltas,
      ceiaFaltanteRecorrente: next.recorrente,
      ceiaObs: next.recorrente
        ? "Faltante recorrente da Santa Ceia (3+ meses consecutivos)."
        : "",
      ceiaUltimoMesProcessado: mk,
    });
  });

  await batch.commit();
}
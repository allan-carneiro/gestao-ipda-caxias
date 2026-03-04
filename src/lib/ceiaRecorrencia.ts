import {
  collection,
  getDocs,
  query,
  where,
  writeBatch,
  doc,
} from "firebase/firestore";
import { db } from "@/src/lib/firebase";

type Params = {
  mesKey: string; // "YYYY-MM" (ex: "2026-02")
  presentesIds: string[]; // lista de IDs presentes nesse mês finalizado
};

type CeiaSeqState = {
  seq: string[]; // ["YYYY-MM", ...] (apenas faltas consecutivas)
  label: string; // "MM/AAAA → ..."
  faltas: number; // compat: faltasSeguidasCeia
  recorrente: boolean; // compat: ceiaFaltanteRecorrente
};

/** "YYYY-MM" -> number (ano*12 + (mes-1)) */
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
  return `${m[2]}/${m[1]}`; // "MM/YYYY"
}

function formatSeqLabel(seq: string[]): string {
  const parts = (seq ?? [])
    .map((k) => String(k ?? "").trim())
    .filter((k) => isValidMesKey(k))
    .map(formatMesKeyToPtBR)
    .filter(Boolean);

  return parts.join(" → ");
}

/** Garante array de mesKey válidos, únicos, ordenados e limita aos últimos N */
function normalizeSeq(raw: any, limit: number): string[] {
  const arr = Array.isArray(raw) ? raw : [];
  const valid = arr
    .map((x) => String(x ?? "").trim())
    .filter((k) => isValidMesKey(k));

  // remove duplicatas preservando ordem
  const out: string[] = [];
  const seen = new Set<string>();
  for (const k of valid) {
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }

  // ordena por mês (seguro caso venha bagunçado)
  out.sort((a, b) => (toMonthIndex(a)! - toMonthIndex(b)!));

  // mantém apenas os últimos "limit"
  return out.slice(Math.max(0, out.length - limit));
}

/** Regra enterprise: atualiza sequência de faltas reais por meses consecutivos */
function computeNextState(args: {
  mk: string;
  currentIdx: number;
  lastKey: string;
  lastIdx: number | null;
  isPresente: boolean;
  prevSeqRaw: any;
}): CeiaSeqState {
  const { mk, currentIdx, lastKey, lastIdx, isPresente, prevSeqRaw } = args;

  // sempre normaliza o que existe no doc
  const prevSeq = normalizeSeq(prevSeqRaw, 6);

  // ✅ se compareceu: limpa tudo
  if (isPresente) {
    return {
      seq: [],
      label: "",
      faltas: 0,
      recorrente: false,
    };
  }

  // ✅ faltou:
  // - Se não há lastIdx (nunca processou ou lastKey inválido), inicia seq com mk
  // - Se pulou mês (diff > 1), reinicia seq com mk
  // - Se foi consecutivo (diff === 1), adiciona mk (anti-dup)
  // Observação: usamos lastIdx/lastKey como “fonte de verdade” para consecutividade real.
  const diff = lastIdx == null ? 1 : currentIdx - lastIdx;

  let nextSeq: string[];

  if (diff > 1) {
    // pulou mês => reset
    nextSeq = [mk];
  } else {
    // consecutivo (ou primeira vez tratada como diff=1)
    // alinha sequência anterior: mantém apenas itens <= lastKey (para evitar drift)
    const lastKeyIdx = lastKey ? toMonthIndex(lastKey) : null;
    const alignedPrev =
      lastKeyIdx == null
        ? prevSeq
        : prevSeq.filter((k) => (toMonthIndex(k) ?? -1) <= lastKeyIdx);

    const tail = alignedPrev[alignedPrev.length - 1];
    if (tail === mk) {
      // anti-dup (não deveria ocorrer por idempotência, mas protege)
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

  // normaliza ids
  const presentesSet = new Set(
    (presentesIds ?? [])
      .map((x) => String(x ?? "").trim())
      .filter(Boolean)
  );

  // só ativos (não muda status, apenas observa)
  const membrosRef = collection(db, "membros");
  const qMembros = query(membrosRef, where("status", "==", "Ativo"));
  const snap = await getDocs(qMembros);

  const batch = writeBatch(db);

  snap.docs.forEach((d) => {
    const data = d.data() as any;

    const lastKey = String(data.ceiaUltimoMesProcessado ?? "").trim();

    // ✅ Idempotência: se já processou esse mês, não faz nada
    if (lastKey === mk) return;

    // Se lastKey é válido, garantimos ordem e consecutividade
    const lastIdx = lastKey ? toMonthIndex(lastKey) : null;

    // ✅ Proteção: se tentarem processar mês anterior/igual ao último processado, ignora
    if (lastIdx != null && currentIdx <= lastIdx) return;

    const isPresente = presentesSet.has(d.id);

    // sequência antiga (se existir) — novo padrão
    const prevSeqRaw = data.ceiaFaltasSeq;

    const next = computeNextState({
      mk,
      currentIdx,
      lastKey,
      lastIdx,
      isPresente,
      prevSeqRaw,
    });

    batch.update(doc(db, "membros", d.id), {
      // ✅ NOVO PADRÃO
      ceiaFaltasSeq: next.seq,
      ceiaFaltasSeqLabel: next.label,

      // ✅ COMPATIBILIDADE (mantém tudo funcionando no sistema atual)
      faltasSeguidasCeia: next.faltas,
      ceiaFaltanteRecorrente: next.recorrente,
      ceiaObs: next.recorrente
        ? "Faltante recorrente da Santa Ceia (3+ meses consecutivos)."
        : "",

      // ✅ controle de idempotência / ordem
      ceiaUltimoMesProcessado: mk,
    });
  });

  await batch.commit();
}
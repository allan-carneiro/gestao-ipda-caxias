import {
  collection,
  documentId,
  getDocs,
  getDocsFromServer,
  query,
  where,
  type Query,
} from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import type { UserRole } from "@/src/types/auth";
import { getCeiaParticipantesPath, getPaths } from "@/src/lib/demo/paths";

// ==========================
// TIPOS (listas do modal)
// ==========================
export type SimpleMembroListItem = {
  id: string;
  nome: string;
  dataNascimento?: string | null;
  cpf?: string | null;
};

export type CeiaFaltanteRecorrenteListItem = SimpleMembroListItem & {
  faltasSeguidasCeia: number;
  ceiaObs?: string;
  ceiaFaltasSeq?: string[];
  ceiaFaltasSeqLabel?: string;
};

function normalizeNome(v: any) {
  const s = String(v ?? "").trim();
  return s || "Sem nome";
}

function sortByNome(a: SimpleMembroListItem, b: SimpleMembroListItem) {
  return a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" });
}

async function getDocsPreferServer<T = any>(q: Query<T>, preferServer: boolean) {
  if (!preferServer) return getDocs(q);

  try {
    return await getDocsFromServer(q);
  } catch {
    return getDocs(q);
  }
}

function chunk<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function safeId(v: any): string | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  if (s === "[object Object]" || s.includes("[object")) return null;
  return s;
}

async function getMemberLiteMap(
  ids: string[],
  role?: UserRole
): Promise<Map<string, SimpleMembroListItem>> {
  const clean = Array.from(new Set(ids.map(safeId).filter(Boolean))) as string[];

  const map = new Map<string, SimpleMembroListItem>();
  if (clean.length === 0) return map;

  const paths = getPaths(role);
  const batches = chunk(clean, 10);

  await Promise.all(
    batches.map(async (b) => {
      const q = query(
        collection(db, paths.membros),
        where(documentId(), "in", b)
      );
      const snap = await getDocs(q);

      snap.forEach((d) => {
        const data = d.data() as any;
        const nome = normalizeNome(data?.nomeCompleto ?? data?.nome);
        const dataNascimento = (data?.dataNascimento ?? null) as string | null;
        const cpf = (data?.cpf ?? null) as string | null;

        map.set(d.id, {
          id: d.id,
          nome,
          dataNascimento,
          cpf,
        });
      });
    })
  );

  return map;
}

// ==========================
// MEMBROS (STATS)
// ==========================
export async function getStatsMembros(role?: UserRole) {
  const paths = getPaths(role);
  const snap = await getDocs(collection(db, paths.membros));

  let ativos = 0;
  let inativos = 0;
  let semStatus = 0;

  snap.forEach((docSnap) => {
    const data = docSnap.data() as any;
    const s = data?.status;

    if (s === "Ativo") ativos++;
    else if (s === "Inativo") inativos++;
    else semStatus++;
  });

  const total = ativos + inativos;

  if (semStatus > 0) {
    console.warn(
      `[getStatsMembros] Existem ${semStatus} membro(s) sem status válido (nem "Ativo" nem "Inativo").`
    );
  }

  return { total, ativos, inativos, semStatus };
}

// ==========================
// CEIA (FALTANTES RECORRENTES)
// ==========================
export async function getStatsCeiaFaltantesRecorrentes(role?: UserRole) {
  const paths = getPaths(role);
  const ref = collection(db, paths.membros);
  const qy = query(
    ref,
    where("status", "==", "Ativo"),
    where("ceiaFaltanteRecorrente", "==", true)
  );

  const snap = await getDocs(qy);
  return { totalFaltantesRecorrentes: snap.size };
}

function toMonthIndex(mesKey: string): number | null {
  const m = String(mesKey ?? "").trim().match(/^(\d{4})-(\d{2})$/);
  if (!m) return null;
  const ano = Number(m[1]);
  const mes = Number(m[2]);
  if (!Number.isFinite(ano) || mes < 1 || mes > 12) return null;
  return ano * 12 + (mes - 1);
}

function normalizeCeiaSeq(raw: any): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;

  const clean = raw.map((x) => String(x ?? "").trim()).filter(Boolean);

  const uniq: string[] = [];
  const seen = new Set<string>();
  for (const k of clean) {
    if (seen.has(k)) continue;
    seen.add(k);
    uniq.push(k);
  }

  uniq.sort((a, b) => (toMonthIndex(a) ?? 0) - (toMonthIndex(b) ?? 0));

  return uniq;
}

export async function listarFaltantesRecorrentesCeia(
  role?: UserRole
): Promise<CeiaFaltanteRecorrenteListItem[]> {
  const paths = getPaths(role);
  const ref = collection(db, paths.membros);
  const qy = query(
    ref,
    where("status", "==", "Ativo"),
    where("ceiaFaltanteRecorrente", "==", true)
  );

  const snap = await getDocs(qy);

  const items: CeiaFaltanteRecorrenteListItem[] = snap.docs.map((d) => {
    const data = d.data() as any;
    const nome = normalizeNome(data?.nomeCompleto ?? data?.nome);

    const ceiaFaltasSeq = normalizeCeiaSeq(data?.ceiaFaltasSeq);

    const ceiaFaltasSeqLabel =
      typeof data?.ceiaFaltasSeqLabel === "string"
        ? String(data.ceiaFaltasSeqLabel ?? "").trim()
        : undefined;

    return {
      id: d.id,
      nome,
      dataNascimento: data?.dataNascimento ?? null,
      cpf: data?.cpf ?? null,
      faltasSeguidasCeia: Number(data?.faltasSeguidasCeia ?? 0),
      ceiaObs: String(data?.ceiaObs ?? ""),
      ceiaFaltasSeq,
      ceiaFaltasSeqLabel,
    };
  });

  items.sort(sortByNome);
  return items;
}

// ==========================
// MEMBROS (LISTAS)
// ==========================
export async function listarMembrosPorStatus(
  status: "Ativo" | "Inativo",
  role?: UserRole
): Promise<SimpleMembroListItem[]> {
  const paths = getPaths(role);
  const ref = collection(db, paths.membros);
  const q = query(ref, where("status", "==", status));
  const snap = await getDocs(q);

  const items: SimpleMembroListItem[] = snap.docs.map((d) => {
    const data = d.data() as any;
    const nome = normalizeNome(data?.nomeCompleto ?? data?.nome);
    return {
      id: d.id,
      nome,
      dataNascimento: data?.dataNascimento ?? null,
      cpf: data?.cpf ?? null,
    };
  });

  items.sort(sortByNome);
  return items;
}

// ==========================
// helpers: fallback para modais
// ==========================
function extractMembroIdFromControleDoc(docId: string, data: any): string | null {
  const membroId = safeId(data?.membroId);
  const fallbackId = safeId(docId);
  return membroId || fallbackId || null;
}

function fallbackNomeFromCeiaDoc(data: any) {
  return normalizeNome(
    data?.membroNome ??
      data?.nomeCompleto ??
      data?.nome ??
      data?.nomeMembro ??
      "Membro removido"
  );
}

function fallbackNascimentoFromCeiaDoc(data: any): string | null {
  const v = data?.dataNascimento ?? data?.membroDataNascimento ?? null;
  const s = String(v ?? "").trim();
  return s ? s : null;
}

// ==========================
// CEIA — MÊS (STATS)
// ==========================
export async function getStatsCeiaMes(
  ano: number,
  mes: number,
  roleOrPreferServer?: UserRole | boolean,
  maybePreferServer = false
) {
  const role =
    typeof roleOrPreferServer === "string" ? roleOrPreferServer : undefined;

  const preferServer =
    typeof roleOrPreferServer === "boolean"
      ? roleOrPreferServer
      : maybePreferServer;

  const ref = collection(db, getCeiaParticipantesPath(role, ano, mes));
  const qPres = query(ref, where("presente", "==", true));

  const snap = await getDocsPreferServer(qPres, preferServer);

  return { presentes: snap.size };
}

// ==========================
// CEIA — MÊS (LISTA PRESENTES)
// ==========================
export async function listarPresentesCeiaMes(
  ano: number,
  mes: number,
  role?: UserRole
): Promise<SimpleMembroListItem[]> {
  const ref = collection(db, getCeiaParticipantesPath(role, ano, mes));
  const qPres = query(ref, where("presente", "==", true));
  const snap = await getDocs(qPres);

  const ids: string[] = [];
  const fallbackById = new Map<string, SimpleMembroListItem>();

  for (const d of snap.docs) {
    const data = d.data() as any;
    const membroId = extractMembroIdFromControleDoc(d.id, data);
    if (!membroId) continue;

    ids.push(membroId);

    if (!fallbackById.has(membroId)) {
      fallbackById.set(membroId, {
        id: membroId,
        nome: fallbackNomeFromCeiaDoc(data),
        dataNascimento: fallbackNascimentoFromCeiaDoc(data),
        cpf: data?.cpf ?? null,
      });
    }
  }

  const uniqueIds = Array.from(new Set(ids));
  const memberMap = await getMemberLiteMap(uniqueIds, role);

  const items: SimpleMembroListItem[] = [];
  for (const id of uniqueIds) {
    const fallback = fallbackById.get(id);
    if (fallback) {
      items.push(memberMap.get(id) ?? fallback);
    }
  }

  items.sort(sortByNome);
  return items;
}

// ==========================
// CEIA — ANO (STATS)
// ==========================
export async function getStatsCeiaAno(ano: number, role?: UserRole) {
  const paths = getPaths(role);
  const qy = query(collection(db, paths.ceiaRegistros), where("ano", "==", ano));
  const snap = await getDocs(qy);

  return { totalParticipacoes: snap.size };
}

// ==========================
// CEIA — ANO (LISTA PARTICIPANTES ÚNICOS)
// ==========================
export async function listarParticipantesCeiaAno(
  ano: number,
  role?: UserRole
): Promise<SimpleMembroListItem[]> {
  const paths = getPaths(role);

  const ids: string[] = [];
  const fallbackById = new Map<string, SimpleMembroListItem>();

  // 1. Fonte antiga: registros anuais
  const qy = query(collection(db, paths.ceiaRegistros), where("ano", "==", ano));
  const snapAno = await getDocs(qy);

  for (const d of snapAno.docs) {
    const data = d.data() as any;
    const membroId = safeId(data?.membroId);
    if (!membroId) continue;

    ids.push(membroId);

    if (!fallbackById.has(membroId)) {
      fallbackById.set(membroId, {
        id: membroId,
        nome: fallbackNomeFromCeiaDoc(data),
        dataNascimento: fallbackNascimentoFromCeiaDoc(data),
        cpf: data?.cpf ?? null,
      });
    }
  }

  // 2. Fonte mensal: participantes marcados nos meses
  for (let mes = 1; mes <= 12; mes++) {
    const ref = collection(db, getCeiaParticipantesPath(role, ano, mes));
    const qPres = query(ref, where("presente", "==", true));
    const snapMes = await getDocs(qPres);

    for (const d of snapMes.docs) {
      const data = d.data() as any;
      const membroId = extractMembroIdFromControleDoc(d.id, data);
      if (!membroId) continue;

      ids.push(membroId);

      if (!fallbackById.has(membroId)) {
        fallbackById.set(membroId, {
          id: membroId,
          nome: fallbackNomeFromCeiaDoc(data),
          dataNascimento: fallbackNascimentoFromCeiaDoc(data),
          cpf: data?.cpf ?? null,
        });
      }
    }
  }

  const uniqueIds = Array.from(new Set(ids));
  const memberMap = await getMemberLiteMap(uniqueIds, role);

  const items: SimpleMembroListItem[] = [];

  for (const id of uniqueIds) {
    const fallback = fallbackById.get(id);
    if (fallback) {
      items.push(memberMap.get(id) ?? fallback);
    }
  }

  items.sort(sortByNome);
  return items;
}

// ==========================
// CEIA — SÉRIE (ÚLTIMOS MESES)
// ==========================
export type CeiaMesSeriePoint = {
  id: string;
  label: string;
  presentes: number;
};

function pad2num(n: number) {
  return String(n).padStart(2, "0");
}

function addMonths(base: Date, delta: number) {
  const d = new Date(base);
  d.setMonth(d.getMonth() + delta);
  return d;
}

export async function getSerieCeiaUltimosMeses(
  anoAtual: number,
  mesAtual: number,
  roleOrMeses?: UserRole | number,
  maybeMeses = 12
): Promise<CeiaMesSeriePoint[]> {
  const role = typeof roleOrMeses === "string" ? roleOrMeses : undefined;
  const meses = typeof roleOrMeses === "number" ? roleOrMeses : maybeMeses;

  const base = new Date(anoAtual, mesAtual - 1, 1);

  const points = Array.from({ length: meses }, (_, i) => {
    const d = addMonths(base, -(meses - 1 - i));
    const ano = d.getFullYear();
    const mes = d.getMonth() + 1;
    const id = `${ano}-${pad2num(mes)}`;
    const label = `${pad2num(mes)}/${ano}`;
    return { ano, mes, id, label };
  });

  const results = await Promise.all(
    points.map(async (p) => {
      const stats = await getStatsCeiaMes(p.ano, p.mes, role, true);
      return {
        id: p.id,
        label: p.label,
        presentes: stats.presentes ?? 0,
      };
    })
  );

  return results;
}
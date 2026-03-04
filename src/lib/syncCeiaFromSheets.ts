import { SHEETS_CSV } from "@/src/lib/sheetsLinks";
import { registrarCeiaNoMes, marcarPresencaNoControle } from "@/src/lib/ceia";

type MembroListaItem = {
  id: string;
  nome: string;
  numeroRol?: number | null;
};

function parseCSV(text: string): string[][] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  // Detecta delimitador
  const sample = lines.slice(0, 5).join("\n");
  const semiCount = (sample.match(/;/g) || []).length;
  const commaCount = (sample.match(/,/g) || []).length;
  const delim = semiCount > commaCount ? ";" : ",";

  return lines.map((line) =>
    line.split(delim).map((c) => c.replace(/^"|"$/g, "").trim())
  );
}

function toInt(v: string): number | null {
  const n = Number(String(v ?? "").replace(/\D/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function normalizeNomeSafe(v: unknown) {
  if (typeof v !== "string") return "";
  return v.trim().replace(/\s+/g, " ");
}

function findHeaderRow(rows: string[][]) {
  return rows.findIndex((r) =>
    r.some((c) => String(c ?? "").toLowerCase().includes("nome completo"))
  );
}

function findIdxNumero(header: string[]) {
  const lower = header.map((c) => String(c ?? "").toLowerCase().trim());

  const candidates = ["nº", "no", "n°", "n", "numero", "número"];
  for (const k of candidates) {
    const idx = lower.findIndex((c) => c === k || c.startsWith(k));
    if (idx >= 0) return idx;
  }

  return lower.findIndex((c) => c.startsWith("n"));
}

function findIdxNome(header: string[]) {
  const lower = header.map((c) => String(c ?? "").toLowerCase());
  return lower.findIndex((c) => c.includes("nome completo"));
}

function isMarcado(valor: string) {
  const v = String(valor || "").trim().toLowerCase();
  return (
    v === "p" ||
    v === "x" ||
    v === "1" ||
    v === "true" ||
    v === "sim" ||
    v === "s" ||
    v === "ok" ||
    v === "✔"
  );
}

/**
 * Evita falso-positivo:
 * Antes era r.some(isMarcado) e isso podia marcar linha por causa de coisas aleatórias.
 *
 * Agora a regra é:
 * - só considera marcação se existir pelo menos 1 célula "marcada"
 * - mas ignoramos colunas “óbvias” (número e nome) e checamos principalmente o miolo
 */
function temMarcacaoNaLinha(
  row: string[],
  idxNumero: number,
  idxNome: number
) {
  // remove colunas número/nome
  const cells = row.filter((_, i) => i !== idxNumero && i !== idxNome);

  // checa apenas células “curtas” (evita bater em telefones/datas)
  for (const c of cells) {
    const s = String(c ?? "").trim();
    if (!s) continue;
    if (s.length > 6) continue; // evita "02/2026", telefones, textos longos etc.
    if (isMarcado(s)) return true;
  }
  return false;
}

function assertMemberIdString(id: unknown) {
  if (typeof id !== "string") return null;
  const s = id.trim();
  if (!s) return null;
  if (s === "[object Object]" || s.includes("[object")) return null;
  return s;
}

/**
 * Limita concorrência de Promises simples (pra não “martelar” o Firestore).
 */
async function runPool(tasks: Array<() => Promise<void>>, limit = 6) {
  const executing = new Set<Promise<void>>();

  for (const t of tasks) {
    const p = t().finally(() => executing.delete(p));
    executing.add(p);

    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(executing);
}

/**
 * SINCRONIZA REGISTRO ANUAL (Jan-Dez) do Sheets -> Firestore
 * Espera colunas:
 * Nº | Nome Completo | Jan/26 | ... | Dez/26 | Total P
 * com "P" nas células.
 */
export async function syncRegistroAnualFromSheets(opts: {
  ano: number;
  membros: MembroListaItem[];
}) {
  const { ano, membros } = opts;

  const mapNumeroToId = new Map<number, string>();
  for (const m of membros) {
    if (typeof m.numeroRol === "number") mapNumeroToId.set(m.numeroRol, m.id);
  }

  const res = await fetch(SHEETS_CSV.registroAnualCsv, { cache: "no-store" });
  if (!res.ok) throw new Error("Falha ao baixar CSV do Registro anual (Sheets).");
  const text = await res.text();

  const rows = parseCSV(text);

  const headerIdx = findHeaderRow(rows);
  if (headerIdx === -1)
    throw new Error("Cabeçalho do Registro anual não encontrado no CSV.");

  const header = rows[headerIdx];
  const dataRows = rows.slice(headerIdx + 1);

  const idxNumero = findIdxNumero(header);
  const idxNome = findIdxNome(header);
  if (idxNome < 0) throw new Error("Coluna 'Nome Completo' não encontrada no CSV.");

  const monthStart = idxNome + 1;

  let gravados = 0;
  let ignorados = 0;

  const tasks: Array<() => Promise<void>> = [];

  for (const r of dataRows) {
    const nome = normalizeNomeSafe(r[idxNome]);
    if (!nome) continue;
    if (nome.toUpperCase().includes("TOTAL GERAL")) continue;

    const numero = idxNumero >= 0 ? toInt(r[idxNumero]) : null;
    const membroId = numero ? mapNumeroToId.get(numero) : undefined;

    const membroIdOk = assertMemberIdString(membroId);
    if (!membroIdOk) {
      ignorados++;
      continue;
    }

    // garante que existam pelo menos 12 colunas de meses
    if (r.length < monthStart + 12) {
      ignorados++;
      continue;
    }

    for (let m = 1; m <= 12; m++) {
      const cell = String(r[monthStart + (m - 1)] ?? "").trim().toUpperCase();
      if (cell === "P") {
        tasks.push(async () => {
          await registrarCeiaNoMes(ano, m, membroIdOk, nome);
        });
        gravados++;
      }
    }
  }

  // executa com limite de concorrência
  await runPool(tasks, 6);

  return { gravados, ignorados };
}

/**
 * SINCRONIZA CONTROLE (mês selecionado) do Sheets -> Firestore
 * Marca como "presente" quem tiver marcação (P, X, 1, SIM, ✔ etc).
 */
export async function syncControleFromSheets(opts: {
  ano: number;
  mes: number;
  membros: MembroListaItem[];
}) {
  const { ano, mes, membros } = opts;

  const mapNumeroToId = new Map<number, { id: string; nome: string }>();
  for (const m of membros) {
    if (typeof m.numeroRol === "number")
      mapNumeroToId.set(m.numeroRol, { id: m.id, nome: m.nome });
  }

  const res = await fetch(SHEETS_CSV.controleCsv, { cache: "no-store" });
  if (!res.ok) throw new Error("Falha ao baixar CSV do Controle (Sheets).");
  const text = await res.text();

  const rows = parseCSV(text);

  const headerIdx = findHeaderRow(rows);
  if (headerIdx === -1)
    throw new Error("Cabeçalho do Controle não encontrado no CSV.");

  const header = rows[headerIdx];
  const dataRows = rows.slice(headerIdx + 1);

  const idxNumero = findIdxNumero(header);
  const idxNome = findIdxNome(header);
  if (idxNome < 0) throw new Error("Coluna 'Nome Completo' não encontrada no CSV.");

  let marcados = 0;
  let ignorados = 0;

  const tasks: Array<() => Promise<void>> = [];

  for (const r of dataRows) {
    const nome = normalizeNomeSafe(r[idxNome]);
    if (!nome) continue;
    if (nome.toUpperCase().includes("TOTAL GERAL")) continue;

    const numero = idxNumero >= 0 ? toInt(r[idxNumero]) : null;
    const info = numero ? mapNumeroToId.get(numero) : undefined;

    const idOk = assertMemberIdString(info?.id);
    if (!info || !idOk) {
      ignorados++;
      continue;
    }

    const temMarcacao = temMarcacaoNaLinha(r, idxNumero, idxNome);
    if (!temMarcacao) continue;

    tasks.push(async () => {
      await marcarPresencaNoControle(ano, mes, idOk, nome, true);
    });
    marcados++;
  }

  await runPool(tasks, 6);

  return { marcados, ignorados };
}
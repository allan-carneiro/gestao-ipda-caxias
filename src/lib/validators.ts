// src/lib/validators.ts
// Camada "enterprise" de validação/normalização (client-safe)

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };

function s(v: any) {
  return String(v ?? "").trim();
}

function sOrNull(v: any): string | null {
  const x = s(v);
  return x ? x : null;
}

function onlyDigits(v: any): string {
  return s(v).replace(/\D+/g, "");
}

function isFiniteInt(n: any) {
  return Number.isInteger(n) && Number.isFinite(n);
}

function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/** Aceita:
 * - yyyy-mm-dd
 * - yyyy/mm/dd
 * - dd/mm/aaaa
 * Retorna string padrão "YYYY-MM-DD" (ou null se inválida).
 */
export function normalizeDateToYMD(input: any): string | null {
  const raw = s(input);
  if (!raw) return null;

  // yyyy-mm-dd ou yyyy/mm/dd
  let m = raw.match(/^(\d{4})[-/](\d{2})[-/](\d{2})$/);
  if (m) {
    const yy = Number(m[1]);
    const mm = Number(m[2]);
    const dd = Number(m[3]);
    if (!yy || mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
    return `${String(yy).padStart(4, "0")}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  }

  // dd/mm/aaaa
  m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (m) {
    const dd = Number(m[1]);
    const mm = Number(m[2]);
    const yy = Number(m[3]);
    if (!yy || mm < 1 || mm > 12 || dd < 1 || dd > 31) return null;
    return `${String(yy).padStart(4, "0")}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  }

  return null;
}

/* ===========================
   CEIA
=========================== */

export function validateAnoMes(ano: any, mes: any): ValidationResult<{ ano: number; mes: number }> {
  const a = Number(ano);
  const m = Number(mes);

  if (!isFiniteInt(a) || a < 2000 || a > 2100) {
    return { ok: false, message: "Ano inválido. Use um ano entre 2000 e 2100." };
  }
  if (!isFiniteInt(m) || m < 1 || m > 12) {
    return { ok: false, message: "Mês inválido. Use um mês entre 1 e 12." };
  }

  return { ok: true, value: { ano: a, mes: m } };
}

export function sanitizeMembroId(membroId: any): ValidationResult<string> {
  const id = s(membroId).replaceAll("/", "_"); // Firestore docId não pode ter "/"
  if (!id) return { ok: false, message: "membroId inválido." };
  return { ok: true, value: id };
}

export function sanitizeNome(nome: any): string {
  const n = s(nome);
  return n || "(sem nome)";
}

/* ===========================
   MEMBROS (payload)
   (sem obrigar campos, só normaliza)
=========================== */

export type MembroPayloadClean = {
  nomeCompleto?: string;
  nome?: string; // legado
  status?: "Ativo" | "Inativo";

  telefoneCelular?: string | null;
  telefone?: string | null; // legado
  email?: string | null;

  cpf?: string | null; // só dígitos
  rg?: string | null;

  dataNascimento?: string | null; // sempre Y-M-D quando possível
  dataBatismo?: string | null;

  congregacao?: string | null;
  pastor?: string | null;
  campo?: string | null;

  cargoEclesiastico?: string | null;
  numeroRol?: number | null;

  telCarta?: string | null; // "Tel." | "Carta" | ""
  fotoUrl?: string | null;
};

export function cleanMembroPayload(input: any): ValidationResult<MembroPayloadClean> {
  const status = s(input?.status);
  const statusOk =
    status === "" || status === "Ativo" || status === "Inativo";

  if (!statusOk) {
    return { ok: false, message: 'Status inválido. Use "Ativo" ou "Inativo".' };
  }

  // numeroRol: se vier string "12" => vira número
  const nrRaw = input?.numeroRol;
  const nrNum = nrRaw === "" || nrRaw == null ? null : Number(nrRaw);
  const numeroRol =
    nrNum == null
      ? null
      : Number.isFinite(nrNum) && nrNum >= 0
      ? Math.trunc(nrNum)
      : null;

  const dataNascimento = normalizeDateToYMD(input?.dataNascimento);
  const dataBatismo = normalizeDateToYMD(input?.dataBatismo);

  const cpfDigits = onlyDigits(input?.cpf);
  const cpf = cpfDigits ? cpfDigits : null;

  const out: MembroPayloadClean = {
    nomeCompleto: s(input?.nomeCompleto) || undefined,
    nome: s(input?.nome) || undefined, // legado
    status: status ? (status as any) : undefined,

    telefoneCelular: sOrNull(input?.telefoneCelular),
    telefone: sOrNull(input?.telefone), // legado
    email: sOrNull(input?.email),

    cpf,
    rg: sOrNull(input?.rg),

    dataNascimento: dataNascimento ?? null,
    dataBatismo: dataBatismo ?? null,

    congregacao: sOrNull(input?.congregacao),
    pastor: sOrNull(input?.pastor),
    campo: sOrNull(input?.campo),

    cargoEclesiastico: sOrNull(input?.cargoEclesiastico),
    numeroRol,

    telCarta: sOrNull(input?.telCarta),
    fotoUrl: sOrNull(input?.fotoUrl),
  };

  return { ok: true, value: out };
}
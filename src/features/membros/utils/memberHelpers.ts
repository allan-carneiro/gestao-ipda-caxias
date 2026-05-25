export type Status = "Ativo" | "Inativo";

export function isStatusValido(v: unknown): v is Status {
  return v === "Ativo" || v === "Inativo";
}

export function isValidDate(d: Date) {
  return d instanceof Date && !Number.isNaN(d.getTime());
}

export function parseBRToISO(br: string) {
  const m = String(br || "")
    .trim()
    .match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (!m) return null;

  const [, dd, mm, yyyy] = m;

  return `${yyyy}-${mm}-${dd}`;
}

export function parseNascimentoToDate(v?: string | null) {
  const s = String(v ?? "").trim();

  if (!s) return null;

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const iso = parseBRToISO(s);

    if (!iso) return null;

    const d = new Date(`${iso}T00:00:00`);

    return isValidDate(d) ? d : null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(`${s}T00:00:00`);

    return isValidDate(d) ? d : null;
  }

  const d = new Date(s);

  return isValidDate(d) ? d : null;
}

export function calcularIdade(dataNasc?: string | null) {
  const d = parseNascimentoToDate(dataNasc);

  if (!d) return null;

  const now = new Date();
  let idade = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();

  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) idade--;

  if (idade < 0 || idade > 130) return null;

  return idade;
}

export function formatarIdade(idade: number | null) {
  if (idade === null) return "";

  return `${idade} ano${idade === 1 ? "" : "s"}`;
}

export function normalizeNomeCompleto(nome: string) {
  const cleaned = String(nome ?? "")
    .trim()
    .replace(/\s+/g, " ");

  if (!cleaned) return "";

  const lowerWords = new Set(["da", "de", "do", "das", "dos", "e"]);

  return cleaned
    .split(" ")
    .map((w, i) => {
      const wl = w.toLowerCase();

      if (i > 0 && lowerWords.has(wl)) return wl;

      return wl.charAt(0).toUpperCase() + wl.slice(1);
    })
    .join(" ");
}

export function isValidCPF(cpfDigits: string) {
  const cpf2 = (cpfDigits || "").replace(/\D/g, "");

  if (cpf2.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf2)) return false;

  const calcDigit = (base: string, factorStart: number) => {
    let sum = 0;

    for (let i = 0; i < base.length; i++) {
      sum += Number(base[i]) * (factorStart - i);
    }

    const mod = sum % 11;

    return mod < 2 ? 0 : 11 - mod;
  };

  const d1 = calcDigit(cpf2.slice(0, 9), 10);
  const d2 = calcDigit(cpf2.slice(0, 9) + String(d1), 11);

  return cpf2.endsWith(`${d1}${d2}`);
}
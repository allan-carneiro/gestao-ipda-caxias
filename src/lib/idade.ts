// src/lib/idade.ts

export function parseBRDateToISO(br?: string | null) {
  // aceita "DD/MM/AAAA" e devolve "AAAA-MM-DD" (string) ou null
  const s = String(br ?? "").trim();
  if (!s) return null;
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

export function isValidDate(d: Date) {
  return d instanceof Date && !Number.isNaN(d.getTime());
}

export function parseISOToDate(iso?: string | null) {
  // aceita "AAAA-MM-DD" (ou qualquer Date parseável) e devolve Date ou null
  const s = String(iso ?? "").trim();
  if (!s) return null;

  // se vier DD/MM/AAAA, converte antes
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const iso2 = parseBRDateToISO(s);
    if (!iso2) return null;
    const d2 = new Date(`${iso2}T00:00:00`);
    return isValidDate(d2) ? d2 : null;
  }

  // se vier ISO (AAAA-MM-DD), força 00:00:00 para evitar timezone
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(`${s}T00:00:00`);
    return isValidDate(d) ? d : null;
  }

  const d = new Date(s);
  return isValidDate(d) ? d : null;
}

export function calcularIdade(dataNascimento?: string | null, now = new Date()) {
  const d = parseISOToDate(dataNascimento);
  if (!d) return null;

  let idade = now.getFullYear() - d.getFullYear();

  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) {
    idade--;
  }

  if (idade < 0 || idade > 130) return null; // proteção básica
  return idade;
}

export function formatarIdade(idade: number | null) {
  // ✅ melhor pra UI: string vazia quando não tem idade
  if (idade == null) return "";
  return `${idade} ano${idade === 1 ? "" : "s"}`;
}
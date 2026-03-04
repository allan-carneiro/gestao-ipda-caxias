// src/lib/membroSearch.ts
export type SearchMode = "decade" | "exact";

export function onlyDigits(v: string) {
  return (v ?? "").replace(/\D+/g, "");
}

export function normalizeText(v: any) {
  return String(v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

/**
 * Score de relevância para busca por nome (texto):
 * 0 -> nome começa com o termo
 * 1 -> alguma palavra começa com o termo
 * 2 -> contém em qualquer parte
 * 999 -> não bate (ou termo vazio)
 */
export function scoreNomePorRelevancia(nomeRaw: string, termRaw: string) {
  const nome = normalizeText(nomeRaw || "");
  const term = normalizeText(termRaw || "");

  if (!term) return 999;

  if (nome.startsWith(term)) return 0;

  const words = nome.split(/\s+/).filter(Boolean);
  if (words.some((w) => w.startsWith(term))) return 1;

  if (nome.includes(term)) return 2;

  return 999;
}
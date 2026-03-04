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
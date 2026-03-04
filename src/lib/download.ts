export function downloadTextFile(filename: string, content: string) {
  // ✅ BOM UTF-8 + CRLF (Excel Windows)
  const BOM = "\uFEFF";
  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const withCrlf = normalized.split("\n").join("\r\n");

  // ⚠️ Evita BOM duplicado (se algum caller já colocou)
  const finalContent = (withCrlf.startsWith(BOM) ? "" : BOM) + withCrlf;

  // MIME melhor pra Excel
  const lower = filename.toLowerCase();
  const isTsv = lower.endsWith(".tsv");
  const isCsv = lower.endsWith(".csv");

  const mime = isTsv
    ? "text/tab-separated-values;charset=utf-8"
    : isCsv
      ? "text/csv;charset=utf-8"
      : "text/plain;charset=utf-8";

  const blob = new Blob([finalContent], { type: mime });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();

  URL.revokeObjectURL(url);
}

function escCell(v: unknown) {
  const s = String(v ?? "");
  // mantém quebras dentro da célula (Excel aceita dentro de aspas)
  const normalized = s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const needs = /[\t\n\r"]/.test(normalized);
  const safe = normalized.replace(/"/g, '""');
  return needs ? `"${safe}"` : safe;
}

/**
 * ✅ TSV (TAB) é o formato mais compatível com Excel pt-BR:
 * - não precisa "sep=;"
 * - não depende do separador regional
 * - abre perfeito no duplo clique
 */
export function toCSV(headers: string[], rows: Array<Array<unknown>>) {
  const sep = "\t"; // ✅ TAB
  const lines = [
    headers.map(escCell).join(sep),
    ...rows.map((r) => r.map(escCell).join(sep)),
  ];
  return lines.join("\n");
}

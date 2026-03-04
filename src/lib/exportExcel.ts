import ExcelJS from "exceljs";

type ExportExcelParams = {
  fileName: string; // sem .xlsx
  sheetName?: string;
  title?: string; // título opcional na primeira linha
  headers: string[];
  rows: any[][];
};

const INVALID_SHEET_CHARS = /[\*\?\:\\\/\[\]]/g;

export function sanitizeSheetName(name: string) {
  // 1) troca / por -
  let safe = String(name ?? "").replaceAll("/", "-");

  // 2) remove caracteres proibidos
  safe = safe.replace(INVALID_SHEET_CHARS, " ");

  // 3) remove espaços duplicados
  safe = safe.replace(/\s+/g, " ").trim();

  // 4) Excel: 31 chars
  if (!safe) safe = "Planilha";
  return safe.slice(0, 31);
}

export async function exportExcel({
  fileName,
  sheetName = "Planilha",
  title,
  headers,
  rows,
}: ExportExcelParams) {
  const wb = new ExcelJS.Workbook();
  const safeSheetName = sanitizeSheetName(sheetName);
  const ws = wb.addWorksheet(safeSheetName);

  // Vamos controlar o índice da linha do cabeçalho
  let headerRowIndex = 1;

  // ===== Título (opcional)
  if (title) {
    const titleRow = ws.addRow([title]);
    titleRow.font = { bold: true, size: 14 };
    titleRow.alignment = { vertical: "middle", horizontal: "center" };

    ws.mergeCells(1, 1, 1, headers.length);
    ws.getRow(1).height = 22;

    ws.addRow([]); // linha em branco
    headerRowIndex = 3;
  }

  // ===== Cabeçalho
  const headerRow = ws.addRow(headers);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.alignment = {
    vertical: "middle",
    horizontal: "center",
    wrapText: true,
  };
  headerRow.height = 18;

  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1D4ED8" }, // azul “corporativo”
    };
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
  });

  // ===== Dados
  const safeRows = rows.map((r) =>
    (r ?? []).map((v) => (v === null || v === undefined ? "" : v))
  );

  safeRows.forEach((r, idx) => {
    const row = ws.addRow(r);

    // zebra
    if (idx % 2 === 0) {
      row.eachCell((cell) => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFF8FAFC" },
        };
      });
    }

    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
      cell.alignment = { vertical: "middle", horizontal: "left", wrapText: true };
    });
  });

  // ===== Congelar abaixo do cabeçalho
  // ySplit é a quantidade de linhas "congeladas" no topo.
  // Queremos congelar até o cabeçalho (inclusive).
  ws.views = [{ state: "frozen", ySplit: headerRowIndex }];

  // ===== Auto width
  const colCount = headers.length;
  for (let c = 1; c <= colCount; c++) {
    let max = String(headers[c - 1] ?? "").length || 10;

    ws.getColumn(c).eachCell({ includeEmpty: true }, (cell) => {
      const len = String(cell.value ?? "").length;
      if (len > max) max = len;
    });

    ws.getColumn(c).width = Math.min(Math.max(max + 2, 10), 45);
  }

  // ===== Gera arquivo no browser
  const buffer = await wb.xlsx.writeBuffer();

  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${fileName}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

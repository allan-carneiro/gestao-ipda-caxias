const GOOGLE_SHEETS_BASE = "https://docs.google.com/spreadsheets/d";

type SheetLinkConfig = {
  spreadsheetId: string;
  gid: string | number;
};

function buildSheetLinks({ spreadsheetId, gid }: SheetLinkConfig) {
  const gidStr = String(gid);

  return {
    // abre a planilha no navegador
    view: `${GOOGLE_SHEETS_BASE}/${spreadsheetId}/edit?gid=${gidStr}#gid=${gidStr}`,
    // exporta (csv é o mais comum)
    exportCsv: `${GOOGLE_SHEETS_BASE}/${spreadsheetId}/export?format=csv&gid=${gidStr}`,
  };
}

// ✅ Fonte única de verdade (IDs + gids)
const SHEETS_CONFIG = {
  // Ceia-Registro Anual
  registroAnual: {
    spreadsheetId: "1Vj6zm9udN4_YEnIHnkuyPjAlHpr5DVMANXdTLynG5P8",
    gid: 1802023356,
  },
  // Dia da Ceia (controle)
  controle: {
    spreadsheetId: "1W7ynj7aRqZrry9_ZvSzsxZfoeOct1X1A",
    gid: 580197467,
  },
} as const;

export const SHEETS_LINKS = {
  registroAnual: buildSheetLinks(SHEETS_CONFIG.registroAnual),
  controle: buildSheetLinks(SHEETS_CONFIG.controle),
} as const;

/**
 * ✅ Compatibilidade com o que já existe no projeto
 * (pra não quebrar imports atuais)
 */
export const SHEETS_CSV = {
  registroAnualCsv: SHEETS_LINKS.registroAnual.exportCsv,
  controleCsv: SHEETS_LINKS.controle.exportCsv,
} as const;

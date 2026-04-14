import type { UserRole } from "../../types/auth";

function isDemo(role?: UserRole) {
  return role === "demo";
}

export function getDataRoot(role?: UserRole) {
  return isDemo(role) ? "demo_data/demo" : "app_data/main";
}

export function getCollectionPath(
  role: UserRole | undefined,
  collectionName:
    | "membros"
    | "ceia_registros"
    | "auditoria"
    | "ceia_controle"
    | "evangelismos"
    | "planilha_1_interna"
    | "planilha_2_interna"
) {
  return `${getDataRoot(role)}/${collectionName}`;
}

export function getPaths(role?: UserRole) {
  const root = getDataRoot(role);

  return {
    root,
    membros: `${root}/membros`,
    ceiaRegistros: `${root}/ceia_registros`,
    auditoria: `${root}/auditoria`,
    ceiaControle: `${root}/ceia_controle`,
    evangelismos: `${root}/evangelismos`,
    planilha1Interna: `${root}/planilha_1_interna`,
    planilha2Interna: `${root}/planilha_2_interna`,
  };
}

export function getCeiaParticipantesPath(
  role: UserRole | undefined,
  ano: number,
  mes: number
) {
  const root = getDataRoot(role);
  const ym = `${ano}-${String(mes).padStart(2, "0")}`;
  return `${root}/ceia_controle/${ym}/participantes`;
}
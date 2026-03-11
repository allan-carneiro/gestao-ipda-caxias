import type { UserRole } from "../../types/auth";

function getEnv(role?: UserRole) {
  return role === "demo" ? "demo_data" : "app_data";
}

export function getDataRoot(role?: UserRole) {
  return `${getEnv(role)}/main`;
}

export function getCollectionPath(
  role: UserRole | undefined,
  collectionName: "membros" | "ceia_registros" | "auditoria" | "ceia_controle"
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
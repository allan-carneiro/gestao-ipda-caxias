import type { UserRole } from "../../types/auth";

export function isAdmin(role?: UserRole) {
  return role === "admin";
}

export function isSecretaria(role?: UserRole) {
  return role === "secretaria";
}

export function isLider(role?: UserRole) {
  return role === "lider";
}

export function isConsulta(role?: UserRole) {
  return role === "consulta";
}

export function isDemo(role?: UserRole) {
  return role === "demo";
}

export function isReadOnly(role?: UserRole) {
  return role === "consulta" || role === "demo";
}

export function canViewDashboard(role?: UserRole) {
  return !!role;
}

export function canViewMembers(role?: UserRole) {
  return !!role;
}

export function canEditMembers(role?: UserRole) {
  return role === "admin" || role === "secretaria";
}

export function canCreateMembers(role?: UserRole) {
  return role === "admin" || role === "secretaria";
}

export function canToggleMemberStatus(role?: UserRole) {
  return role === "admin" || role === "secretaria";
}

export function canUploadMemberPhoto(role?: UserRole) {
  return role === "admin" || role === "secretaria";
}

export function canManageCeia(role?: UserRole) {
  return role === "admin" || role === "secretaria" || role === "lider";
}

export function canMarkCeia(role?: UserRole) {
  return role === "admin" || role === "secretaria" || role === "lider";
}

export function canViewAudit(role?: UserRole) {
  return !!role;
}

export function canExportReports(role?: UserRole) {
  return role === "admin" || role === "secretaria" || role === "lider" || role === "demo";
}

export function canViewEvangelismo(role?: UserRole) {
  return !!role;
}

export function canCreateEvangelismo(role?: UserRole) {
  return role === "admin" || role === "secretaria" || role === "lider";
}

export function canEditEvangelismo(role?: UserRole) {
  return role === "admin" || role === "secretaria" || role === "lider";
}

export function canDeleteEvangelismo(role?: UserRole) {
  return role === "admin" || role === "secretaria";
}

export function canUseDemoWriteActions(role?: UserRole) {
  return !isDemo(role);
}
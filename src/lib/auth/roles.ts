import type { UserRole } from "@/types/auth";

export const ROLES: Record<string, UserRole> = {
  ADMIN: "admin",
  SECRETARIA: "secretaria",
  LIDER: "lider",
  CONSULTA: "consulta",
  DEMO: "demo",
} as const;

export function isValidRole(role: string): role is UserRole {
  return ["admin", "secretaria", "lider", "consulta", "demo"].includes(role);
}
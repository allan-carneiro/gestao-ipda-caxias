import type { UserRole } from "../../types/auth";

export const ROLES: Record<string, UserRole> = {
  ADMIN: "admin",
  SECRETARIA: "secretaria",
  LIDER: "lider",
  CONSULTA: "consulta",
  DEMO: "demo",
} as const;

const VALID_ROLES: UserRole[] = [
  "admin",
  "secretaria",
  "lider",
  "consulta",
  "demo",
];

export function isValidRole(role: unknown): role is UserRole {
  return typeof role === "string" && VALID_ROLES.includes(role as UserRole);
}
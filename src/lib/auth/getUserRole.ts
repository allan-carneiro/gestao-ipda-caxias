import { getAuth } from "firebase/auth";
import type { UserRole } from "@/src/types/auth";

function isValidRole(value: unknown): value is UserRole {
  return (
    value === "admin" ||
    value === "secretaria" ||
    value === "lider" ||
    value === "consulta" ||
    value === "demo"
  );
}

export async function getUserRoleFromToken(): Promise<UserRole | null> {
  const auth = getAuth();
  const user = auth.currentUser;

  if (!user) return null;

  const tokenResult = await user.getIdTokenResult(true);
  const role = tokenResult.claims?.role;

  if (isValidRole(role)) {
    return role;
  }

  return null;
}
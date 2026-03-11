import { getAuth } from "firebase/auth";
import type { UserRole } from "../../types/auth";
import { isValidRole } from "./roles";

export async function getUserRoleFromToken(): Promise<UserRole | null> {
  const auth = getAuth();
  const currentUser = auth.currentUser;

  if (!currentUser) return null;

  const tokenResult = await currentUser.getIdTokenResult(true);
  const role = tokenResult.claims.role;

  if (typeof role === "string" && isValidRole(role)) {
    return role;
  }

  return null;
}
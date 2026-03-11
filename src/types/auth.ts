export type UserRole =
  | "admin"
  | "secretaria"
  | "lider"
  | "consulta"
  | "demo";

export interface AuthUser {
  uid: string;
  email: string | null;
  role: UserRole;
}
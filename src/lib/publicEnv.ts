function asPublicString(v: unknown) {
  return typeof v === "string" ? v.trim() : "";
}

export const PUBLIC_ENV = Object.freeze({
  SHEETS_1_URL: asPublicString(process.env.NEXT_PUBLIC_SHEETS_1_URL),
  SHEETS_2_URL: asPublicString(process.env.NEXT_PUBLIC_SHEETS_2_URL),
});

export const PUBLIC_ENV_OK = Object.freeze({
  SHEETS: Boolean(PUBLIC_ENV.SHEETS_1_URL) && Boolean(PUBLIC_ENV.SHEETS_2_URL),
});

/**
 * Opcional: use quando você quiser "exigir" uma env pública.
 * Ex.: requirePublicEnv("SHEETS_1_URL")
 */
export function requirePublicEnv(key: keyof typeof PUBLIC_ENV) {
  const value = PUBLIC_ENV[key];
  if (!value) {
    throw new Error(
      `Variável pública ausente: NEXT_PUBLIC_${key}. Configure no .env.local e reinicie o servidor.`
    );
  }
  return value;
}

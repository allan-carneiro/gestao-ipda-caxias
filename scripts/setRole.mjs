import admin from "firebase-admin";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// --- resolver __dirname no ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- ler o JSON da service account via fs (sem import assert)
const keyPath = path.resolve(__dirname, "../serviceAccountKey.json");
const serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf8"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const email = process.argv[2];
const role = process.argv[3];

if (!email || !role) {
  console.log("Uso: node scripts/setRole.mjs <email> <role>");
  process.exit(1);
}

const valid = new Set(["admin", "secretaria", "lider", "consulta"]);
if (!valid.has(role)) {
  console.log("Role inválida:", role);
  process.exit(1);
}

const user = await admin.auth().getUserByEmail(email);
await admin.auth().setCustomUserClaims(user.uid, { role });

console.log(`OK! ${email} agora tem role=${role}`);
console.log("IMPORTANTE: faça logout/login no sistema para atualizar o token.");
process.exit(0);

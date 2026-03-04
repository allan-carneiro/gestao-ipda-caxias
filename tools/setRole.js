/* tools/setRole.js */
const admin = require("firebase-admin");

// ⚠️ Você precisa do serviceAccountKey.json baixado do Firebase
// Firebase Console → Project Settings → Service Accounts → Generate new private key
const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

async function main() {
  const uid = process.argv[2];
  const role = process.argv[3] || "admin";

  if (!uid) {
    console.log("Uso: node tools/setRole.js <UID> <role>");
    process.exit(1);
  }

  await admin.auth().setCustomUserClaims(uid, { role });
  console.log(`✅ Role '${role}' aplicada ao UID: ${uid}`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
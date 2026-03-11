const admin = require("firebase-admin");
const serviceAccount = require("../serviceAccountKey.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function migrateCollection(oldPath, newPath) {
  console.log(`Migrando ${oldPath} -> ${newPath}`);

  const snap = await db.collection(oldPath).get();

  for (const doc of snap.docs) {
    await db.doc(`${newPath}/${doc.id}`).set(doc.data());
  }

  console.log(`✔ ${snap.size} documentos migrados`);
}

async function run() {
  await migrateCollection("membros", "app_data/main/membros");
  await migrateCollection("auditoria", "app_data/main/auditoria");
  await migrateCollection("ceia_registros", "app_data/main/ceia_registros");

  console.log("Migração concluída.");
}

run();
const admin = require("firebase-admin");
const path = require("path");
const serviceAccount = require(path.resolve(__dirname, "../serviceAccountKey.json"));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

async function copyCollectionDocs(sourceCollectionPath, targetCollectionPath) {
  console.log(`\nMigrando ${sourceCollectionPath} -> ${targetCollectionPath}`);

  const snapshot = await db.collection(sourceCollectionPath).get();

  if (snapshot.empty) {
    console.log(`Nenhum documento encontrado em ${sourceCollectionPath}`);
    return;
  }

  const batchSize = 400;
  let operations = 0;
  let batch = db.batch();

  for (const docSnap of snapshot.docs) {
    const targetRef = db.doc(`${targetCollectionPath}/${docSnap.id}`);
    batch.set(targetRef, docSnap.data(), { merge: true });
    operations++;

    if (operations % batchSize === 0) {
      await batch.commit();
      batch = db.batch();
      console.log(`Lote commitado: ${operations} documentos`);
    }
  }

  if (operations % batchSize !== 0) {
    await batch.commit();
  }

  console.log(`✔ ${operations} documento(s) migrado(s)`);
}

async function copyCeiaControleWithParticipantes() {
  const sourceRoot = "ceia_controle";
  const targetRoot = "app_data/main/ceia_controle";

  console.log(`\nMigrando ${sourceRoot} -> ${targetRoot}`);

  const monthRefs = await db.collection(sourceRoot).listDocuments();

  if (!monthRefs.length) {
    console.log("Nenhum mês encontrado em ceia_controle");
    return;
  }

  for (const monthRef of monthRefs) {
    const monthId = monthRef.id;

    const monthSnap = await monthRef.get();
    const monthData = monthSnap.exists ? monthSnap.data() : {};

    await db.doc(`${targetRoot}/${monthId}`).set(monthData || {}, { merge: true });

    const participantesSnap = await db
      .collection(`${sourceRoot}/${monthId}/participantes`)
      .get();

    if (participantesSnap.empty) {
      console.log(`- ${monthId}: sem participantes`);
      continue;
    }

    let batch = db.batch();
    let operations = 0;
    const batchSize = 400;

    for (const participanteDoc of participantesSnap.docs) {
      const targetRef = db.doc(
        `${targetRoot}/${monthId}/participantes/${participanteDoc.id}`
      );

      batch.set(targetRef, participanteDoc.data(), { merge: true });
      operations++;

      if (operations % batchSize === 0) {
        await batch.commit();
        batch = db.batch();
      }
    }

    if (operations % batchSize !== 0) {
      await batch.commit();
    }

    console.log(`✔ ${monthId}: ${participantesSnap.size} participante(s) migrado(s)`);
  }
}

async function removeTestDocs() {
  const paths = [
    "app_data/main/membros/teste",
    "app_data/main/ceia_controle/teste",
    "app_data/main/ceia_registros/teste",
    "app_data/main/auditoria/teste",
  ];

  for (const docPath of paths) {
    try {
      await db.doc(docPath).delete();
      console.log(`Removido doc temporário: ${docPath}`);
    } catch (error) {
      console.log(`Não foi possível remover ${docPath}: ${error.message}`);
    }
  }
}

async function run() {
  try {
    console.log("=== INICIANDO MIGRAÇÃO PARA app_data/main ===");

    await copyCollectionDocs("membros", "app_data/main/membros");
    await copyCollectionDocs("auditoria", "app_data/main/auditoria");
    await copyCollectionDocs("ceia_registros", "app_data/main/ceia_registros");
    await copyCeiaControleWithParticipantes();
    await removeTestDocs();

    console.log("\n=== MIGRAÇÃO CONCLUÍDA COM SUCESSO ===");
  } catch (error) {
    console.error("Erro na migração:", error);
    process.exit(1);
  }
}

run();
/* tools/cleanupInvalidCeiaIds.js
 *
 * 🔎 Procura e (opcionalmente) apaga docs inválidos tipo:
 * - doc.id === "[object Object]"
 * - data.membroId === "[object Object]" ou algo com "[object"
 *
 * Uso:
 *   node tools/cleanupInvalidCeiaIds.js
 *   node tools/cleanupInvalidCeiaIds.js --fix
 *
 * Requisitos:
 * - serviceAccountKey.json na raiz do projeto (mesmo do setRole.js)
 */

const admin = require("firebase-admin");

// Ajuste se o arquivo estiver em outro lugar:
const serviceAccount = require("../serviceAccountKey.json");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();

const argv = process.argv.slice(2);
const FIX = argv.includes("--fix");

function isInvalidObjectString(v) {
  const s = String(v ?? "").trim();
  if (!s) return false;
  return s === "[object Object]" || s.includes("[object");
}

function asStr(v) {
  return String(v ?? "").trim();
}

async function listCeiaControleMonths() {
  const snap = await db.collection("ceia_controle").get();
  return snap.docs.map((d) => d.id);
}

async function scanCeiaControleMonth(monthId) {
  const col = db.collection("ceia_controle").doc(monthId).collection("participantes");
  const snap = await col.get();

  const invalid = [];
  snap.forEach((doc) => {
    const data = doc.data() || {};
    const docId = doc.id;
    const membroId = asStr(data.membroId);

    const bad =
      isInvalidObjectString(docId) ||
      isInvalidObjectString(membroId);

    if (bad) {
      invalid.push({
        path: doc.ref.path,
        docId,
        membroId,
        presente: data.presente === true,
        nome: asStr(data.nome || data.membroNome || data.nomeCompleto),
      });
    }
  });

  return invalid;
}

async function scanCeiaRegistros() {
  // Pode ser grande; vamos paginar.
  const col = db.collection("ceia_registros");
  const pageSize = 500;

  let last = null;
  const invalid = [];

  while (true) {
    let q = col.orderBy(admin.firestore.FieldPath.documentId()).limit(pageSize);
    if (last) q = q.startAfter(last);

    const snap = await q.get();
    if (snap.empty) break;

    snap.docs.forEach((doc) => {
      const data = doc.data() || {};
      const docId = doc.id;
      const membroId = asStr(data.membroId);

      const bad =
        isInvalidObjectString(docId) ||
        isInvalidObjectString(membroId);

      if (bad) {
        invalid.push({
          path: doc.ref.path,
          docId,
          membroId,
          ano: data.ano,
          mes: data.mes,
          nome: asStr(data.nome),
        });
      }
    });

    last = snap.docs[snap.docs.length - 1];
    if (snap.size < pageSize) break;
  }

  return invalid;
}

async function deletePaths(paths) {
  // batch delete em lotes de 500
  let deleted = 0;
  for (let i = 0; i < paths.length; i += 500) {
    const batch = db.batch();
    const slice = paths.slice(i, i + 500);
    slice.forEach((p) => batch.delete(db.doc(p)));
    await batch.commit();
    deleted += slice.length;
  }
  return deleted;
}

async function main() {
  console.log("🔎 Auditoria Firestore (Ceia) — procurando '[object Object]'");
  console.log(`Modo: ${FIX ? "FIX (vai apagar)" : "DRY-RUN (só listar)"}`);
  console.log("-------------------------------------------------------");

  // 1) ceia_controle/*/participantes/*
  const months = await listCeiaControleMonths();
  let invalidControle = [];
  for (const monthId of months) {
    const found = await scanCeiaControleMonth(monthId);
    if (found.length) invalidControle = invalidControle.concat(found);
  }

  // 2) ceia_registros/*
  const invalidRegistros = await scanCeiaRegistros();

  console.log(`\n📌 Encontrados em ceia_controle: ${invalidControle.length}`);
  invalidControle.slice(0, 50).forEach((x, idx) => {
    console.log(
      `  ${idx + 1}. ${x.path} | docId="${x.docId}" membroId="${x.membroId}" presente=${x.presente} nome="${x.nome}"`
    );
  });
  if (invalidControle.length > 50) console.log("  ... (mostrando só 50) ...");

  console.log(`\n📌 Encontrados em ceia_registros: ${invalidRegistros.length}`);
  invalidRegistros.slice(0, 50).forEach((x, idx) => {
    console.log(
      `  ${idx + 1}. ${x.path} | docId="${x.docId}" membroId="${x.membroId}" ano=${x.ano} mes=${x.mes} nome="${x.nome}"`
    );
  });
  if (invalidRegistros.length > 50) console.log("  ... (mostrando só 50) ...");

  const total = invalidControle.length + invalidRegistros.length;

  if (!FIX) {
    console.log("\n✅ DRY-RUN finalizado.");
    console.log("Para apagar esses docs automaticamente, rode:");
    console.log("   node tools/cleanupInvalidCeiaIds.js --fix");
    return;
  }

  if (total === 0) {
    console.log("\n✅ Nada para apagar. Tudo limpo.");
    return;
  }

  console.log("\n🧹 Apagando docs inválidos...");
  const pathsToDelete = [
    ...invalidControle.map((x) => x.path),
    ...invalidRegistros.map((x) => x.path),
  ];

  const deleted = await deletePaths(pathsToDelete);
  console.log(`✅ Apagados: ${deleted} documento(s).`);
  console.log("👉 Agora recarregue o Dashboard (F5) e confira o gráfico.");
}

main().catch((e) => {
  console.error("❌ Erro no script:", e);
  process.exit(1);
});
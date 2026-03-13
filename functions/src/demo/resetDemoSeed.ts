import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

const DEMO_ROOT = "demo_data/demo";

const MEMBERS_PATH = `${DEMO_ROOT}/membros`;
const AUDIT_PATH = `${DEMO_ROOT}/auditoria`;
const CEIA_REGISTROS_PATH = `${DEMO_ROOT}/ceia_registros`;
const EVANGELISMOS_PATH = `${DEMO_ROOT}/evangelismos`;
const CEIA_CONTROLE_PATH = `${DEMO_ROOT}/ceia_controle`;

const nomes = [
  "João Pereira",
  "Maria da Conceição",
  "Carlos Eduardo",
  "Ana Paula",
  "José Carlos",
  "Marcia Helena",
  "Paulo Roberto",
  "Luciana Alves",
  "Samuel Oliveira",
  "Rute Fernandes",
  "Daniel Souza",
  "Débora Lima",
  "Mateus Gomes",
  "Sara Cristina",
  "Elias Santos",
  "Priscila Rocha",
  "André Felipe",
  "Marta Silva",
  "Renato Martins",
  "Cláudia Ribeiro",
];

function pad(n: number) {
  return String(n).padStart(2, "0");
}

function randomDateBetween(startYear: number, endYear: number) {
  const year =
    startYear + Math.floor(Math.random() * (endYear - startYear + 1));
  const month = 1 + Math.floor(Math.random() * 12);
  const day = 1 + Math.floor(Math.random() * 28);
  return `${year}-${pad(month)}-${pad(day)}`;
}

function fakeCpf(index: number) {
  return `11122233${String(index).padStart(3, "0")}`.slice(0, 11);
}

function fakePhone(index: number) {
  return `2199${String(100000 + index).slice(0, 6)}`;
}

async function deleteCollectionRecursive(
  db: FirebaseFirestore.Firestore,
  path: string
) {
  const snap = await db.collection(path).get();

  for (const doc of snap.docs) {
    const subs = await doc.ref.listCollections();

    for (const sub of subs) {
      await deleteCollectionRecursive(db, `${path}/${doc.id}/${sub.id}`);
    }

    await doc.ref.delete();
  }
}

async function clearDemoData(db: FirebaseFirestore.Firestore) {
  await deleteCollectionRecursive(db, MEMBERS_PATH);
  await deleteCollectionRecursive(db, AUDIT_PATH);
  await deleteCollectionRecursive(db, CEIA_REGISTROS_PATH);
  await deleteCollectionRecursive(db, EVANGELISMOS_PATH);

  const ceiaControleDocs = await db.collection(CEIA_CONTROLE_PATH).get();

  for (const doc of ceiaControleDocs.docs) {
    const participantes = await doc.ref.collection("participantes").get();

    for (const p of participantes.docs) {
      await p.ref.delete();
    }

    await doc.ref.delete();
  }
}

async function seedMembros(db: FirebaseFirestore.Firestore) {
  const ids: string[] = [];

  for (let i = 0; i < nomes.length; i++) {
    const now = new Date().toISOString();

    const membro = {
      nomeCompleto: nomes[i],
      dataNascimento: randomDateBetween(1960, 2000),
      cpf: fakeCpf(i),
      telefoneCelular: fakePhone(i),
      status: i % 5 === 0 ? "Inativo" : "Ativo",
      createdAt: now,
      updatedAt: now,
    };

    const ref = await db.collection(MEMBERS_PATH).add(membro);

    ids.push(ref.id);

    await db.collection(AUDIT_PATH).add({
      action: "create",
      entity: "membro",
      entityId: ref.id,
      entityLabel: membro.nomeCompleto,
      details: "Membro fictício criado no reset da DEMO.",
      userUid: "system-demo",
      userEmail: "system@demo.local",
      userDisplayName: "Reset Demo",
      before: null,
      after: membro,
      occurredAtIso: new Date().toISOString(),
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  return ids;
}

async function seedCeia(db: FirebaseFirestore.Firestore) {
  const meses = [
    { ano: 2026, mes: 1 },
    { ano: 2026, mes: 2 },
    { ano: 2026, mes: 3 },
    { ano: 2026, mes: 4 },
  ];

  const memberDocs = await db.collection(MEMBERS_PATH).get();

  const members = memberDocs.docs.map((d) => ({
    id: d.id,
    ...(d.data() as any),
  }));

  for (const { ano, mes } of meses) {
    const ym = `${ano}-${pad(mes)}`;

    const controleRef = db.collection(CEIA_CONTROLE_PATH).doc(ym);

    await controleRef.set({
      mesRef: ym,
      ano,
      mes,
      finalized: mes < 4,
      createdAt: FieldValue.serverTimestamp(),
    });

    for (const membro of members) {
      const presente = membro.status === "Ativo";

      await controleRef.collection("participantes").doc(membro.id).set({
        membroId: membro.id,
        membroNome: membro.nomeCompleto,
        presente,
        createdAt: FieldValue.serverTimestamp(),
      });

      if (presente) {
        await db.collection(CEIA_REGISTROS_PATH).add({
          membroId: membro.id,
          nomeCompleto: membro.nomeCompleto,
          ano,
          mes,
          mesRef: ym,
          createdAt: FieldValue.serverTimestamp(),
        });
      }
    }
  }
}

async function seedEvangelismos(
  db: FirebaseFirestore.Firestore,
  memberIds: string[]
) {
  const docs = [
    {
      titulo: "Ação evangelística na praça",
      data: "2026-03-08",
      responsavel: "Equipe DEMO 1",
      participantesIds: memberIds.slice(0, 5),
      createdAt: FieldValue.serverTimestamp(),
    },
    {
      titulo: "Visita evangelística em lares",
      data: "2026-03-15",
      responsavel: "Equipe DEMO 2",
      participantesIds: memberIds.slice(5, 10),
      createdAt: FieldValue.serverTimestamp(),
    },
  ];

  for (const item of docs) {
    await db.collection(EVANGELISMOS_PATH).add(item);
  }
}

export async function resetDemoSeed() {
  const db = admin.firestore();

  await clearDemoData(db);
  const memberIds = await seedMembros(db);
  await seedCeia(db);
  await seedEvangelismos(db, memberIds);

  await db.collection(AUDIT_PATH).add({
    action: "reset_demo",
    entity: "demo_data",
    entityId: "demo",
    entityLabel: "Ambiente DEMO",
    details: "Ambiente de demonstração resetado com sucesso.",
    occurredAtIso: new Date().toISOString(),
    createdAt: FieldValue.serverTimestamp(),
  });

  return {
    ok: true,
    root: DEMO_ROOT,
  };
}
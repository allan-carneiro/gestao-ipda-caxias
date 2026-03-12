/* scripts/seed-demo.ts */
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

type Status = "Ativo" | "Inativo";
type EstadoCivil =
  | "Solteiro(a)"
  | "Casado(a)"
  | "Divorciado(a)"
  | "Viúvo(a)"
  | "União estável";

type Cargo =
  | "Membro"
  | "Obreiro"
  | "Diácono"
  | "Presbítero"
  | "Pastor"
  | "Expansão"
  | "Levita do Ministério de Louvor"
  | "Instrumentista";

type DemoMembro = {
  nomeCompleto: string;
  dataNascimento: string;
  cpf: string;
  rg: string;
  estadoCivil: EstadoCivil;
  nomeConjuge: string | null;

  telefoneCelular: string;
  telefoneResidencial: string | null;
  email: string | null;

  endereco: {
    logradouro: string;
    numero: string;
    complemento: string | null;
    lote: string | null;
    quadra: string | null;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string | null;
  };

  dataBatismo: string | null;
  campo: string;
  congregacao: string;
  pastor: string;
  cargoEclesiastico: Cargo;

  naturalidade: string | null;
  escolaridade: string | null;
  profissao: string | null;
  filhosQtd: number | null;
  netosQtd: number | null;

  status: Status;
  observacoes: string | null;

  fotoUrl: string | null;
  anexos: any[];

  numeroRol: number | null;
  ipdaPastor: string | null;
  telCarta: "Tel." | "Carta" | null;

  createdAt: string;
  updatedAt: string;

  ceiaFaltanteRecorrente?: boolean;
  faltasSeguidasCeia?: number;
  ceiaObs?: string | null;
  ceiaFaltasSeq?: string[];
  ceiaFaltasSeqLabel?: string | null;
};

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  throw new Error(
    "Faltam variáveis FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL ou FIREBASE_PRIVATE_KEY."
  );
}

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
}

const db = getFirestore();

/**
 * Estrutura válida no Firestore:
 *
 * demo_data (collection)
 *   demo (document)
 *     membros (collection)
 *     auditoria (collection)
 *     ceia_controle (collection)
 *     ceia_registros (collection)
 *     evangelismos (collection)
 */
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

const cargos: Cargo[] = [
  "Membro",
  "Membro",
  "Membro",
  "Obreiro",
  "Diácono",
  "Presbítero",
  "Expansão",
  "Levita do Ministério de Louvor",
  "Instrumentista",
  "Membro",
];

const estadosCivis: EstadoCivil[] = [
  "Solteiro(a)",
  "Casado(a)",
  "União estável",
  "Divorciado(a)",
  "Viúvo(a)",
];

const bairros = [
  "Centro",
  "Jardim Primavera",
  "25 de Agosto",
  "Parque Fluminense",
  "Jardim Gramacho",
  "Sarapuí",
  "Vila São Luís",
];

const ruas = [
  "Rua da Assembleia",
  "Rua da Paz",
  "Rua das Oliveiras",
  "Rua Jerusalém",
  "Rua Ebenézer",
  "Rua da Comunhão",
  "Rua Esperança",
];

const profissoes = [
  "Autônomo(a)",
  "Motorista",
  "Cozinheiro(a)",
  "Auxiliar administrativo",
  "Técnico(a) de enfermagem",
  "Comerciante",
  "Costureiro(a)",
  "Pedreiro",
];

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

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

function digitsOnly(v: string) {
  return v.replace(/\D/g, "");
}

function fakeCpf(index: number) {
  return digitsOnly(`11122233${String(index).padStart(3, "0")}`).slice(0, 11);
}

function fakePhone(index: number) {
  return `2199${String(100000 + index).slice(0, 6)}`;
}

function makeMembro(nomeCompleto: string, index: number): DemoMembro {
  const now = new Date().toISOString();
  const status: Status = index % 6 === 0 ? "Inativo" : "Ativo";
  const estadoCivil = rand(estadosCivis);
  const dataNascimento = randomDateBetween(1958, 2003);
  const cargoEclesiastico = rand(cargos);
  const faltante = status === "Ativo" && index % 5 === 0;

  return {
    nomeCompleto,
    dataNascimento,
    cpf: fakeCpf(index),
    rg: `20${1000000 + index}`,
    estadoCivil,
    nomeConjuge:
      estadoCivil === "Casado(a)" || estadoCivil === "União estável"
        ? `Cônjuge de ${nomeCompleto.split(" ")[0]}`
        : null,

    telefoneCelular: fakePhone(index),
    telefoneResidencial:
      index % 4 === 0 ? `2132${String(1000 + index).slice(0, 4)}` : null,
    email: index % 3 === 0 ? `membro${index}@demo.local` : null,

    endereco: {
      logradouro: rand(ruas),
      numero: String(10 + index),
      complemento: index % 4 === 0 ? "Casa" : null,
      lote: index % 5 === 0 ? String(index) : null,
      quadra: index % 6 === 0 ? `Q${index % 10}` : null,
      bairro: rand(bairros),
      cidade: "Duque de Caxias",
      estado: "RJ",
      cep: `250${String(10000 + index).slice(0, 5)}`,
    },

    dataBatismo: index % 3 === 0 ? randomDateBetween(2010, 2024) : null,
    campo: "Duque de Caxias",
    congregacao: index % 2 === 0 ? "Sede" : "Congregação Central",
    pastor: index % 2 === 0 ? "Pr. Exemplo" : "Pr. Auxiliar",
    cargoEclesiastico,

    naturalidade: "Rio de Janeiro",
    escolaridade: index % 2 === 0 ? "Ensino Médio" : "Ensino Fundamental",
    profissao: rand(profissoes),
    filhosQtd: index % 3 === 0 ? index % 4 : null,
    netosQtd: index % 7 === 0 ? index % 3 : null,

    status,
    observacoes:
      index % 4 === 0 ? "Cadastro fictício da demonstração." : null,

    fotoUrl: null,
    anexos: [],

    numeroRol: 300 + index,
    ipdaPastor: index % 2 === 0 ? "IPDA Caxias" : "IPDA — Pastor",
    telCarta: index % 3 === 0 ? "Tel." : index % 4 === 0 ? "Carta" : null,

    createdAt: now,
    updatedAt: now,

    ceiaFaltanteRecorrente: faltante,
    faltasSeguidasCeia: faltante ? 2 + (index % 3) : 0,
    ceiaObs: faltante ? "Faltante recorrente em acompanhamento." : null,
    ceiaFaltasSeq: faltante ? ["2026-01", "2026-02", "2026-03"] : [],
    ceiaFaltasSeqLabel: faltante ? "Jan/2026 • Fev/2026 • Mar/2026" : null,
  };
}

async function deleteCollectionRecursive(path: string) {
  const snap = await db.collection(path).get();

  for (const doc of snap.docs) {
    const subs = await doc.ref.listCollections();

    for (const sub of subs) {
      await deleteCollectionRecursive(`${path}/${doc.id}/${sub.id}`);
    }

    await doc.ref.delete();
  }
}

async function clearDemoData() {
  await deleteCollectionRecursive(MEMBERS_PATH);
  await deleteCollectionRecursive(AUDIT_PATH);
  await deleteCollectionRecursive(CEIA_REGISTROS_PATH);
  await deleteCollectionRecursive(EVANGELISMOS_PATH);

  const ceiaControleDocs = await db.collection(CEIA_CONTROLE_PATH).get();

  for (const doc of ceiaControleDocs.docs) {
    const participantes = await doc.ref.collection("participantes").get();

    for (const p of participantes.docs) {
      await p.ref.delete();
    }

    await doc.ref.delete();
  }
}

async function seedMembros() {
  const ids: string[] = [];

  for (let i = 0; i < nomes.length; i++) {
    const membro = makeMembro(nomes[i], i + 1);
    const ref = await db.collection(MEMBERS_PATH).add(membro);
    ids.push(ref.id);

    await db.collection(AUDIT_PATH).add({
      action: "create",
      entity: "membro",
      entityId: ref.id,
      entityLabel: membro.nomeCompleto,
      details: "Membro fictício criado no seed da demonstração.",
      userUid: "demo-seed",
      userEmail: "demo@seed.local",
      userDisplayName: "Seed Demo",
      before: null,
      after: {
        nomeCompleto: membro.nomeCompleto,
        status: membro.status,
        cpf: membro.cpf,
        telefoneCelular: membro.telefoneCelular,
        congregacao: membro.congregacao,
        pastor: membro.pastor,
        campo: membro.campo,
        cargoEclesiastico: membro.cargoEclesiastico,
        numeroRol: membro.numeroRol,
        telCarta: membro.telCarta,
        fotoUrl: membro.fotoUrl,
        endereco: membro.endereco,
        updatedAt: membro.updatedAt,
        createdAt: membro.createdAt,
      },
      metadata: {
        origem: "scripts/seed-demo",
        role: "demo",
        dataRoot: MEMBERS_PATH,
      },
      occurredAtIso: new Date().toISOString(),
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  return ids;
}

async function seedCeia() {
  const meses = [
    { ano: 2026, mes: 1 },
    { ano: 2026, mes: 2 },
    { ano: 2026, mes: 3 },
    { ano: 2026, mes: 4 },
  ];

  const memberDocs = await db.collection(MEMBERS_PATH).get();
  const members = memberDocs.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

  for (const { ano, mes } of meses) {
    const ym = `${ano}-${pad(mes)}`;
    const controleRef = db.collection(CEIA_CONTROLE_PATH).doc(ym);

    await controleRef.set({
      mesRef: ym,
      ano,
      mes,
      finalized: mes < 4,
      updatedAt: new Date().toISOString(),
      createdAt: FieldValue.serverTimestamp(),
    });

    for (const membro of members) {
      const presente = membro.status === "Ativo" ? Math.random() > 0.22 : false;

      await controleRef.collection("participantes").doc(membro.id).set({
        membroId: membro.id,
        membroNome: membro.nomeCompleto,
        dataNascimento: membro.dataNascimento ?? null,
        cpf: membro.cpf ?? null,
        presente,
        updatedAt: new Date().toISOString(),
        createdAt: FieldValue.serverTimestamp(),
      });

      if (presente) {
        await db.collection(CEIA_REGISTROS_PATH).add({
          membroId: membro.id,
          nomeCompleto: membro.nomeCompleto,
          dataNascimento: membro.dataNascimento ?? null,
          cpf: membro.cpf ?? null,
          ano,
          mes,
          mesRef: ym,
          details: "Participação fictícia de Santa Ceia na DEMO.",
          createdAt: FieldValue.serverTimestamp(),
          occurredAtIso: new Date().toISOString(),
        });
      }
    }

    await db.collection(AUDIT_PATH).add({
      action: "finalize_month",
      entity: "ceia_mes",
      entityId: ym,
      entityLabel: ym,
      details: `Mês fictício de ceia preparado para demonstração (${ym}).`,
      userUid: "demo-seed",
      userEmail: "demo@seed.local",
      userDisplayName: "Seed Demo",
      before: null,
      after: {
        mesRef: ym,
        ano,
        mes,
      },
      metadata: {
        origem: "scripts/seed-demo",
        role: "demo",
        dataRoot: CEIA_CONTROLE_PATH,
      },
      occurredAtIso: new Date().toISOString(),
      createdAt: FieldValue.serverTimestamp(),
    });
  }
}

async function seedEvangelismos(memberIds: string[]) {
  const docs = [
    {
      titulo: "Ação evangelística na praça",
      data: "2026-03-08",
      responsavel: "Equipe DEMO 1",
      local: "Praça do Pacificador",
      quantidadeAlmas: 4,
      observacoes: "Registro fictício para demonstração.",
      participantesIds: memberIds.slice(0, 6),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: new Date().toISOString(),
    },
    {
      titulo: "Visita evangelística em lares",
      data: "2026-03-15",
      responsavel: "Equipe DEMO 2",
      local: "Jardim Primavera",
      quantidadeAlmas: 2,
      observacoes: "Registro fictício para demonstração.",
      participantesIds: memberIds.slice(6, 12),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: new Date().toISOString(),
    },
  ];

  for (const item of docs) {
    await db.collection(EVANGELISMOS_PATH).add(item);
  }
}

async function main() {
  console.log("Limpando demo_data...");
  await clearDemoData();

  console.log("Criando membros fictícios...");
  const memberIds = await seedMembros();

  console.log("Criando histórico de Santa Ceia...");
  await seedCeia();

  console.log("Criando evangelismos fictícios...");
  await seedEvangelismos(memberIds);

  console.log("Seed da DEMO concluído com sucesso.");
}

main().catch((err) => {
  console.error("Falha no seed da DEMO:", err);
  process.exit(1);
});
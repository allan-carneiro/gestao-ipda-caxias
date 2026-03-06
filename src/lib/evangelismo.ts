import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "@/src/lib/firebase";

export type Evangelismo = {
  id?: string;
  dataEvangelismo: string; // yyyy-mm-dd
  localRealizado: string;
  ipdaResponsavel: string;
  teveApoioExterno: boolean;
  ipdaApoiadora?: string | null;
  almasAceitaramJesus: number;
  almasSeReconciliaram: number;
  createdAt?: string;
  updatedAt?: string;
};

function cleanText(v: unknown) {
  return String(v ?? "").trim().replace(/\s+/g, " ");
}

function toNonNegativeInt(v: unknown) {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

export function normalizarEvangelismoPayload(
  input: Partial<Evangelismo>
): Evangelismo {
  const teveApoioExterno = !!input.teveApoioExterno;

  return {
    dataEvangelismo: cleanText(input.dataEvangelismo),
    localRealizado: cleanText(input.localRealizado),
    ipdaResponsavel: cleanText(input.ipdaResponsavel),
    teveApoioExterno,
    ipdaApoiadora: teveApoioExterno
      ? cleanText(input.ipdaApoiadora) || null
      : null,
    almasAceitaramJesus: toNonNegativeInt(input.almasAceitaramJesus),
    almasSeReconciliaram: toNonNegativeInt(input.almasSeReconciliaram),
    createdAt: cleanText(input.createdAt),
    updatedAt: cleanText(input.updatedAt),
  };
}

export function validarEvangelismoPayload(
  input: Partial<Evangelismo>
): { ok: true; value: Evangelismo } | { ok: false; message: string } {
  const value = normalizarEvangelismoPayload(input);

  if (!value.dataEvangelismo) {
    return { ok: false, message: "Informe a data do evangelismo." };
  }

  if (!value.localRealizado) {
    return { ok: false, message: "Informe onde foi realizado o evangelismo." };
  }

  if (!value.ipdaResponsavel) {
    return { ok: false, message: "Informe qual IPDA realizou o evangelismo." };
  }

  if (value.teveApoioExterno && !value.ipdaApoiadora) {
    return {
      ok: false,
      message: "Informe qual IPDA ajudou nesse evangelismo.",
    };
  }

  return { ok: true, value };
}

export async function criarEvangelismo(payload: Partial<Evangelismo>) {
  const vr = validarEvangelismoPayload(payload);
  if (!vr.ok) {
    throw new Error(vr.message);
  }

  const now = new Date().toISOString();

  const finalPayload: Evangelismo = {
    ...vr.value,
    createdAt: vr.value.createdAt || now,
    updatedAt: now,
  };

  const ref = await addDoc(collection(db, "evangelismos"), finalPayload as any);
  return ref.id;
}

export async function listarEvangelismos(): Promise<Evangelismo[]> {
  const qy = query(
    collection(db, "evangelismos"),
    orderBy("dataEvangelismo", "desc")
  );

  const snap = await getDocs(qy);

  return snap.docs.map((d) => {
    const data = d.data() as any;

    return {
      id: d.id,
      dataEvangelismo: cleanText(data?.dataEvangelismo),
      localRealizado: cleanText(data?.localRealizado),
      ipdaResponsavel: cleanText(data?.ipdaResponsavel),
      teveApoioExterno: !!data?.teveApoioExterno,
      ipdaApoiadora: cleanText(data?.ipdaApoiadora) || null,
      almasAceitaramJesus: toNonNegativeInt(data?.almasAceitaramJesus),
      almasSeReconciliaram: toNonNegativeInt(data?.almasSeReconciliaram),
      createdAt: cleanText(data?.createdAt),
      updatedAt: cleanText(data?.updatedAt),
    };
  });
}
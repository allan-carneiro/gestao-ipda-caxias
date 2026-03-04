"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import AuthGuard from "@/app/components/AuthGuard";

type Status = "Ativo" | "Inativo";

type Membro = {
  nomeCompleto?: string;
  nome?: string; // antigo

  telefoneCelular?: string;
  telefone?: string; // antigo
  email?: string | null;

  status?: Status;

  cpf?: string; // pode estar como digits ou já com máscara
  rg?: string;

  dataNascimento?: string; // ISO (YYYY-MM-DD) ou BR (DD/MM/AAAA) em dados antigos
  dataBatismo?: string | null;

  campo?: string;
  congregacao?: string;
  pastor?: string;
  cargoEclesiastico?: string;

  fotoUrl?: string | null;

  endereco?: {
    logradouro?: string;
    numero?: string;
    complemento?: string | null;
    bairro?: string;
    cidade?: string;
    estado?: string;
    cep?: string | null;
  };

  observacoes?: string | null;
};

function isStatusValido(v: any): v is Status {
  return v === "Ativo" || v === "Inativo";
}

function onlyDigits(v?: string | null) {
  return (v || "").replace(/\D/g, "");
}

function maskCPF(v?: string | null) {
  const d = onlyDigits(v).slice(0, 11);
  if (!d) return "";
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4");
}

function maskCEP(v?: string | null) {
  const d = onlyDigits(v).slice(0, 8);
  if (!d) return "";
  return d.replace(/^(\d{5})(\d)/, "$1-$2");
}

function maskPhone(v?: string | null) {
  const d = onlyDigits(v).slice(0, 11);
  if (!d) return "";

  if (d.length <= 10) {
    return d
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }

  return d
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

function normalizeNomeCompleto(nome: string) {
  const cleaned = String(nome ?? "")
    .trim()
    .replace(/\s+/g, " ");

  if (!cleaned) return "";

  const lowerWords = new Set(["da", "de", "do", "das", "dos", "e"]);

  return cleaned
    .split(" ")
    .map((w, i) => {
      const wl = w.toLowerCase();
      if (i > 0 && lowerWords.has(wl)) return wl;
      return wl.charAt(0).toUpperCase() + wl.slice(1);
    })
    .join(" ");
}

// ✅ Display de data para usuário final: DD-MM-AAAA
function formatarDataBR(v?: string | null) {
  const s = String(v ?? "").trim();
  if (!s) return "";

  // ISO → YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-");
    return `${d}-${m}-${y}`;
  }

  // já está em BR (DD/MM/AAAA) — mantém
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) return s;

  return s;
}

// ===== Idade (runtime) =====
function isValidDate(d: Date) {
  return d instanceof Date && !Number.isNaN(d.getTime());
}

function parseBRToISO(br: string) {
  const m = String(br || "").trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

function parseNascimentoToDate(v?: string | null) {
  const s = String(v ?? "").trim();
  if (!s) return null;

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const iso = parseBRToISO(s);
    if (!iso) return null;
    const d = new Date(`${iso}T00:00:00`);
    return isValidDate(d) ? d : null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(`${s}T00:00:00`);
    return isValidDate(d) ? d : null;
  }

  const d = new Date(s);
  return isValidDate(d) ? d : null;
}

function calcularIdade(dataNasc?: string | null) {
  const d = parseNascimentoToDate(dataNasc);
  if (!d) return null;

  const now = new Date();
  let idade = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) idade--;

  if (idade < 0 || idade > 130) return null;
  return idade;
}

function formatarIdade(idade: number | null) {
  if (idade === null) return "";
  return `${idade} ano${idade === 1 ? "" : "s"}`;
}

/* ============================
   MODAL (mesmo padrão do dashboard)
============================ */
function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-black/40 animate-[fadeIn_160ms_ease-out]"
      />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl overflow-hidden animate-[popIn_180ms_ease-out]">
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <h2 className="font-semibold text-lg">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              ✕
            </button>
          </div>

          <div className="p-5">{children}</div>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes popIn {
          from {
            opacity: 0;
            transform: translateY(6px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}

export default function VerMembroPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const idParam = params?.id;
  const memberId = Array.isArray(idParam) ? idParam[0] : idParam;

  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [membro, setMembro] = useState<Membro | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalKind, setModalKind] = useState<"inativar" | "ativar" | "excluir">(
    "inativar"
  );

  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setErro(null);
        setSucesso(null);

        if (!memberId) {
          setErro("ID do membro não encontrado.");
          return;
        }

        const ref = doc(db, "membros", memberId);
        const snap = await getDoc(ref);

        if (!snap.exists()) {
          setErro("Membro não encontrado.");
          return;
        }

        setMembro(snap.data() as Membro);
      } catch (e: any) {
        console.error(e);
        setErro(e?.message ? `Erro: ${e.message}` : "Erro ao carregar membro.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [memberId]);

  const nome = useMemo(() => {
    const raw = membro?.nomeCompleto || membro?.nome || "";
    return normalizeNomeCompleto(raw) || "(Sem nome)";
  }, [membro?.nomeCompleto, membro?.nome]);

  const telRaw = membro?.telefoneCelular || membro?.telefone || "";
  const editarHref = memberId ? `/membros/${memberId}/editar` : "/membros";

  const telefone = useMemo(() => maskPhone(telRaw), [telRaw]);
  const cpf = useMemo(() => maskCPF(membro?.cpf ?? null), [membro?.cpf]);
  const cep = useMemo(
    () => maskCEP(membro?.endereco?.cep ?? null),
    [membro?.endereco?.cep]
  );

  // ✅ mostra “Sem status” se vier docs antigos sem status
  const statusLabel = useMemo(() => {
    const s = membro?.status;
    if (isStatusValido(s)) return s;
    return "Sem status";
  }, [membro?.status]);

  const idade = useMemo(
    () => calcularIdade(membro?.dataNascimento ?? null),
    [membro?.dataNascimento]
  );
  const idadeTxt = useMemo(() => formatarIdade(idade), [idade]);

  function openModal(kind: "inativar" | "ativar" | "excluir") {
    setErro(null);
    setSucesso(null);
    setModalKind(kind);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setActionLoading(false);
  }

  async function setStatus(novo: Status) {
    if (!memberId) return;

    try {
      setActionLoading(true);
      setErro(null);
      setSucesso(null);

      const now = new Date().toISOString();

      await updateDoc(doc(db, "membros", memberId), {
        status: novo,
        updatedAt: now,
      } as any);

      setMembro((prev) => ({ ...(prev || {}), status: novo }));
      setSucesso(
        novo === "Inativo"
          ? "Membro inativado com sucesso."
          : "Membro ativado com sucesso."
      );

      closeModal();
      setTimeout(() => setSucesso(null), 1400);
    } catch (e: any) {
      console.error(e);
      setErro(e?.message ? `Erro: ${e.message}` : "Erro ao atualizar status.");
      setActionLoading(false);
    }
  }

  // ✅ checa histórico (Ceia) antes de excluir
  async function membroTemHistoricoCeia(mId: string): Promise<boolean> {
    const qy = query(
      collection(db, "ceia_registros"),
      where("membroId", "==", mId),
      limit(1)
    );
    const snap = await getDocs(qy);
    return !snap.empty;
  }

  async function excluirDefinitivo() {
    if (!memberId) return;

    try {
      setActionLoading(true);
      setErro(null);
      setSucesso(null);

      const temHistorico = await membroTemHistoricoCeia(memberId);
      if (temHistorico) {
        setErro(
          "Não é possível excluir definitivamente: este membro possui histórico (Santa Ceia). Use “Inativar” para manter os relatórios consistentes."
        );
        setActionLoading(false);
        return;
      }

      await deleteDoc(doc(db, "membros", memberId));
      closeModal();
      router.push("/membros");
    } catch (e: any) {
      console.error(e);
      setErro(e?.message ? `Erro: ${e.message}` : "Erro ao excluir o membro.");
      setActionLoading(false);
    }
  }

  const modalTitle =
    modalKind === "excluir"
      ? "Excluir membro"
      : modalKind === "ativar"
      ? "Ativar membro"
      : "Inativar membro";

  const statusIsMissing = statusLabel === "Sem status";

  return (
    <AuthGuard>
      <main className="min-h-screen bg-gray-100 p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-blue-700">
                {nome}
              </h1>

              <p className="text-gray-600 mt-1">
                Status:{" "}
                <span
                  className={
                    statusIsMissing
                      ? "font-semibold text-amber-700"
                      : statusLabel === "Ativo"
                      ? "font-semibold text-green-700"
                      : "font-semibold text-gray-700"
                  }
                >
                  {statusLabel}
                </span>
                {idadeTxt ? (
                  <>
                    {" "}
                    • Idade: <span className="font-semibold">{idadeTxt}</span>
                  </>
                ) : null}
              </p>

              {statusIsMissing ? (
                <p className="text-sm text-amber-700 mt-1">
                  Este cadastro antigo está sem status. Entre em “Editar” e
                  selecione Ativo/Inativo.
                </p>
              ) : null}

              {!loading && !erro ? (
                <div className="mt-4 flex items-center gap-4">
                  {membro?.fotoUrl ? (
                    <img
                      src={membro.fotoUrl}
                      alt="Foto do membro"
                      className="h-24 w-24 rounded-2xl object-cover border bg-white"
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-2xl border bg-white flex items-center justify-center text-gray-400">
                      Sem foto
                    </div>
                  )}

                  <div className="text-sm text-gray-600">
                    <p className="font-semibold text-gray-900">Foto do membro</p>
                    <p>Você pode adicionar/trocar em “Editar”.</p>
                  </div>
                </div>
              ) : null}
            </div>

            <Link
              href="/membros"
              className="rounded-xl bg-white px-4 py-2 shadow hover:bg-gray-50"
            >
              Voltar
            </Link>
          </div>

          <div className="mt-6 bg-white rounded-2xl shadow p-6">
            {sucesso ? (
              <div className="mb-4 rounded-2xl bg-green-50 border border-green-200 p-4 text-green-800">
                {sucesso}
              </div>
            ) : null}

            {loading ? (
              <p>Carregando...</p>
            ) : erro ? (
              <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-700">
                {erro}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {telefone ? (
                    <p>
                      <b>Telefone:</b> {telefone}
                    </p>
                  ) : null}

                  {membro?.email ? (
                    <p>
                      <b>E-mail:</b> {membro.email}
                    </p>
                  ) : null}

                  {cpf ? (
                    <p>
                      <b>CPF:</b> {cpf}
                    </p>
                  ) : null}

                  {membro?.rg ? (
                    <p>
                      <b>RG:</b> {membro.rg}
                    </p>
                  ) : null}

                  {/* ✅ Nascimento formatado (sem repetir idade aqui) */}
                  {membro?.dataNascimento ? (
                    <p>
                      <b>Nascimento:</b> {formatarDataBR(membro.dataNascimento)}
                    </p>
                  ) : null}

                  {membro?.dataBatismo ? (
                    <p>
                      <b>Batismo:</b> {membro.dataBatismo}
                    </p>
                  ) : null}

                  {membro?.campo ? (
                    <p>
                      <b>Campo:</b> {membro.campo}
                    </p>
                  ) : null}

                  {membro?.congregacao ? (
                    <p>
                      <b>Congregação:</b> {membro.congregacao}
                    </p>
                  ) : null}

                  {membro?.pastor ? (
                    <p>
                      <b>Pastor:</b> {membro.pastor}
                    </p>
                  ) : null}

                  {membro?.cargoEclesiastico ? (
                    <p>
                      <b>Cargo:</b> {membro.cargoEclesiastico}
                    </p>
                  ) : null}
                </div>

                {membro?.endereco ? (
                  <div className="mt-4">
                    <h2 className="font-semibold">Endereço</h2>
                    <p className="text-gray-700">
                      {membro.endereco.logradouro || ""}
                      {membro.endereco.numero ? `, ${membro.endereco.numero}` : ""}
                      {membro.endereco.complemento
                        ? ` - ${membro.endereco.complemento}`
                        : ""}
                      {membro.endereco.bairro ? ` - ${membro.endereco.bairro}` : ""}
                      {membro.endereco.cidade ? ` - ${membro.endereco.cidade}` : ""}
                      {membro.endereco.estado ? `/${membro.endereco.estado}` : ""}
                      {cep ? ` - CEP: ${cep}` : ""}
                    </p>
                  </div>
                ) : null}

                {membro?.observacoes ? (
                  <div className="mt-4">
                    <h2 className="font-semibold">Observações</h2>
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {membro.observacoes}
                    </p>
                  </div>
                ) : null}

                <div className="mt-6 flex flex-col md:flex-row gap-3">
                  <Link
                    href={editarHref}
                    className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 text-center"
                  >
                    Editar
                  </Link>

                  {statusLabel === "Ativo" ? (
                    <button
                      type="button"
                      onClick={() => openModal("inativar")}
                      className="bg-amber-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-amber-700"
                    >
                      Inativar
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openModal("ativar")}
                      className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-700"
                    >
                      Ativar
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => openModal("excluir")}
                    className="bg-red-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-red-700"
                  >
                    Excluir definitivo
                  </button>

                  <Link
                    href="/membros"
                    className="bg-white border px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 text-center"
                  >
                    Cancelar
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>

        {/* MODAL */}
        <Modal open={modalOpen} title={modalTitle} onClose={closeModal}>
          {modalKind === "inativar" ? (
            <div className="space-y-4">
              <p className="text-gray-700">
                Tem certeza que deseja <b>inativar</b> o membro <b>{nome}</b>?
              </p>
              <p className="text-sm text-gray-600">
                Isso mantém o histórico e evita inconsistência nas estatísticas.
              </p>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
                  disabled={actionLoading}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => setStatus("Inativo")}
                  className="px-4 py-2 rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-700 disabled:opacity-60"
                  disabled={actionLoading}
                >
                  {actionLoading ? "Inativando..." : "Confirmar"}
                </button>
              </div>
            </div>
          ) : null}

          {modalKind === "ativar" ? (
            <div className="space-y-4">
              <p className="text-gray-700">
                Deseja <b>ativar</b> o membro <b>{nome}</b> novamente?
              </p>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
                  disabled={actionLoading}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => setStatus("Ativo")}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60"
                  disabled={actionLoading}
                >
                  {actionLoading ? "Ativando..." : "Confirmar"}
                </button>
              </div>
            </div>
          ) : null}

          {modalKind === "excluir" ? (
            <div className="space-y-4">
              <p className="text-gray-700">
                Você está prestes a <b>excluir definitivamente</b> o membro{" "}
                <b>{nome}</b>.
              </p>
              <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
                Atenção: isso remove o documento do Firestore. Se este membro já
                tiver histórico (ex.: Santa Ceia), a exclusão será bloqueada e
                você deve usar “Inativar”.
              </p>

              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl border bg-white hover:bg-gray-50"
                  disabled={actionLoading}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={excluirDefinitivo}
                  className="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 disabled:opacity-60"
                  disabled={actionLoading}
                >
                  {actionLoading ? "Excluindo..." : "Excluir definitivamente"}
                </button>
              </div>
            </div>
          ) : null}
        </Modal>
      </main>
    </AuthGuard>
  );
}
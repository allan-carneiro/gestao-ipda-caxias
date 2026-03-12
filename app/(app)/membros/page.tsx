"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import { useToast } from "@/app/components/ToastProvider";
import { normalizeText, onlyDigits } from "@/src/lib/membroSearch";
import { getUserRoleFromToken } from "@/src/lib/auth/getUserRole";
import { canEditMembers, isDemo } from "@/src/lib/auth/permissions";
import { getPaths } from "@/src/lib/demo/paths";
import type { UserRole } from "@/src/types/auth";

type Status = "Ativo" | "Inativo";

type Membro = {
  id: string;
  nomeCompleto?: string;
  nome?: string;
  telefoneCelular?: string;
  telefone?: string;
  cargoEclesiastico?: string;
  status?: Status;
  dataNascimento?: string;
  cpf?: string | null;
  numeroRol?: number | string;
  ipdaPastor?: string;
  telCarta?: string;
};

const CARGOS = [
  "Membro",
  "Obreiro",
  "Diácono",
  "Presbítero",
  "Pastor",
  "Expansão",
  "Levita do Ministério de Louvor",
  "Instrumentista",
] as const;

function statusSeguro(v?: any): Status {
  return v === "Inativo" ? "Inativo" : "Ativo";
}

function isoNow() {
  return new Date().toISOString();
}

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
  if (idade == null) return "";
  return `${idade} ano${idade === 1 ? "" : "s"}`;
}

function scoreNomeMatch(nomeOriginal: string, termo: string) {
  const nome = normalizeText(nomeOriginal);
  const q = normalizeText(termo);

  if (!q) return 0;

  const words = nome.split(/\s+/).filter(Boolean);

  if (words[0] === q) return 300;
  if (words.includes(q)) return 200;
  if (nome.includes(q)) return 100;

  return 0;
}

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

export default function MembrosPage() {
  const toast = useToast();

  function toastErro(e: any, fallback: string) {
    const msg =
      typeof e?.message === "string" && e.message.trim()
        ? e.message
        : typeof e === "string" && e.trim()
        ? e
        : fallback;
    toast.error(msg.startsWith("Erro:") ? msg : `Erro: ${msg}`);
  }

  const [loading, setLoading] = useState(true);
  const [loadingRole, setLoadingRole] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [membros, setMembros] = useState<Membro[]>([]);

  const [busca, setBusca] = useState("");
  const [filtroCargo, setFiltroCargo] = useState<string>("");
  const [filtroStatus, setFiltroStatus] = useState<"" | Status>("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalKind, setModalKind] = useState<"inativar" | "ativar">("inativar");
  const [modalMembroId, setModalMembroId] = useState<string | null>(null);
  const [modalNome, setModalNome] = useState<string>("");

  const [rowLoading, setRowLoading] = useState<Record<string, boolean>>({});

  const actionLoading = modalMembroId ? !!rowLoading[modalMembroId] : false;
  const paths = useMemo(() => getPaths(userRole ?? undefined), [userRole]);
  const demoMode = useMemo(() => isDemo(userRole ?? undefined), [userRole]);
  const allowEdit = useMemo(
    () => canEditMembers(userRole ?? undefined) && !isDemo(userRole ?? undefined),
    [userRole]
  );

  useEffect(() => {
    let active = true;

    async function loadRole() {
      try {
        setLoadingRole(true);
        const role = await getUserRoleFromToken();
        if (active) setUserRole(role);
      } catch (error) {
        console.error(error);
        if (active) setUserRole(null);
      } finally {
        if (active) setLoadingRole(false);
      }
    }

    void loadRole();

    return () => {
      active = false;
    };
  }, []);

  async function carregar(opts?: { silent?: boolean }) {
    if (!userRole) return;

    try {
      setLoading(true);

      const q = query(
        collection(db, paths.membros),
        orderBy("nomeCompleto", "asc")
      );
      const snap = await getDocs(q);

      const list: Membro[] = snap.docs.map((d) => {
        const data = d.data() as any;

        return {
          id: d.id,
          nomeCompleto: data.nomeCompleto ?? data.nome,
          nome: data.nome,
          telefoneCelular: data.telefoneCelular ?? data.telefone,
          telefone: data.telefone,
          cargoEclesiastico: data.cargoEclesiastico ?? "",
          status: statusSeguro(data.status),
          dataNascimento: data.dataNascimento ?? data.nascimento ?? undefined,
          cpf: data.cpf ?? null,
          numeroRol: data.numeroRol ?? data.numero ?? data.nro ?? undefined,
          ipdaPastor: data.ipdaPastor ?? data.ipda_e_pastor ?? undefined,
          telCarta: data.telCarta ?? data.tel_carta ?? undefined,
        };
      });

      setMembros(list);
      if (!opts?.silent) toast.success("Lista atualizada.");
    } catch (e: any) {
      console.error(e);
      toastErro(e, "Não foi possível carregar a lista de membros.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!loadingRole && userRole) {
      void carregar({ silent: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingRole, userRole, paths.membros]);

  const membrosComIdade = useMemo(() => {
    return membros.map((m) => {
      const idade = calcularIdade(m.dataNascimento ?? null);
      return {
        ...m,
        _idade: idade as number | null,
        _idadeTxt: formatarIdade(idade),
      };
    });
  }, [membros]);

  const membrosFiltrados = useMemo(() => {
    const raw = busca.trim();

    const baseFiltrada = membrosComIdade.filter((m: any) => {
      const cargo = (m.cargoEclesiastico || "").trim();
      const status = statusSeguro(m.status);
      const okCargo = !filtroCargo || cargo === filtroCargo;
      const okStatus = !filtroStatus || status === filtroStatus;
      return okCargo && okStatus;
    });

    if (!raw) {
      return baseFiltrada;
    }

    const digits = onlyDigits(raw);
    const isOnlyDigits = digits.length === raw.length;
    const termText = normalizeText(raw);

    if (isOnlyDigits) {
      return baseFiltrada.filter((m: any) => {
        const telDigits = onlyDigits(m.telefoneCelular || m.telefone || "");
        const nrDigits = onlyDigits(String(m.numeroRol ?? ""));
        const telCartaDigits = onlyDigits(m.telCarta ?? "");
        const cpfDigits = onlyDigits(m.cpf ?? "");
        const idade: number | null = m._idade ?? null;

        if (digits.length === 11) {
          return cpfDigits.startsWith(digits);
        }

        if (digits.length >= 1 && digits.length <= 3) {
          if (idade == null) return false;

          const n = Number(digits);
          if (!Number.isFinite(n) || n <= 0) return false;

          return idade === n;
        }

        return (
          telDigits.includes(digits) ||
          nrDigits.includes(digits) ||
          telCartaDigits.includes(digits) ||
          cpfDigits.includes(digits)
        );
      });
    }

    const filtrados = baseFiltrada.filter((m: any) => {
      const nomeNorm = normalizeText(m.nomeCompleto || m.nome || "");
      const ipda = normalizeText(m.ipdaPastor ?? "");
      const nrTxt = normalizeText(String(m.numeroRol ?? ""));
      const tcTxt = normalizeText(m.telCarta ?? "");

      return (
        nomeNorm.includes(termText) ||
        ipda.includes(termText) ||
        nrTxt.includes(termText) ||
        tcTxt.includes(termText)
      );
    });

    filtrados.sort((a: any, b: any) => {
      const nomeAOriginal = a.nomeCompleto || a.nome || "";
      const nomeBOriginal = b.nomeCompleto || b.nome || "";

      const sA = scoreNomeMatch(nomeAOriginal, raw);
      const sB = scoreNomeMatch(nomeBOriginal, raw);

      if (sA !== sB) return sB - sA;

      return normalizeText(nomeAOriginal).localeCompare(
        normalizeText(nomeBOriginal),
        "pt-BR"
      );
    });

    return filtrados;
  }, [membrosComIdade, busca, filtroCargo, filtroStatus]);

  const contagens = useMemo(() => {
    let ativos = 0;
    let inativos = 0;
    let semStatus = 0;

    for (const m of membros) {
      const raw = (m as any)?.status;
      if (raw === "Ativo") ativos++;
      else if (raw === "Inativo") inativos++;
      else semStatus++;
    }

    const total = ativos + inativos;

    if (semStatus > 0) {
      console.warn(
        `[membros/page] Existem ${semStatus} membro(s) sem status válido (nem "Ativo" nem "Inativo").`
      );
    }

    return { total, ativos, inativos, semStatus };
  }, [membros]);

  function openModal(kind: "inativar" | "ativar", m: Membro) {
    if (!allowEdit) {
      toast.error(
        demoMode
          ? "Modo demonstração: alterações de membros estão desabilitadas para esta conta."
          : "Você não tem permissão para alterar membros."
      );
      return;
    }

    setModalKind(kind);
    setModalMembroId(m.id);
    setModalNome(m.nomeCompleto || m.nome || "(Sem nome)");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setModalMembroId(null);
    setModalNome("");
  }

  async function setStatus(novo: Status) {
    if (!modalMembroId) return;

    if (!allowEdit) {
      toast.error(
        demoMode
          ? "Modo demonstração: alterações de membros estão desabilitadas para esta conta."
          : "Você não tem permissão para alterar membros."
      );
      return;
    }

    const id = modalMembroId;

    try {
      setRowLoading((p) => ({ ...p, [id]: true }));

      await updateDoc(doc(db, paths.membros, id), {
        status: novo,
        updatedAt: isoNow(),
      } as any);

      setMembros((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status: novo } : m))
      );

      toast.success(
        novo === "Inativo" ? "Membro inativado." : "Membro reativado."
      );
      closeModal();
    } catch (e: any) {
      console.error(e);
      toastErro(e, "Não foi possível atualizar o status.");
    } finally {
      setRowLoading((p) => ({ ...p, [id]: false }));
    }
  }

  const modalTitle = modalKind === "ativar" ? "Ativar membro" : "Inativar membro";

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-blue-700">
            Membros
          </h1>
          <p className="text-gray-600 mt-1">
            {loading || loadingRole ? (
              "Carregando lista…"
            ) : (
              <>
                {membrosFiltrados.length} resultado(s) •{" "}
                <span className="font-semibold">{contagens.ativos}</span> ativo(s) •{" "}
                <span className="font-semibold">{contagens.inativos}</span>{" "}
                inativo(s) •{" "}
                <span className="font-semibold">{contagens.total}</span> total
              </>
            )}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <Link
            href="/membros/novo"
            className={`px-4 py-2 rounded-xl font-semibold ${
              allowEdit
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "bg-gray-200 text-gray-500 pointer-events-none"
            }`}
            aria-disabled={!allowEdit}
            title={
              !allowEdit
                ? demoMode
                  ? "Modo demonstração: cadastro desabilitado"
                  : "Você não tem permissão para cadastrar membros"
                : ""
            }
          >
            + Cadastrar membro
          </Link>

          {demoMode ? (
            <p className="text-xs text-amber-700">
              Modo demonstração: cadastro e edição desabilitados.
            </p>
          ) : null}
        </div>
      </div>

      {!loadingRole && !demoMode && !allowEdit ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          Você não tem permissão para alterar membros.
        </div>
      ) : null}

      <div className="bg-white rounded-3xl shadow p-4 md:p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Pesquisar
            </label>
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="input"
              placeholder="Nome, CPF (11 dígitos), idade (ex.: 60), telefone…"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Cargo
            </label>
            <select
              value={filtroCargo}
              onChange={(e) => setFiltroCargo(e.target.value)}
              className="input"
            >
              <option value="">Todos</option>
              {CARGOS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value as any)}
              className="input"
            >
              <option value="">Todos</option>
              <option value="Ativo">Ativo</option>
              <option value="Inativo">Inativo</option>
            </select>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setBusca("");
              setFiltroCargo("");
              setFiltroStatus("");
              toast.info("Filtros limpos.");
            }}
            className="px-3 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold"
          >
            Limpar
          </button>

          <button
            type="button"
            onClick={() => void carregar()}
            className="px-3 py-2 rounded-xl bg-white border hover:bg-gray-50 text-sm font-semibold"
          >
            Atualizar lista
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {!loading && !loadingRole && membrosFiltrados.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-5">
            Nenhum membro encontrado com os filtros atuais.
          </div>
        ) : null}

        {membrosFiltrados.map((m: any) => {
          const s = statusSeguro(m.status);
          const isRowBusy = !!rowLoading[m.id];

          return (
            <div
              key={m.id}
              className="bg-white rounded-2xl shadow p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
            >
              <div>
                <p className="text-lg font-bold text-gray-900">
                  {m.nomeCompleto || "(Sem nome)"}
                </p>

                <p className="text-sm text-gray-600">
                  {m.cargoEclesiastico ? `Cargo: ${m.cargoEclesiastico}` : ""}
                  {m.cargoEclesiastico ? " • " : ""}
                  Status:{" "}
                  <span
                    className={
                      s === "Ativo"
                        ? "font-semibold text-green-700"
                        : "font-semibold text-gray-700"
                    }
                  >
                    {s}
                  </span>
                </p>

                <p className="text-sm text-gray-600">
                  Idade:{" "}
                  <span className="font-semibold text-gray-900">
                    {m._idadeTxt || "—"}
                  </span>
                </p>

                {m.telefoneCelular ? (
                  <p className="text-sm text-gray-600">
                    Telefone: {m.telefoneCelular}
                  </p>
                ) : null}

                {m.numeroRol || m.ipdaPastor || m.telCarta ? (
                  <p className="text-sm text-gray-600 mt-1">
                    {m.numeroRol ? `Nº do Rol: ${m.numeroRol}` : ""}
                    {m.numeroRol && (m.ipdaPastor || m.telCarta) ? " • " : ""}
                    {m.ipdaPastor ? `IPDA / Pastor: ${m.ipdaPastor}` : ""}
                    {m.ipdaPastor && m.telCarta ? " • " : ""}
                    {m.telCarta ? `Tel./carta: ${m.telCarta}` : ""}
                  </p>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/membros/${m.id}`}
                  className="px-4 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
                >
                  Ver
                </Link>

                <Link
                  href={allowEdit ? `/membros/${m.id}/editar` : "#"}
                  aria-disabled={!allowEdit}
                  title={
                    !allowEdit
                      ? demoMode
                        ? "Modo demonstração: edição desabilitada"
                        : "Você não tem permissão para editar membros"
                      : ""
                  }
                  className={`px-4 py-2 rounded-xl font-semibold border ${
                    allowEdit
                      ? "bg-white hover:bg-gray-50"
                      : "bg-gray-100 text-gray-400 pointer-events-none"
                  }`}
                >
                  Editar
                </Link>

                {s === "Ativo" ? (
                  <button
                    type="button"
                    disabled={isRowBusy || !allowEdit}
                    onClick={() => openModal("inativar", m)}
                    title={
                      !allowEdit
                        ? demoMode
                          ? "Modo demonstração: alteração desabilitada"
                          : "Você não tem permissão para alterar membros"
                        : ""
                    }
                    className="px-4 py-2 rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isRowBusy ? "Aguarde…" : "Inativar"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isRowBusy || !allowEdit}
                    onClick={() => openModal("ativar", m)}
                    title={
                      !allowEdit
                        ? demoMode
                          ? "Modo demonstração: alteração desabilitada"
                          : "Você não tem permissão para alterar membros"
                        : ""
                    }
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isRowBusy ? "Aguarde…" : "Ativar"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={modalOpen} title={modalTitle} onClose={closeModal}>
        {modalKind === "inativar" ? (
          <div className="space-y-4">
            <p className="text-gray-700">
              Tem certeza que deseja <b>inativar</b> o membro <b>{modalNome}</b>?
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
                onClick={() => void setStatus("Inativo")}
                className="px-4 py-2 rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-700 disabled:opacity-60"
                disabled={actionLoading || !allowEdit}
              >
                {actionLoading ? "Inativando..." : "Confirmar"}
              </button>
            </div>
          </div>
        ) : null}

        {modalKind === "ativar" ? (
          <div className="space-y-4">
            <p className="text-gray-700">
              Deseja <b>ativar</b> o membro <b>{modalNome}</b> novamente?
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
                onClick={() => void setStatus("Ativo")}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60"
                disabled={actionLoading || !allowEdit}
              >
                {actionLoading ? "Ativando..." : "Confirmar"}
              </button>
            </div>
          </div>
        ) : null}
      </Modal>

      <style jsx>{`
        .input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid rgb(229 231 235);
          border-radius: 0.75rem;
          background: white;
          outline: none;
        }
      `}</style>
    </div>
  );
}
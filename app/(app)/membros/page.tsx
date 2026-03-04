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

type Status = "Ativo" | "Inativo";

type Membro = {
  id: string;

  // básicos
  nomeCompleto?: string;
  nome?: string; // compat antigos
  telefoneCelular?: string;
  telefone?: string; // compat antigos
  cargoEclesiastico?: string;
  status?: Status;

  // ✅ para idade (não salva; apenas exibe)
  dataNascimento?: string; // yyyy-mm-dd (ou pode vir em formatos antigos)

  // ✅ cpf (para busca)
  cpf?: string | null;

  // novos campos
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

/* ============================
   IDADE (runtime, não salva)
============================ */
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

  // dd/mm/aaaa
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const iso = parseBRToISO(s);
    if (!iso) return null;
    const d = new Date(`${iso}T00:00:00`);
    return isValidDate(d) ? d : null;
  }

  // yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = new Date(`${s}T00:00:00`);
    return isValidDate(d) ? d : null;
  }

  // fallback
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

/* ============================
   SCORE de busca por nome (para ordenar)
============================ */
function scoreNomeMatch(nomeOriginal: string, termo: string) {
  const nome = normalizeText(nomeOriginal);
  const q = normalizeText(termo);

  if (!q) return 0;

  const words = nome.split(/\s+/).filter(Boolean);

  // prioridade:
  // 300 -> começa com "jose"
  // 200 -> tem palavra "jose" em qualquer posição
  // 100 -> contém "jose" em substring
  if (words[0] === q) return 300;
  if (words.includes(q)) return 200;
  if (nome.includes(q)) return 100;

  return 0;
}

/* ============================
   MODAL (mesmo padrão do [id]/page.tsx)
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
  const [membros, setMembros] = useState<Membro[]>([]);

  // filtros
  const [busca, setBusca] = useState("");
  const [filtroCargo, setFiltroCargo] = useState<string>("");
  const [filtroStatus, setFiltroStatus] = useState<"" | Status>("");

  // modal (toggle)
  const [modalOpen, setModalOpen] = useState(false);
  const [modalKind, setModalKind] = useState<"inativar" | "ativar">("inativar");
  const [modalMembroId, setModalMembroId] = useState<string | null>(null);
  const [modalNome, setModalNome] = useState<string>("");

  // loading por linha + loading do modal
  const [rowLoading, setRowLoading] = useState<Record<string, boolean>>({});
  const actionLoading = modalMembroId ? !!rowLoading[modalMembroId] : false;

  async function carregar(opts?: { silent?: boolean }) {
    try {
      setLoading(true);

      const q = query(collection(db, "membros"), orderBy("nomeCompleto", "asc"));
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

          // ✅ pega dataNascimento para idade
          dataNascimento: data.dataNascimento ?? data.nascimento ?? undefined,

          // ✅ cpf (pode estar com máscara)
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
    carregar({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ calcula idade uma vez por membro (memo)
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

  // ✅ Busca “inteligente” + ordenação por relevância quando for texto (nome)
  const membrosFiltrados = useMemo(() => {
    const raw = busca.trim();

    // sempre aplica cargo/status
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

    // normalizações úteis
    const termText = normalizeText(raw);

    // 1) Se digitou SÓ números: mantém sua lógica atual
    if (isOnlyDigits) {
      return baseFiltrada.filter((m: any) => {
        const telDigits = onlyDigits(m.telefoneCelular || m.telefone || "");
        const nrDigits = onlyDigits(String(m.numeroRol ?? ""));
        const telCartaDigits = onlyDigits(m.telCarta ?? "");
        const cpfDigits = onlyDigits(m.cpf ?? "");
        const idade: number | null = m._idade ?? null;

        // CPF (11 dígitos) -> começa com (permite buscar parcial)
        if (digits.length === 11) {
          return cpfDigits.startsWith(digits);
        }

        // IDADE (1–3 dígitos) -> exato
        if (digits.length >= 1 && digits.length <= 3) {
          if (idade == null) return false;

          const n = Number(digits);
          if (!Number.isFinite(n) || n <= 0) return false;

          return idade === n;
        }

        // números longos -> busca por dígitos
        return (
          telDigits.includes(digits) ||
          nrDigits.includes(digits) ||
          telCartaDigits.includes(digits) ||
          cpfDigits.includes(digits)
        );
      });
    }

    // 2) Texto: filtra por nome e campos textuais
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

    // 3) Texto: ordena por relevância (nome começa com termo, etc.)
    filtrados.sort((a: any, b: any) => {
      const nomeAOriginal = a.nomeCompleto || a.nome || "";
      const nomeBOriginal = b.nomeCompleto || b.nome || "";

      const sA = scoreNomeMatch(nomeAOriginal, raw);
      const sB = scoreNomeMatch(nomeBOriginal, raw);

      if (sA !== sB) return sB - sA;

      // desempate: A→Z (sem acento)
      return normalizeText(nomeAOriginal).localeCompare(
        normalizeText(nomeBOriginal),
        "pt-BR"
      );
    });

    return filtrados;
  }, [membrosComIdade, busca, filtroCargo, filtroStatus]);

  // ✅ Contagens consistentes com o Dashboard: total = ativos + inativos
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

    const id = modalMembroId;

    try {
      setRowLoading((p) => ({ ...p, [id]: true }));

      await updateDoc(doc(db, "membros", id), {
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
            {loading ? (
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

        <Link
          href="/membros/novo"
          className="bg-blue-600 text-white px-4 py-2 rounded-xl font-semibold hover:bg-blue-700"
        >
          + Cadastrar membro
        </Link>
      </div>

      {/* filtros */}
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
            onClick={() => carregar()}
            className="px-3 py-2 rounded-xl bg-white border hover:bg-gray-50 text-sm font-semibold"
          >
            Atualizar lista
          </button>
        </div>
      </div>

      {/* lista */}
      <div className="space-y-3">
        {!loading && membrosFiltrados.length === 0 ? (
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

                {/* ✅ Idade */}
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
                  href={`/membros/${m.id}/editar`}
                  className="px-4 py-2 rounded-xl bg-white border font-semibold hover:bg-gray-50"
                >
                  Editar
                </Link>

                {s === "Ativo" ? (
                  <button
                    type="button"
                    disabled={isRowBusy}
                    onClick={() => openModal("inativar", m)}
                    className="px-4 py-2 rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-700 disabled:opacity-60"
                  >
                    {isRowBusy ? "Aguarde…" : "Inativar"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isRowBusy}
                    onClick={() => openModal("ativar", m)}
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {isRowBusy ? "Aguarde…" : "Ativar"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL */}
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
                onClick={() => setStatus("Ativo")}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60"
                disabled={actionLoading}
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
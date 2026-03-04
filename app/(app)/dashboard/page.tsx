"use client";

import CartaPregacaoCard from "@/app/components/CartaPregacaoCard";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import { PUBLIC_ENV } from "@/src/lib/publicEnv";

import { doc, getDoc } from "firebase/firestore";
import { db } from "@/src/lib/firebase";

import {
  getStatsMembros,
  getStatsCeiaMes,
  getStatsCeiaAno,
  listarMembrosPorStatus,
  listarPresentesCeiaMes,
  listarParticipantesCeiaAno,
  getSerieCeiaUltimosMeses,
  getStatsCeiaFaltantesRecorrentes,
  listarFaltantesRecorrentesCeia,
  type SimpleMembroListItem,
  type CeiaFaltanteRecorrenteListItem,
} from "@/src/lib/dashboard";

import {
  normalizeText,
  onlyDigits,
  scoreNomePorRelevancia,
} from "@/src/lib/membroSearch";

import { calcularIdade } from "@/src/lib/idade";

// ✅ Recharts
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

function Card({
  title,
  description,
  onClick,
}: {
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="bg-white/90 backdrop-blur border border-white/40 p-6 rounded-2xl shadow text-left hover:shadow-md transition-shadow focus:outline-none focus:ring-2 focus:ring-blue-400"
      type="button"
    >
      <h2 className="font-semibold text-lg text-gray-900">{title}</h2>
      <p className="text-gray-600 text-sm mt-2">{description}</p>
    </button>
  );
}

function StatCard({
  label,
  value,
  sub,
  onClick,
  disabled,
}: {
  label: string;
  value: ReactNode;
  sub: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "bg-white/90 backdrop-blur border border-white/40 p-5 rounded-2xl shadow text-left",
        "hover:shadow-md transition-shadow",
        "focus:outline-none focus:ring-2 focus:ring-blue-400",
        disabled ? "opacity-70 cursor-not-allowed hover:shadow" : "",
      ].join(" ")}
    >
      <h3 className="text-gray-600 text-sm">{label}</h3>
      <div className="text-3xl font-bold mt-1 text-gray-900">{value}</div>
      <div className="text-sm text-gray-700 mt-1">{sub}</div>
    </button>
  );
}

type DashboardStats = {
  membros: { total: number; ativos: number; inativos: number };
  ceiaMes: { presentes: number };
  ceiaAno: { totalParticipacoes: number };
  ceiaRecorrentes: { totalFaltantesRecorrentes: number };
  ano: number;
  mes: number;
};

function agoraAnoMes() {
  const d = new Date();
  return { ano: d.getFullYear(), mes: d.getMonth() + 1 };
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function formatAnoMesId(ano: number, mes: number) {
  return `${ano}-${pad2(mes)}`;
}

function parseAnoMesId(id: string) {
  const [yy, mm] = id.split("-");
  const ano = Number(yy);
  const mes = Number(mm);
  if (!ano || !mes) return null;
  return { ano, mes };
}

// ✅ UI-only: "YYYY-MM" -> "MM/YYYY"
function formatMesKeyToPtBRShort(mesKey: string): string {
  const mm = String(mesKey ?? "")
    .trim()
    .match(/^(\d{4})-(\d{2})$/);
  if (!mm) return "";
  return `${mm[2]}/${mm[1]}`;
}

type ModalKind = "membros" | "ceiaMes" | "ceiaAno" | "ceiaRecorrentes";
type MembrosTab = "Ativo" | "Inativo";

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
        <div className="w-full max-w-2xl rounded-2xl bg-white shadow-xl overflow-hidden animate-[popIn_180ms_ease-out]">
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

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes popIn {
          from { opacity: 0; transform: translateY(6px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

type ListItemBase = {
  id: string;
  nome: string;
  dataNascimento?: string | null;
  cpf?: string | null;
};

function ListBox<T extends ListItemBase>(props: {
  loading: boolean;
  error: string | null;
  items: T[];
  search: string;
  onSearch: (v: string) => void;
  emptyLabel: string;
  onOpenMember: (id: string) => void;
  onEditMember: (id: string) => void;
  badgeLabel?: string;
  getBadgeLabel?: (item: T) => string | null | undefined;
  badgeVariant?: "blue" | "gray" | "emerald" | "amber";
  showActions?: boolean;
  showAge?: boolean;
  getMetaText?: (item: T) => ReactNode;
}) {
  const {
    loading,
    error,
    items,
    search,
    onSearch,
    emptyLabel,
    onOpenMember,
    onEditMember,
    badgeLabel,
    getBadgeLabel,
    badgeVariant,
    showActions,
    showAge,
    getMetaText,
  } = props;

  const filtered = useMemo(() => {
    const raw = search.trim();
    if (!raw) return items;

    const digits = onlyDigits(raw);
    const isOnlyDigits = digits.length === raw.length;

    const termText = normalizeText(raw);

    // 1) Só números: CPF/idade
    if (isOnlyDigits) {
      return items.filter((x) => {
        const cpfDigits = onlyDigits((x as any).cpf ?? "");
        const idade = showAge ? calcularIdade(x.dataNascimento ?? null) : null;

        // CPF (11 dígitos)
        if (digits.length === 11) {
          return cpfDigits.startsWith(digits);
        }

        // Idade (1–3 dígitos) -> exato
        if (digits.length >= 1 && digits.length <= 3) {
          if (idade == null) return false;

          const n = Number(digits);
          if (!Number.isFinite(n) || n <= 0) return false;

          return idade === n;
        }

        // Outros números: tenta CPF contém
        return cpfDigits.includes(digits);
      });
    }

    // 2) Texto: filtra + ordena por relevância
    const base = items.filter((x) => {
      const nome = normalizeText(x.nome || "");
      return nome.includes(termText);
    });

    return [...base].sort((a, b) => {
      const sa = scoreNomePorRelevancia(a.nome, raw);
      const sb = scoreNomePorRelevancia(b.nome, raw);

      if (sa !== sb) return sa - sb;

      return String(a.nome || "").localeCompare(String(b.nome || ""), "pt-BR", {
        sensitivity: "base",
      });
    });
  }, [items, search, showAge]);

  function initials(nome: string) {
    const parts = nome
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    const a = parts[0]?.[0] ?? "";
    const b = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? "" : "";
    return (a + b).toUpperCase() || "•";
  }

  function badgeClass(v: NonNullable<typeof badgeVariant>) {
    switch (v) {
      case "emerald":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "amber":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "blue":
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200";
    }
  }

  const badgeStyle = `inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${badgeClass(
    badgeVariant ?? "gray"
  )}`;

  return (
    <div className="space-y-3">
      <input
        value={search}
        onChange={(e) => onSearch(e.target.value)}
        placeholder="Buscar por nome, CPF (11 dígitos) ou idade (ex.: 60)…"
        className="w-full rounded-xl border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
      />

      {error ? (
        <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-2xl border overflow-hidden">
        <div className="max-h-[52vh] overflow-auto">
          {loading ? (
            <div className="p-4 text-gray-600">Carregando…</div>
          ) : filtered.length === 0 ? (
            <div className="p-4 text-gray-600">{emptyLabel}</div>
          ) : (
            <ul className="divide-y">
              {filtered.map((m) => {
                const idade = showAge
                  ? calcularIdade(m.dataNascimento ?? null)
                  : null;

                const dyn = getBadgeLabel ? getBadgeLabel(m) : null;
                const finalBadge = (dyn ?? badgeLabel ?? "").trim();

                return (
                  <li
                    key={m.id}
                    className="p-3 flex items-center justify-between gap-3"
                  >
                    <button
                      type="button"
                      onClick={() => onOpenMember(m.id)}
                      className="flex items-center gap-3 text-left group min-w-0"
                      title="Abrir ficha do membro"
                    >
                      <div className="w-10 h-10 rounded-2xl bg-gray-100 border flex items-center justify-center font-bold text-gray-700 shrink-0">
                        {initials(m.nome)}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900 group-hover:underline truncate">
                            {m.nome}
                          </span>

                          {finalBadge ? (
                            <span className={badgeStyle}>{finalBadge}</span>
                          ) : null}
                        </div>

                        {showAge ? (
                          <div className="text-xs text-gray-600">
                            Idade:{" "}
                            {idade == null ? (
                              <span className="text-gray-400">—</span>
                            ) : (
                              <span className="font-semibold text-gray-800">
                                {idade} anos
                              </span>
                            )}
                          </div>
                        ) : null}

                        {getMetaText ? (
                          <div className="text-xs text-gray-600 mt-0.5">
                            {getMetaText(m)}
                          </div>
                        ) : null}

                        <div className="text-xs text-gray-500">ID: {m.id}</div>
                      </div>
                    </button>

                    {showActions !== false ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => onOpenMember(m.id)}
                          className="px-3 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
                        >
                          Ver
                        </button>

                        <button
                          type="button"
                          onClick={() => onEditMember(m.id)}
                          className="px-3 py-2 rounded-xl bg-white border text-sm font-semibold hover:bg-gray-50"
                        >
                          Editar
                        </button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="text-xs text-gray-600">
        Mostrando {filtered.length} de {items.length}.
      </div>
    </div>
  );
}

/* ============================
   GRÁFICOS — CARDS
============================ */

function MiniBar({
  label,
  hint,
  value,
  max,
  tone = "blue",
}: {
  label: string;
  hint: string;
  value: number;
  max: number;
  tone?: "blue" | "emerald" | "amber" | "gray";
}) {
  const pct = Math.round(((value || 0) / (max || 1)) * 100);

  const bar =
    tone === "emerald"
      ? "bg-emerald-600/80"
      : tone === "amber"
      ? "bg-amber-600/80"
      : tone === "gray"
      ? "bg-gray-700/70"
      : "bg-blue-600/80";

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-gray-800">{label}</div>
          <div className="text-xs text-gray-500">{hint}</div>
        </div>
        <div className="text-sm font-bold text-gray-900">{value}</div>
      </div>

      <div className="mt-2 h-10 rounded-xl bg-gray-100 overflow-hidden">
        <div
          className={`h-full ${bar} rounded-xl transition-[width] duration-500`}
          style={{ width: `${pct}%` }}
          aria-label={`${label}: ${value}`}
          title={`${label}: ${value}`}
        />
      </div>
    </div>
  );
}

function ChartMembros({
  loading,
  stats,
  onClick,
}: {
  loading: boolean;
  stats: DashboardStats | null;
  onClick?: () => void;
}) {
  const ativos = stats?.membros.ativos ?? 0;
  const inativos = stats?.membros.inativos ?? 0;
  const max = Math.max(ativos, inativos, 1);

  return (
    <div
      onClick={onClick}
      className="bg-white/90 backdrop-blur border border-white/40 p-5 rounded-2xl shadow cursor-pointer hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition"
      title="Clique para ver lista de membros"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-gray-900 font-semibold">Membros</h3>
          <p className="text-sm text-gray-600 mt-1">Distribuição por status.</p>
        </div>
        <div className="text-xs text-gray-600">
          {stats ? `Total: ${stats.membros.total}` : ""}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {loading || !stats ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-28 bg-gray-100 rounded animate-pulse" />
                <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <MiniBar
              label="Ativos"
              hint="Membros em atividade"
              value={ativos}
              max={max}
              tone="emerald"
            />
            <MiniBar
              label="Inativos"
              hint="Membros desativados"
              value={inativos}
              max={max}
              tone="amber"
            />
          </>
        )}
      </div>
    </div>
  );
}

function ChartMembrosPie({
  loading,
  stats,
  onClick,
}: {
  loading: boolean;
  stats: DashboardStats | null;
  onClick?: () => void;
}) {
  const ativos = stats?.membros.ativos ?? 0;
  const inativos = stats?.membros.inativos ?? 0;

  const data = [
    { name: "Ativos", value: ativos },
    { name: "Inativos", value: inativos },
  ];

  const COLORS = ["#10b981", "#f59e0b"];

  return (
    <div
      onClick={onClick}
      className="bg-white/90 backdrop-blur border border-white/40 p-5 rounded-2xl shadow cursor-pointer hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition"
      title="Clique para ver lista de membros"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-gray-900 font-semibold">Membros (Pizza)</h3>
          <p className="text-sm text-gray-600 mt-1">Ativos vs Inativos.</p>
        </div>
        <div className="text-xs text-gray-600">
          {stats ? `Total: ${stats.membros.total}` : ""}
        </div>
      </div>

      <div className="mt-4 h-[220px]">
        {loading || !stats ? (
          <div className="h-full rounded-xl bg-gray-100 animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={45}
                paddingAngle={2}
              >
                {data.map((_, index) => (
                  <Cell key={index} fill={COLORS[index]} />
                ))}
              </Pie>

              <Tooltip formatter={(v: unknown) => String(v)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {stats ? (
        <div className="mt-2 text-xs text-gray-600">
          {ativos} ativos • {inativos} inativos
        </div>
      ) : null}
    </div>
  );
}

function ChartCeia({
  loading,
  stats,
  onClick,
}: {
  loading: boolean;
  stats: DashboardStats | null;
  onClick?: () => void;
}) {
  const mes = stats?.ceiaMes.presentes ?? 0;
  const ano = stats?.ceiaAno.totalParticipacoes ?? 0;
  const max = Math.max(mes, ano, 1);

  const mm = stats ? String(stats.mes).padStart(2, "0") : "";
  const yy = stats ? String(stats.ano) : "";

  return (
    <div
      onClick={onClick}
      className="bg-white/90 backdrop-blur border border-white/40 p-5 rounded-2xl shadow cursor-pointer hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition"
      title="Clique para ver detalhes da Ceia"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-gray-900 font-semibold">Santa Ceia</h3>
          <p className="text-sm text-gray-600 mt-1">
            Visão do mês e acumulado do ano.
          </p>
        </div>
        <div className="text-xs text-gray-600">{stats ? `${mm}/${yy}` : ""}</div>
      </div>

      <div className="mt-4 space-y-3">
        {loading || !stats ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-3 w-28 bg-gray-100 rounded animate-pulse" />
                <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <MiniBar
              label="Presentes (mês)"
              hint={`Marcados em ${mm}/${yy}`}
              value={mes}
              max={max}
              tone="blue"
            />
            <MiniBar
              label="Participações (ano)"
              hint={`Total em ${yy}`}
              value={ano}
              max={max}
              tone="gray"
            />
          </>
        )}
      </div>
    </div>
  );
}

function ChartCeiaLine({
  loading,
  error,
  data,
  onOpenMonth,
}: {
  loading: boolean;
  error: string | null;
  data: { id: string; label: string; presentes: number }[];
  onOpenMonth: (ano: number, mes: number) => void;
}) {
  return (
    <div
      className="bg-white/90 backdrop-blur border border-white/40 p-5 rounded-2xl shadow cursor-pointer hover:shadow-md hover:scale-[1.01] active:scale-[0.99] transition"
      title="Clique em um ponto para abrir a Ceia do mês"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-gray-900 font-semibold">Ceia (12 meses)</h3>
          <p className="text-sm text-gray-600 mt-1">
            Presentes nos últimos 12 meses.
          </p>
        </div>
        <div className="text-xs text-gray-600">
          {data.length ? "Últimos 12" : ""}
        </div>
      </div>

      <div className="mt-4 h-[220px]">
        {error ? (
          <div className="h-full rounded-xl bg-red-50 border border-red-200 p-4 text-red-700">
            {error}
          </div>
        ) : loading ? (
          <div className="h-full rounded-xl bg-gray-100 animate-pulse" />
        ) : data.length === 0 ? (
          <div className="h-full rounded-xl bg-gray-50 border flex items-center justify-center text-sm text-gray-600">
            Sem dados para exibir.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 8, right: 10, bottom: 0, left: -10 }}
              onClick={(e: unknown) => {
                const evt = e as { activePayload?: Array<{ payload?: unknown }> };
                const p = evt?.activePayload?.[0]?.payload as
                  | { id?: string }
                  | undefined;
                const parsed = p?.id ? parseAnoMesId(p.id) : null;
                if (parsed) onOpenMonth(parsed.ano, parsed.mes);
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="presentes"
                strokeWidth={3}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {data.length ? (
        <div className="mt-2 text-xs text-gray-600">
          Dica: clique em um ponto para abrir o mês.
        </div>
      ) : null}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const pathname = usePathname();

  const sheetsDiaCeia = PUBLIC_ENV.SHEETS_1_URL?.trim() || "";
  const sheetsRegistroAnual = PUBLIC_ENV.SHEETS_2_URL?.trim() || "";

  const { ano: anoAtual, mes: mesAtual } = useMemo(agoraAnoMes, []);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [erroStats, setErroStats] = useState<string | null>(null);

  type SerieCeiaItem = { id: string; label: string; presentes: number };
  const [serieCeia, setSerieCeia] = useState<SerieCeiaItem[]>([]);
  const [loadingSerieCeia, setLoadingSerieCeia] = useState(false);
  const [erroSerieCeia, setErroSerieCeia] = useState<string | null>(null);
  const [serieCeiaKey, setSerieCeiaKey] = useState(0);

  const [ceiaMesRef, setCeiaMesRef] = useState<{
    ano: number;
    mes: number;
    id: string;
  } | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalKind, setModalKind] = useState<ModalKind>("membros");
  const [tabMembros, setTabMembros] = useState<MembrosTab>("Ativo");

  const [loadingModal, setLoadingModal] = useState(false);
  const [erroModal, setErroModal] = useState<string | null>(null);

  const [membrosAtivos, setMembrosAtivos] = useState<SimpleMembroListItem[]>([]);
  const [membrosInativos, setMembrosInativos] = useState<SimpleMembroListItem[]>(
    []
  );
  const [presentesMes, setPresentesMes] = useState<SimpleMembroListItem[]>([]);
  const [participantesAno, setParticipantesAno] = useState<SimpleMembroListItem[]>(
    []
  );

  const [faltantesRecorrentes, setFaltantesRecorrentes] = useState<
    CeiaFaltanteRecorrenteListItem[]
  >([]);
  const [search, setSearch] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      setLoadingStats(true);
      setErroStats(null);

      setLoadingSerieCeia(true);
      setErroSerieCeia(null);

      const [membros, ceiaMes, ceiaAno, ceiaRecorrentes, serie] =
        await Promise.all([
          getStatsMembros(),
          getStatsCeiaMes(anoAtual, mesAtual),
          getStatsCeiaAno(anoAtual),
          getStatsCeiaFaltantesRecorrentes(),
          getSerieCeiaUltimosMeses(anoAtual, mesAtual),
        ]);

      setStats({
        membros,
        ceiaMes,
        ceiaAno,
        ceiaRecorrentes,
        ano: anoAtual,
        mes: mesAtual,
      });

      const safeSerie = Array.isArray(serie)
        ? serie.map((x) => ({
            id: String((x as any).id ?? ""),
            label: String((x as any).label ?? ""),
            presentes: Number((x as any).presentes ?? 0) || 0,
          }))
        : [];

      setSerieCeia(safeSerie);
      setSerieCeiaKey((k) => k + 1);
    } catch (e: unknown) {
      console.error(e);
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as any).message)
          : "";

      const finalMsg = msg ? `Erro: ${msg}` : "Erro ao carregar estatísticas.";
      setErroStats(finalMsg);
      setErroSerieCeia(
        msg ? `Erro: ${msg}` : "Erro ao carregar série (12 meses)."
      );
    } finally {
      setLoadingStats(false);
      setLoadingSerieCeia(false);
    }
  }, [anoAtual, mesAtual]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (pathname?.includes("/dashboard")) void loadDashboard();
  }, [pathname, loadDashboard]);

  useEffect(() => {
    function onFocus() {
      void loadDashboard();
    }
    function onVisibility() {
      if (document.visibilityState === "visible") void loadDashboard();
    }

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [loadDashboard]);

  function closeModal() {
    setModalOpen(false);
    setErroModal(null);
    setLoadingModal(false);
    setSearch("");
    setCeiaMesRef(null);
  }

  async function openMember(id: string) {
    if (modalKind === "membros") {
      closeModal();
      router.push(`/membros/${id}`);
      return;
    }

    try {
      setErroModal(null);

      const ref = doc(db, "membros", id);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        setErroModal(
          "Este participante não existe mais (provavelmente era cadastro de teste excluído). " +
            "Recomendação: para manter histórico real, use sempre INATIVAR, não excluir."
        );
        return;
      }

      closeModal();
      router.push(`/membros/${id}`);
    } catch (e: unknown) {
      console.error(e);
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as any).message)
          : "";
      setErroModal(msg ? `Erro: ${msg}` : "Erro ao abrir membro.");
    }
  }

  function editMember(id: string) {
    closeModal();
    router.push(`/membros/${id}/editar`);
  }

  async function openMembros(defaultTab: MembrosTab) {
    setModalKind("membros");
    setTabMembros(defaultTab);
    setModalOpen(true);
    setSearch("");
    setErroModal(null);
    setCeiaMesRef(null);

    try {
      setLoadingModal(true);

      if (defaultTab === "Ativo") {
        if (membrosAtivos.length === 0) {
          const list = await listarMembrosPorStatus("Ativo");
          setMembrosAtivos(list);
        }
      } else {
        if (membrosInativos.length === 0) {
          const list = await listarMembrosPorStatus("Inativo");
          setMembrosInativos(list);
        }
      }
    } catch (e: unknown) {
      console.error(e);
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as any).message)
          : "";
      setErroModal(msg ? `Erro: ${msg}` : "Erro ao carregar lista.");
    } finally {
      setLoadingModal(false);
    }
  }

  async function openCeiaMesFor(ano: number, mes: number) {
    setModalKind("ceiaMes");
    setModalOpen(true);
    setSearch("");
    setErroModal(null);

    const id = formatAnoMesId(ano, mes);
    setCeiaMesRef({ ano, mes, id });

    try {
      setLoadingModal(true);
      const list = await listarPresentesCeiaMes(ano, mes);
      setPresentesMes(list);
    } catch (e: unknown) {
      console.error(e);
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as any).message)
          : "";
      setErroModal(msg ? `Erro: ${msg}` : "Erro ao carregar lista.");
    } finally {
      setLoadingModal(false);
    }
  }

  async function openCeiaMes() {
    return openCeiaMesFor(anoAtual, mesAtual);
  }

  async function openCeiaAno() {
    setModalKind("ceiaAno");
    setModalOpen(true);
    setSearch("");
    setErroModal(null);
    setCeiaMesRef(null);

    try {
      setLoadingModal(true);
      if (participantesAno.length === 0) {
        const list = await listarParticipantesCeiaAno(anoAtual);
        setParticipantesAno(list);
      }
    } catch (e: unknown) {
      console.error(e);
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as any).message)
          : "";
      setErroModal(msg ? `Erro: ${msg}` : "Erro ao carregar lista.");
    } finally {
      setLoadingModal(false);
    }
  }

  async function openCeiaRecorrentes() {
    setModalKind("ceiaRecorrentes");
    setModalOpen(true);
    setSearch("");
    setErroModal(null);
    setCeiaMesRef(null);

    try {
      setLoadingModal(true);
      const list = await listarFaltantesRecorrentesCeia();
      setFaltantesRecorrentes(list);
    } catch (e: unknown) {
      console.error(e);
      const msg =
        e && typeof e === "object" && "message" in e
          ? String((e as any).message)
          : "";
      setErroModal(msg ? `Erro: ${msg}` : "Erro ao carregar lista.");
    } finally {
      setLoadingModal(false);
    }
  }

  useEffect(() => {
    if (!modalOpen) return;
    if (modalKind !== "membros") return;

    (async () => {
      try {
        setErroModal(null);
        setLoadingModal(true);

        if (tabMembros === "Ativo") {
          if (membrosAtivos.length === 0) {
            const list = await listarMembrosPorStatus("Ativo");
            setMembrosAtivos(list);
          }
        } else {
          if (membrosInativos.length === 0) {
            const list = await listarMembrosPorStatus("Inativo");
            setMembrosInativos(list);
          }
        }
      } catch (e: unknown) {
        console.error(e);
        const msg =
          e && typeof e === "object" && "message" in e
            ? String((e as any).message)
            : "";
        setErroModal(msg ? `Erro: ${msg}` : "Erro ao carregar lista.");
      } finally {
        setLoadingModal(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabMembros]);

  const modalTitle = useMemo(() => {
    if (modalKind === "membros") return "Membros";

    if (modalKind === "ceiaMes") {
      const ref =
        ceiaMesRef ??
        ({
          ano: anoAtual,
          mes: mesAtual,
          id: formatAnoMesId(anoAtual, mesAtual),
        } as const);

      return `Ceia (mês) — Presentes em ${ref.id}`;
    }

    if (modalKind === "ceiaRecorrentes") {
      return "Santa Ceia — Faltantes recorrentes (sequência consecutiva)";
    }

    return `Ceia (ano) — Participantes em ${anoAtual}`;
  }, [modalKind, anoAtual, mesAtual, ceiaMesRef]);

  const sheetsLinksOk = Boolean(sheetsDiaCeia || sheetsRegistroAnual);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8">
      <div className="rounded-3xl bg-slate-900/40 backdrop-blur-2xl border border-white/10 shadow-2xl p-6">
        <h1 className="text-3xl font-bold text-white drop-shadow-md">
          Painel da Secretaria
        </h1>

        <p className="text-white/90 mt-2 drop-shadow">
          Gestão IPDA – Caxias: acesso rápido às principais rotinas.
        </p>

        <div className="mt-6">
          {erroStats ? (
            <div className="rounded-2xl bg-red-500/15 border border-red-400/20 p-4 text-red-100">
              {erroStats}
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              label="Membros"
              value={loadingStats ? "…" : stats?.membros.total ?? "—"}
              sub={
                loadingStats || !stats
                  ? "Carregando…"
                  : `${stats.membros.ativos} ativos • ${stats.membros.inativos} inativos`
              }
              disabled={loadingStats || !stats}
              onClick={() => openMembros("Ativo")}
            />

            <StatCard
              label="Ceia (mês)"
              value={loadingStats ? "…" : stats?.ceiaMes.presentes ?? "—"}
              sub={
                stats
                  ? `Marcados em ${pad2(stats.mes)}/${stats.ano}`
                  : "Marcados no mês atual"
              }
              disabled={loadingStats || !stats}
              onClick={openCeiaMes}
            />

            <StatCard
              label="Ceia (ano)"
              value={
                loadingStats ? "…" : stats?.ceiaAno.totalParticipacoes ?? "—"
              }
              sub={stats ? `Participações em ${stats.ano}` : "Participações no ano"}
              disabled={loadingStats || !stats}
              onClick={openCeiaAno}
            />

            <StatCard
              label="Faltantes (Ceia)"
              value={
                loadingStats
                  ? "…"
                  : stats?.ceiaRecorrentes.totalFaltantesRecorrentes ?? "—"
              }
              sub={stats ? "Sequência consecutiva (não inativa)" : "Faltantes recorrentes"}
              disabled={loadingStats || !stats}
              onClick={openCeiaRecorrentes}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <ChartMembros
              loading={loadingStats}
              stats={stats}
              onClick={() => openMembros("Ativo")}
            />
            <ChartMembrosPie
              loading={loadingStats}
              stats={stats}
              onClick={() => openMembros("Ativo")}
            />
            <ChartCeia
              loading={loadingStats}
              stats={stats}
              onClick={openCeiaMes}
            />

            <div key={serieCeiaKey}>
              <ChartCeiaLine
                loading={loadingSerieCeia}
                error={erroSerieCeia}
                data={serieCeia}
                onOpenMonth={openCeiaMesFor}
              />
            </div>
          </div>
        </div>

        <CartaPregacaoCard />

        {sheetsLinksOk ? (
          <div className="flex flex-wrap gap-2 mt-4">
            {sheetsDiaCeia && (
              <a
                href={sheetsDiaCeia}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
              >
                📄 Dia da Ceia (Sheets)
              </a>
            )}

            {sheetsRegistroAnual && (
              <a
                href={sheetsRegistroAnual}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
              >
                📄 Registro Anual da Ceia (Sheets)
              </a>
            )}
          </div>
        ) : (
          <p className="text-xs text-white/70 mt-4">
            Links do Sheets não configurados. Você pode usar as planilhas internas do sistema.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card
          title="👤 Membros"
          description="Cadastrar, editar e consultar os membros."
          onClick={() => router.push("/membros")}
        />
        <Card
          title="🍞 Santa Ceia"
          description="Controle do mês e registro histórico."
          onClick={() => router.push("/santa-ceia")}
        />
        <Card
          title="📊 Relatórios"
          description="Listas e estatísticas para impressão."
          onClick={() => router.push("/relatorios")}
        />
        <Card
          title="📑 Planilhas Internas"
          description="Preencher e exportar planilhas direto no sistema."
          onClick={() => router.push("/planilhas")}
        />
      </div>

      <Modal open={modalOpen} title={modalTitle} onClose={closeModal}>
        {modalKind === "membros" && (
          <div className="flex gap-2 mb-4">
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setTabMembros("Ativo");
              }}
              className={[
                "px-4 py-2 rounded-xl border",
                tabMembros === "Ativo"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white hover:bg-gray-50",
              ].join(" ")}
            >
              Ativos
            </button>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setTabMembros("Inativo");
              }}
              className={[
                "px-4 py-2 rounded-xl border",
                tabMembros === "Inativo"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white hover:bg-gray-50",
              ].join(" ")}
            >
              Inativos
            </button>
          </div>
        )}

        {modalKind === "ceiaRecorrentes" ? (
          <ListBox<CeiaFaltanteRecorrenteListItem>
            loading={loadingModal}
            error={erroModal}
            items={faltantesRecorrentes}
            search={search}
            onSearch={setSearch}
            emptyLabel="Nenhum faltante recorrente encontrado."
            onOpenMember={(id) => void openMember(id)}
            onEditMember={editMember}
            getBadgeLabel={(m) => {
              const seq = Array.isArray(m.ceiaFaltasSeq) ? m.ceiaFaltasSeq : [];
              const last = seq.length
                ? String(seq[seq.length - 1] ?? "").trim()
                : "";
              const lastLabel = last ? formatMesKeyToPtBRShort(last) : "";
              return lastLabel ? `Recorrente • ${lastLabel}` : "Recorrente";
            }}
            badgeVariant="amber"
            showActions={true}
            showAge={true}
            getMetaText={(m) => {
              const label = String(m.ceiaFaltasSeqLabel ?? "").trim();
              const seqLen = Array.isArray(m.ceiaFaltasSeq)
                ? m.ceiaFaltasSeq.length
                : 0;
              const count = seqLen > 0 ? seqLen : m.faltasSeguidasCeia;

              return (
                <span>
                  {label ? (
                    <>
                      Sequência:{" "}
                      <span className="font-semibold text-gray-900">{label}</span>
                      {" • "}
                      <span className="text-gray-600">{count} mês(es)</span>
                    </>
                  ) : (
                    <>
                      Faltas seguidas:{" "}
                      <span className="font-semibold">{m.faltasSeguidasCeia}</span>
                    </>
                  )}

                  {m.ceiaObs ? (
                    <>
                      {" "}
                      • <span className="text-gray-500">{m.ceiaObs}</span>
                    </>
                  ) : null}
                </span>
              );
            }}
          />
        ) : (
          <ListBox<SimpleMembroListItem>
            loading={loadingModal}
            error={erroModal}
            items={
              modalKind === "membros"
                ? tabMembros === "Ativo"
                  ? membrosAtivos
                  : membrosInativos
                : modalKind === "ceiaMes"
                ? presentesMes
                : participantesAno
            }
            search={search}
            onSearch={setSearch}
            emptyLabel={
              modalKind === "membros"
                ? tabMembros === "Ativo"
                  ? "Nenhum membro ativo encontrado."
                  : "Nenhum membro inativo encontrado."
                : modalKind === "ceiaMes"
                ? "Ninguém marcado como presente neste mês."
                : "Nenhum participante encontrado neste ano."
            }
            onOpenMember={(id) => void openMember(id)}
            onEditMember={editMember}
            badgeLabel={
              modalKind === "membros"
                ? tabMembros
                : modalKind === "ceiaMes"
                ? "Presente"
                : "Participante"
            }
            badgeVariant={
              modalKind === "membros"
                ? tabMembros === "Ativo"
                  ? "emerald"
                  : "amber"
                : modalKind === "ceiaMes"
                ? "blue"
                : "gray"
            }
            showActions={modalKind === "membros"}
            showAge={true}
          />
        )}
      </Modal>
    </div>
  );
}
"use client";

import { exportExcel } from "@/src/lib/exportExcel";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import AuthGuard from "@/app/components/AuthGuard";
import { useToast } from "@/app/components/ToastProvider";

import {
  syncRegistroAnualFromSheets,
  syncControleFromSheets,
} from "@/src/lib/syncCeiaFromSheets";

import {
  marcarPresencaNoControle,
  listarControleCeia, // ✅ usa a mesma regra do ceia.ts
  listarRegistroCeia,
  registrarCeiaNoMes,
  removerRegistroCeiaNoMes,
  finalizarCeiaDoMes,
  listarRegistroCeiaAno,
  desmarcarTodosNoControle,
} from "@/src/lib/ceia";

type MembroListaItem = {
  id: string;
  nome: string;
  numeroRol?: number | null;
  congregacao?: string | null;
  pastor?: string | null;
  telCarta?: string | null;
};

function agoraAnoMes() {
  const d = new Date();
  return { ano: d.getFullYear(), mes: d.getMonth() + 1 };
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function nomeMes(m: number) {
  return [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ][m - 1];
}

function abbrMes(m: number) {
  return [
    "Jan",
    "Fev",
    "Mar",
    "Abr",
    "Mai",
    "Jun",
    "Jul",
    "Ago",
    "Set",
    "Out",
    "Nov",
    "Dez",
  ][m - 1];
}

function formatIpdaPastor(congregacao?: string | null, pastor?: string | null) {
  const c = String(congregacao ?? "").trim();
  const p = String(pastor ?? "").trim();
  if (c && p) return `${c} / ${p}`;
  return c || p || "";
}

// ✅ blindagem: garante que nunca passa lixo como id
function assertMembroId(membroId: unknown) {
  if (typeof membroId !== "string") throw new Error("membroId inválido (não é string).");
  const s = membroId.trim();
  if (!s) throw new Error("membroId inválido (vazio).");
  if (s.includes("/")) throw new Error("membroId inválido (contém '/').");
  if (s === "[object Object]" || s.includes("[object")) throw new Error("membroId inválido (objeto convertido).");
  return s;
}

export default function SantaCeiaPage() {
  const toast = useToast();

  const { ano: anoAtual, mes: mesAtual } = useMemo(agoraAnoMes, []);
  const [aba, setAba] = useState<"controle" | "registro">("controle");

  const [ano, setAno] = useState<number>(anoAtual);
  const [mes, setMes] = useState<number>(mesAtual);

  const [membros, setMembros] = useState<MembroListaItem[]>([]);
  const [controle, setControle] = useState<
    { membroId: string; nome: string; presente: boolean }[]
  >([]);
  const [registro, setRegistro] = useState<{ membroId: string; nome: string }[]>(
    []
  );

  const [loadingMembros, setLoadingMembros] = useState(true);
  const [loadingAba, setLoadingAba] = useState(true);

  const [syncingControle, setSyncingControle] = useState(false);
  const [syncingRegistro, setSyncingRegistro] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [desmarcando, setDesmarcando] = useState(false);

  const [baixandoControle, setBaixandoControle] = useState(false);
  const [baixandoRegistro, setBaixandoRegistro] = useState(false);

  // ✅ trava de ação por membro (anti “duplo clique / corrida”)
  const togglingControleRef = useRef<Set<string>>(new Set());
  const togglingRegistroRef = useRef<Set<string>>(new Set());

  function toastErro(e: any, fallback: string) {
    const msg =
      typeof e?.message === "string" && e.message.trim()
        ? e.message
        : typeof e === "string" && e.trim()
        ? e
        : fallback;
    toast.error(msg.startsWith("Erro:") ? msg : `Erro: ${msg}`);
  }

  async function runAction(opts: {
    busySetter?: (v: boolean) => void;
    fn: () => Promise<void>;
    success?: string;
    errorFallback: string;
  }) {
    try {
      opts.busySetter?.(true);
      await opts.fn();
      if (opts.success) toast.success(opts.success);
    } catch (e: any) {
      console.error(e);
      toastErro(e, opts.errorFallback);
    } finally {
      opts.busySetter?.(false);
    }
  }

  // =========================
  // Helpers do mês atual
  // =========================
  function ym() {
    return `${ano}-${pad2(mes)}`;
  }

  // =========================
  // ✅ CORRIGIDO: carrega controle usando a mesma lógica do ceia.ts
  // =========================
  async function carregarControleDoMes() {
    if (membros.length === 0) {
      setControle([]);
      return;
    }

    const itensControle = await listarControleCeia(ano, mes);
    const presentes = new Set<string>();
    itensControle.forEach((x) => {
      if (x.presente) presentes.add(x.membroId);
    });

    const itens = membros
      .map((m) => ({
        membroId: m.id,
        nome: m.nome,
        presente: presentes.has(m.id),
      }))
      .sort((a, b) =>
        a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })
      );

    setControle(itens);
  }

  // =========================
  // Carrega membros
  // =========================
  useEffect(() => {
    (async () => {
      try {
        setLoadingMembros(true);

        const snap = await getDocs(collection(db, "membros"));
        const list: MembroListaItem[] = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            nome: data.nomeCompleto ?? data.nome ?? "(sem nome)",
            numeroRol: typeof data.numeroRol === "number" ? data.numeroRol : null,
            congregacao: data.congregacao ?? null,
            pastor: data.pastor ?? null,
            telCarta: data.telCarta ?? null,
          };
        });

        list.sort((a, b) => {
          const na = a.numeroRol ?? 999999999;
          const nb = b.numeroRol ?? 999999999;
          if (na !== nb) return na - nb;
          return a.nome.localeCompare(b.nome);
        });

        setMembros(list);
      } catch (e: any) {
        console.error(e);
        toastErro(e, "Erro ao carregar membros.");
      } finally {
        setLoadingMembros(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // =========================
  // Carrega dados da aba atual
  // =========================
  async function recarregarAbaAtual() {
    setLoadingAba(true);

    try {
      if (aba === "controle") {
        if (membros.length > 0) {
          await carregarControleDoMes();
        } else {
          setControle([]);
        }
      } else {
        const itens = await listarRegistroCeia(ano, mes);
        setRegistro(itens as any);
      }
    } catch (e: any) {
      console.error(e);
      toastErro(e, "Erro ao carregar dados da Santa Ceia.");
    } finally {
      setLoadingAba(false);
    }
  }

  useEffect(() => {
    recarregarAbaAtual();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aba, ano, mes, membros.length]);

  // =========================
  // Mapas e Sets
  // =========================
  const mapaNome = useMemo(() => {
    const m = new Map<string, string>();
    membros.forEach((x) => m.set(x.id, x.nome));
    return m;
  }, [membros]);

  const controleSet = useMemo(() => {
    const s = new Set<string>();
    controle.filter((x) => x.presente).forEach((x) => s.add(x.membroId));
    return s;
  }, [controle]);

  const registroSet = useMemo(() => {
    const s = new Set<string>();
    registro.forEach((x) => s.add(x.membroId));
    return s;
  }, [registro]);

  const totalControleMes = controleSet.size;
  const totalRegistroMes = registroSet.size;

  const isBusy =
    loadingMembros ||
    loadingAba ||
    syncingControle ||
    syncingRegistro ||
    finalizando ||
    desmarcando ||
    baixandoControle ||
    baixandoRegistro;

  // =========================
  // Ações: marcar/desmarcar
  // =========================
  async function toggleControle(membroIdRaw: string) {
    if (isBusy) return;

    let membroId = "";
    try {
      membroId = assertMembroId(membroIdRaw);
    } catch (e: any) {
      toastErro(e, "membroId inválido.");
      return;
    }

    // ✅ anti corrida por membro
    if (togglingControleRef.current.has(membroId)) return;
    togglingControleRef.current.add(membroId);

    const nome = mapaNome.get(membroId) ?? "(sem nome)";
    const ja = controleSet.has(membroId);
    const prevControle = controle;

    // UI otimista
    setControle((prev) => {
      const map = new Map(prev.map((p: any) => [p.membroId, p]));
      const atual = map.get(membroId) ?? { membroId, nome, presente: false };
      map.set(membroId, { ...atual, membroId, nome, presente: !ja });
      return Array.from(map.values()).sort((a: any, b: any) =>
        a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" })
      );
    });

    try {
      await marcarPresencaNoControle(ano, mes, membroId, nome, !ja);

      // ✅ estado final vem do Firestore (fonte da verdade)
      await carregarControleDoMes();

      toast.success(
        ja ? "Presença removida do controle." : "Presença marcada no controle!"
      );
    } catch (e: any) {
      console.error(e);
      setControle(prevControle);
      toastErro(e, "Erro ao salvar no controle.");
    } finally {
      togglingControleRef.current.delete(membroId);
    }
  }

  async function toggleRegistro(membroIdRaw: string) {
    if (isBusy) return;

    let membroId = "";
    try {
      membroId = assertMembroId(membroIdRaw);
    } catch (e: any) {
      toastErro(e, "membroId inválido.");
      return;
    }

    if (togglingRegistroRef.current.has(membroId)) return;
    togglingRegistroRef.current.add(membroId);

    const nome = mapaNome.get(membroId) ?? "(sem nome)";
    const ja = registroSet.has(membroId);

    try {
      await runAction({
        fn: async () => {
          if (ja) {
            await removerRegistroCeiaNoMes(ano, mes, membroId);
          } else {
            await registrarCeiaNoMes(ano, mes, membroId, nome);
          }
          await recarregarAbaAtual();
        },
        success: ja
          ? "Removido do registro deste mês."
          : "Registrado no histórico!",
        errorFallback: "Erro ao salvar no registro.",
      });
    } finally {
      togglingRegistroRef.current.delete(membroId);
    }
  }

  // =========================
  // BAIXAR: Dia da Ceia (Controle do mês) — XLSX corporativo
  // =========================
  async function baixarControleDoMes() {
    if (isBusy || aba !== "controle") return;

    await runAction({
      busySetter: setBaixandoControle,
      fn: async () => {
        const headers = [
          "Nº do rol",
          "Nome completo",
          "IPDA / Pastor",
          "Tel. ou Carta",
          "Mês/Ano",
        ];

        const rowsData = membros
          .filter((m) => controleSet.has(m.id))
          .map((m) => [
            m.numeroRol ?? "",
            m.nome,
            formatIpdaPastor(m.congregacao, m.pastor),
            m.telCarta ?? "",
            `${pad2(mes)}/${ano}`,
          ]);

        await exportExcel({
          fileName: `DIA-DA-CEIA-${ano}-${pad2(mes)}`,
          sheetName: `Dia da Ceia ${pad2(mes)}-${ano}`,
          title: `DIA DA CEIA — ${pad2(mes)}/${ano} — IPDA CAXIAS`,
          headers,
          rows: rowsData,
        });
      },
      success: "Arquivo Excel do controle exportado.",
      errorFallback: "Erro ao exportar o controle.",
    });
  }

  // =========================
  // BAIXAR: Ceia-Registro Anual — XLSX corporativo
  // =========================
  async function baixarRegistroAnual() {
    if (isBusy || aba !== "registro") return;

    await runAction({
      busySetter: setBaixandoRegistro,
      fn: async () => {
        const regAno = await listarRegistroCeiaAno(ano);

        const yy = String(ano).slice(2);
        const headers = [
          "Nº do rol",
          "Nome completo",
          ...Array.from({ length: 12 }, (_, i) => `${abbrMes(i + 1)}/${yy}`),
          "Total",
        ];

        const mesesPorMembro = new Map<string, Set<number>>();
        for (const r of regAno as any[]) {
          const membroId = r.membroId;
          const m = Number(r.mes);
          if (!membroId || !m) continue;

          if (!mesesPorMembro.has(membroId))
            mesesPorMembro.set(membroId, new Set());
          mesesPorMembro.get(membroId)!.add(m);
        }

        const totalMes = Array(12).fill(0);
        for (const mesesSet of mesesPorMembro.values()) {
          mesesSet.forEach((m) => {
            if (m >= 1 && m <= 12) totalMes[m - 1] += 1;
          });
        }
        const totalGeral = totalMes.reduce((a, b) => a + b, 0);

        const rowsData: any[][] = [];
        rowsData.push([
          "",
          "TOTAL GERAL",
          ...totalMes.map(String),
          String(totalGeral),
        ]);

        for (const m of membros) {
          const mesesSet = mesesPorMembro.get(m.id) ?? new Set<number>();
          const colsMeses = Array.from({ length: 12 }, (_, i) =>
            mesesSet.has(i + 1) ? "P" : ""
          );
          const totalP = colsMeses.filter((x) => x === "P").length;

          rowsData.push([
            m.numeroRol ?? "",
            m.nome,
            ...colsMeses,
            totalP ? String(totalP) : "",
          ]);
        }

        await exportExcel({
          fileName: `CEIA-REGISTRO-ANUAL-${ano}`,
          sheetName: `Registro ${ano}`,
          title: `SANTA CEIA — REGISTRO ANUAL ${ano} — IPDA CAXIAS`,
          headers,
          rows: rowsData,
        });
      },
      success: "Registro anual exportado.",
      errorFallback: "Erro ao exportar o registro anual.",
    });
  }

  // =========================
  // Finalizar mês (controle -> registro)
  // =========================
  async function finalizarMes() {
    if (isBusy) return;

    const ok = confirm(
      `Finalizar a Santa Ceia de ${nomeMes(mes)} (${pad2(mes)}/${ano})?\n\nIsso vai copiar os marcados do Controle para o Registro do mês.`
    );
    if (!ok) return;

    await runAction({
      busySetter: setFinalizando,
      fn: async () => {
        const res = await finalizarCeiaDoMes(ano, mes);

        toast.success(`Finalizado! ${res.total} pessoa(s) registradas no histórico.`);

        setAba("registro");
        await recarregarAbaAtual();
      },
      errorFallback: "Erro ao finalizar o mês.",
    });
  }

  // =========================
  // Desmarcar todos (controle)
  // =========================
  async function handleDesmarcarTodosControle() {
    if (isBusy) return;

    const ok = confirm(
      `Desmarcar TODAS as presenças do Controle em ${nomeMes(mes)} (${pad2(
        mes
      )}/${ano})?\n\nIsso remove a presença de todo mundo no controle deste mês.`
    );
    if (!ok) return;

    await runAction({
      busySetter: setDesmarcando,
      fn: async () => {
        const res = await desmarcarTodosNoControle(ano, mes);
        toast.success(`Ok! ${res.total} presença(s) removida(s) no Controle.`);

        // ✅ garante que a tela reflita imediatamente
        await carregarControleDoMes();
      },
      errorFallback: "Erro ao desmarcar todos.",
    });
  }

  async function syncRegistro() {
    if (aba !== "registro" || isBusy) return;

    const ok = confirm(
      `Sincronizar o REGISTRO ANUAL do Sheets para o sistema?\n\nAno: ${ano}\nIsso pode atualizar dados no Firestore.`
    );
    if (!ok) return;

    await runAction({
      busySetter: setSyncingRegistro,
      fn: async () => {
        const r = await syncRegistroAnualFromSheets({ ano, membros });
        toast.success(
          `Sincronização concluída! gravados=${r.gravados} ignorados=${r.ignorados}`
        );
        await recarregarAbaAtual();
      },
      errorFallback: "Erro ao sincronizar Registro do Sheets.",
    });
  }

  async function syncControle() {
    if (aba !== "controle" || isBusy) return;

    const ok = confirm(
      `Sincronizar o CONTROLE do mês do Sheets para o sistema?\n\nMês/Ano: ${pad2(
        mes
      )}/${ano}\nIsso pode marcar presenças no Firestore.`
    );
    if (!ok) return;

    await runAction({
      busySetter: setSyncingControle,
      fn: async () => {
        const r = await syncControleFromSheets({ ano, mes, membros });
        toast.success(
          `Sincronização concluída! marcados=${r.marcados} ignorados=${r.ignorados}`
        );

        // ✅ não depende de recarregarAbaAtual pra refletir controle
        await carregarControleDoMes();
      },
      errorFallback: "Erro ao sincronizar Controle do Sheets.",
    });
  }

  return (
    <AuthGuard>
      <div className="w-full max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-blue-700">Santa Ceia</h1>
            <p className="text-gray-600 mt-2">
              Controle do mês e registro histórico (salvo no Firestore).
            </p>
          </div>

          <Link
            href="/dashboard"
            className="bg-white border px-4 py-2 rounded-xl shadow-sm hover:bg-gray-50"
          >
            ← Voltar ao painel
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow p-4 flex gap-4 items-end flex-wrap">
          <div>
            <label className="text-sm text-gray-600">Ano</label>
            <input
              type="number"
              value={ano}
              onChange={(e) => setAno(Number(e.target.value))}
              className="block border rounded-xl px-3 py-2 mt-1"
              min={2000}
              max={2100}
              disabled={isBusy}
            />
          </div>

          <div>
            <label className="text-sm text-gray-600">Mês</label>
            <select
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              className="block border rounded-xl px-3 py-2 mt-1"
              disabled={isBusy}
            >
              {Array.from({ length: 12 }).map((_, i) => {
                const m = i + 1;
                return (
                  <option key={m} value={m}>
                    {pad2(m)} — {nomeMes(m)}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setAba("controle")}
              disabled={isBusy}
              className={`px-4 py-2 rounded-xl border ${
                aba === "controle"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white hover:bg-gray-50"
              } ${isBusy ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              Controle (ao vivo)
            </button>

            <button
              onClick={() => setAba("registro")}
              disabled={isBusy}
              className={`px-4 py-2 rounded-xl border ${
                aba === "registro"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white hover:bg-gray-50"
              } ${isBusy ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              Registro (histórico)
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow p-4">
          {(loadingMembros || loadingAba) && (
            <p className="text-gray-600">Carregando…</p>
          )}

          {!loadingMembros && !loadingAba && (
            <>
              <h2 className="text-xl font-semibold">
                {aba === "controle"
                  ? "Controle do mês (presença)"
                  : "Registro do mês (histórico)"}
              </h2>

              <p className="text-gray-600 mt-1">
                Clique em um nome para marcar/desmarcar. As alterações são salvas
                no Firestore.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 mt-4">
                {membros.map((m) => {
                  const marcado =
                    aba === "controle"
                      ? controleSet.has(m.id)
                      : registroSet.has(m.id);

                  const onClick =
                    aba === "controle"
                      ? () => toggleControle(m.id)
                      : () => toggleRegistro(m.id);

                  return (
                    <button
                      key={m.id}
                      onClick={onClick}
                      disabled={isBusy}
                      className={`text-left border rounded-xl px-3 py-3 hover:bg-gray-50 flex items-center justify-between gap-2 ${
                        marcado ? "bg-green-50 border-green-300" : "bg-white"
                      } ${isBusy ? "opacity-60 cursor-not-allowed" : ""}`}
                    >
                      <span className="font-medium">
                        {(m.numeroRol ? `${m.numeroRol} — ` : "") + m.nome}
                      </span>

                      <span
                        className={`text-xs px-2 py-1 rounded-full ${
                          marcado
                            ? "bg-green-600 text-white"
                            : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {marcado ? "SIM" : "Não"}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 text-sm text-gray-700">
                <strong>Total marcado no mês:</strong>{" "}
                {aba === "controle" ? totalControleMes : totalRegistroMes}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={baixarControleDoMes}
                  disabled={aba !== "controle" || isBusy}
                  className={`px-4 py-2 rounded-xl border ${
                    aba === "controle"
                      ? "bg-white hover:bg-gray-50"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  } ${isBusy ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  {baixandoControle ? "Baixando…" : "Baixar — Dia da Ceia"}
                </button>

                <button
                  onClick={baixarRegistroAnual}
                  disabled={aba !== "registro" || isBusy}
                  className={`px-4 py-2 rounded-xl border ${
                    aba === "registro"
                      ? "bg-white hover:bg-gray-50"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  } ${isBusy ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  {baixandoRegistro
                    ? "Baixando…"
                    : "Baixar — Ceia-Registro Anual"}
                </button>

                {aba === "controle" && (
                  <>
                    <button
                      onClick={finalizarMes}
                      disabled={isBusy}
                      className={`px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 ${
                        isBusy ? "opacity-60 cursor-not-allowed" : ""
                      }`}
                    >
                      {finalizando
                        ? "Finalizando…"
                        : "Finalizar Ceia do mês (copiar p/ Registro)"}
                    </button>

                    <button
                      type="button"
                      onClick={handleDesmarcarTodosControle}
                      disabled={isBusy}
                      className={`px-4 py-2 rounded-xl bg-red-600 text-white hover:bg-red-700 ${
                        isBusy ? "opacity-60 cursor-not-allowed" : ""
                      }`}
                    >
                      {desmarcando
                        ? "Desmarcando…"
                        : "Desmarcar todos (Controle)"}
                    </button>
                  </>
                )}

                <button
                  type="button"
                  disabled={aba !== "registro" || isBusy}
                  onClick={syncRegistro}
                  className={`px-4 py-2 rounded-xl border ${
                    aba === "registro"
                      ? "bg-white hover:bg-gray-50"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  } ${isBusy ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  {syncingRegistro
                    ? "Sincronizando…"
                    : "Sincronizar do Sheets (Registro)"}
                </button>

                <button
                  type="button"
                  disabled={aba !== "controle" || isBusy}
                  onClick={syncControle}
                  className={`px-4 py-2 rounded-xl border ${
                    aba === "controle"
                      ? "bg-white hover:bg-gray-50"
                      : "bg-gray-100 text-gray-400 cursor-not-allowed"
                  } ${isBusy ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  {syncingControle
                    ? "Sincronizando…"
                    : "Sincronizar do Sheets (Controle)"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </AuthGuard>
  );
}
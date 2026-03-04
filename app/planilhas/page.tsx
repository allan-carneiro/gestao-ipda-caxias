"use client";

import { exportExcel } from "@/src/lib/exportExcel";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import { PUBLIC_ENV, PUBLIC_ENV_OK } from "@/src/lib/publicEnv";
import { useToast } from "@/app/components/ToastProvider";

type Row = { id: string; createdAt?: number; [key: string]: any };

const SHEETS = [
  {
    key: "planilha_1_interna",
    title: "Dia da Ceia (interno)",
    subtitle: "Controle de participantes (lançamento interno no sistema)",
    columns: [
      { key: "numero", label: "Nº", readOnly: true },
      { key: "nomeCompleto", label: "Nome completo" },
      { key: "ipdaEPastor", label: "IPDA / Pastor" },
      { key: "telCarta", label: "Tel. ou Carta" },
      { key: "mes", label: "Mês/Ano" },
    ],
  },
  {
    key: "planilha_2_interna",
    title: "Ceia-Registro Anual (interno)",
    subtitle: "Registro do 1º semestre (Jan–Jun) — histórico no sistema",
    columns: [
      { key: "numero", label: "Nº", readOnly: true },
      { key: "nomeCompleto", label: "Nome completo" },
      { key: "jan26", label: "Jan/26" },
      { key: "fev26", label: "Fev/26" },
      { key: "mar26", label: "Mar/26" },
      { key: "abr26", label: "Abr/26" },
      { key: "mai26", label: "Mai/26" },
      { key: "jun26", label: "Jun/26" },
      { key: "totalP", label: "Total P", readOnly: true },
      { key: "observacao", label: "Observações" },
    ],
  },
] as const;

// ✅ fallbacks (caso ENV esteja vazia)
const FALLBACK_SHEETS_1 =
  "https://docs.google.com/spreadsheets/d/1Vj6zm9udN4_YEnIHnkuyPjAlHpr5DVMANXdTLynG5P8/edit?gid=266525834#gid=266525834";

const FALLBACK_SHEETS_2_JAN_JUN =
  "https://docs.google.com/spreadsheets/d/1W7ynj7aRqZrry9_ZvSzsxZfoeOct1X1A/edit?gid=580197467#gid=580197467";

const SHEETS_2_JUL_DEZ =
  "https://docs.google.com/spreadsheets/d/1W7ynj7aRqZrry9_ZvSzsxZfoeOct1X1A/edit?gid=1851549064#gid=1851549064";

export default function PlanilhasPage() {
  const toast = useToast();

  function flash(message: string) {
    const m = message.trim();

    if (m.startsWith("✅")) {
      toast.success(m.replace(/^✅\s*/, ""));
      return;
    }
    if (m.startsWith("❌")) {
      toast.error(m.replace(/^❌\s*/, ""));
      return;
    }
    toast.info(m);
  }

  // ✅ usa ENV se existir; senão usa fallback
  const sheets1 =
    (PUBLIC_ENV.SHEETS_1_URL && PUBLIC_ENV.SHEETS_1_URL.trim()) ||
    FALLBACK_SHEETS_1;

  const sheets2 =
    (PUBLIC_ENV.SHEETS_2_URL && PUBLIC_ENV.SHEETS_2_URL.trim()) ||
    FALLBACK_SHEETS_2_JAN_JUN;

  const sheets2JulDez = SHEETS_2_JUL_DEZ;

  const envOk = PUBLIC_ENV_OK.SHEETS;

  const [activeKey, setActiveKey] =
    useState<(typeof SHEETS)[number]["key"]>("planilha_1_interna");

  const activeSheet = useMemo(
    () => SHEETS.find((s) => s.key === activeKey)!,
    [activeKey]
  );

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function load() {
    setLoading(true);

    const q = query(collection(db, activeKey), orderBy("createdAt", "asc"));
    const snap = await getDocs(q);

    const data: Row[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as any),
    }));

    const withNumero = data.map((r, idx) => ({ ...r, numero: idx + 1 }));
    setRows(withNumero);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey]);

  function setCell(rowId: string, colKey: string, value: any) {
    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, [colKey]: value } : r))
    );
  }

  function recalcTotalP(row: Row) {
    if (activeKey !== "planilha_2_interna") return row;

    const months = ["jan26", "fev26", "mar26", "abr26", "mai26", "jun26"];
    const total = months.reduce((acc, k) => {
      const v = String(row[k] ?? "").trim().toUpperCase();
      return acc + (v === "P" ? 1 : 0);
    }, 0);

    return { ...row, totalP: total };
  }

  async function addRow() {
    if (saving || loading) return;

    const base: any = {};
    activeSheet.columns.forEach((c) => {
      if (c.key === "numero") return;
      base[c.key] = c.key === "totalP" ? 0 : "";
    });
    base.createdAt = Date.now();

    const ref = await addDoc(collection(db, activeKey), base);

    setRows((prev) => {
      const next = [...prev, { id: ref.id, ...base }];
      return next.map((r, idx) => ({ ...r, numero: idx + 1 }));
    });

    flash("Linha adicionada.");
  }

  async function removeRow(rowId: string) {
    if (saving || loading) return;

    const ok = confirm(
      "Remover esta linha?\n\nEssa ação não pode ser desfeita."
    );
    if (!ok) return;

    await deleteDoc(doc(db, activeKey, rowId));

    setRows((prev) =>
      prev
        .filter((r) => r.id !== rowId)
        .map((r, idx) => ({ ...r, numero: idx + 1 }))
    );

    flash("Linha removida.");
  }

  async function saveAll() {
    if (saving || loading) return;

    setSaving(true);

    try {
      await Promise.all(
        rows.map((r) => {
          const computed = recalcTotalP(r);
          const { id, numero, ...data } = computed;

          if (activeKey === "planilha_2_interna") {
            data.totalP = Number(data.totalP ?? 0);
          }

          return updateDoc(doc(db, activeKey, id), data);
        })
      );

      flash("✅ Alterações salvas com sucesso!");
    } catch (e) {
      console.error(e);
      flash("❌ Erro ao salvar. Tente novamente.");
    } finally {
      setSaving(false);
    }
  }

  // ✅ EXPORTA XLSX (Excel de verdade — sem erro de acentos)
  async function exportData() {
    if (exporting || loading) return;

    try {
      setExporting(true);

      const headers = activeSheet.columns.map((c) => c.label);
      const keys = activeSheet.columns.map((c) => c.key);

      const rowsData = rows.map((r) => keys.map((k) => r[k] ?? ""));

      const fileName =
        activeKey === "planilha_1_interna"
          ? "DIA-DA-CEIA"
          : "CEIA-REGISTRO-ANUAL";

      await exportExcel({
        fileName,
        sheetName: activeSheet.title, // sanitização fica no exportExcel
        title:
          activeKey === "planilha_1_interna"
            ? "DIA DA CEIA — IPDA CAXIAS"
            : "SANTA CEIA — REGISTRO ANUAL — IPDA CAXIAS",
        headers,
        rows: rowsData,
      });

      flash("✅ Arquivo Excel exportado.");
    } catch (e) {
      console.error(e);
      flash("❌ Erro ao exportar. Tente novamente.");
    } finally {
      setExporting(false);
    }
  }

  const isMonth =
    activeKey === "planilha_2_interna"
      ? (k: string) =>
          ["jan26", "fev26", "mar26", "abr26", "mai26", "jun26"].includes(k)
      : () => false;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-blue-700">Planilhas</h1>
          <p className="text-sm text-gray-600">{activeSheet.subtitle}</p>
        </div>

        <Link
          href="/dashboard"
          className="bg-white border px-4 py-2 rounded-xl shadow-sm hover:bg-gray-50"
        >
          ← Voltar ao painel
        </Link>
      </div>

      {!envOk && (
        <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2">
          Atenção: variáveis do Sheets não carregaram (ENV). Estou usando links
          de fallback. Se você acabou de criar/alterar o <b>.env.local</b>,
          reinicie o servidor (<b>CTRL+C</b> e <b>npm run dev</b>).
        </div>
      )}

      <div className="w-full bg-white border rounded-2xl p-4 shadow-sm flex flex-wrap gap-3">
        <a
          href={sheets1}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-medium"
        >
          📄 Dia da Ceia ↗
        </a>

        <a
          href={sheets2}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 font-medium"
        >
          📄 Ceia-Registro Anual ↗
        </a>

        <a
          href={sheets2JulDez}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 font-medium"
        >
          📊 Registro (Jul–Dez) ↗
        </a>
      </div>

      <div className="flex gap-2 flex-wrap">
        {SHEETS.map((s) => (
          <button
            key={s.key}
            onClick={() => setActiveKey(s.key)}
            className={`px-4 py-2 rounded-xl border ${
              activeKey === s.key
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white hover:bg-gray-50"
            }`}
            type="button"
          >
            {s.title}
          </button>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <button
          onClick={addRow}
          className="px-4 py-2 rounded-xl bg-white border hover:bg-gray-50"
          type="button"
          disabled={loading || saving}
        >
          ➕ Adicionar linha
        </button>

        <button
          onClick={saveAll}
          disabled={saving || loading}
          className="px-4 py-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          type="button"
        >
          {saving ? "Salvando..." : "💾 Salvar"}
        </button>

        <button
          onClick={exportData}
          className="px-4 py-2 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
          type="button"
          disabled={loading || exporting}
        >
          {exporting ? "Exportando..." : "⬇️ Exportar Excel (.xlsx)"}
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow overflow-x-auto">
        {loading ? (
          <div className="p-6 text-gray-600">Carregando...</div>
        ) : (
          <table className="min-w-[1100px] w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                {activeSheet.columns.map((c) => (
                  <th
                    key={c.key}
                    className="text-left px-4 py-3 font-semibold text-gray-700"
                  >
                    {c.label}
                  </th>
                ))}
                <th className="px-4 py-3"></th>
              </tr>
            </thead>

            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  {activeSheet.columns.map((c) => {
                    const readOnly = (c as any).readOnly === true;

                    if (c.key === "numero") {
                      return (
                        <td key={c.key} className="px-4 py-2 text-gray-700">
                          {r.numero ?? ""}
                        </td>
                      );
                    }

                    const monthCell = isMonth(c.key);

                    return (
                      <td key={c.key} className="px-4 py-2">
                        <input
                          value={r[c.key] ?? ""}
                          readOnly={readOnly}
                          onChange={(e) => {
                            if (readOnly) return;

                            const v = monthCell
                              ? e.target.value.toUpperCase().slice(0, 1)
                              : e.target.value;

                            setCell(r.id, c.key, v);

                            if (activeKey === "planilha_2_interna") {
                              setRows((prev) =>
                                prev.map((row) =>
                                  row.id === r.id
                                    ? recalcTotalP({ ...row, [c.key]: v })
                                    : row
                                )
                              );
                            }
                          }}
                          className={`w-full px-3 py-2 rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                            readOnly ? "bg-gray-50 text-gray-600" : ""
                          } ${monthCell ? "text-center font-semibold" : ""}`}
                          placeholder={monthCell ? "P" : ""}
                          disabled={saving}
                        />
                      </td>
                    );
                  })}

                  <td className="px-4 py-2">
                    <button
                      onClick={() => removeRow(r.id)}
                      className="px-3 py-2 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
                      type="button"
                      disabled={saving}
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}

              {rows.length === 0 && (
                <tr>
                  <td
                    className="p-6 text-gray-500"
                    colSpan={activeSheet.columns.length + 1}
                  >
                    Nenhuma linha ainda. Clique em “Adicionar linha”.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-gray-500 text-sm">
        Observação: no registro interno, preencha os meses com <b>P</b>{" "}
        (Participou). O campo <b>Total P</b> é calculado automaticamente.
      </p>
    </div>
  );
}
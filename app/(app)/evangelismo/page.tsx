"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/app/components/AuthGuard";
import { useToast } from "@/app/components/ToastProvider";
import {
  criarEvangelismo,
  listarEvangelismos,
  type Evangelismo,
} from "@/src/lib/evangelismo";

type FieldErrors = Record<string, string>;

function onlyDigits(v: string) {
  return String(v ?? "").replace(/\D/g, "");
}

function normalizeText(v: unknown) {
  return String(v ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function formatarDataBR(iso?: string | null) {
  const s = String(iso ?? "").trim();
  if (!s) return "—";

  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return s;

  return `${m[3]}/${m[2]}/${m[1]}`;
}

function inputClass(isError: boolean) {
  return `inputBase ${isError ? "inputError" : ""}`;
}

function textareaClass(isError: boolean) {
  return `textareaBase ${isError ? "inputError" : ""}`;
}

export default function EvangelismoPage() {
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const [busca, setBusca] = useState("");

  const [dataEvangelismo, setDataEvangelismo] = useState("");
  const [localRealizado, setLocalRealizado] = useState("");
  const [ipdaResponsavel, setIpdaResponsavel] = useState("");
  const [teveApoioExterno, setTeveApoioExterno] = useState<"Não" | "Sim">("Não");
  const [ipdaApoiadora, setIpdaApoiadora] = useState("");
  const [almasAceitaramJesus, setAlmasAceitaramJesus] = useState("");
  const [almasSeReconciliaram, setAlmasSeReconciliaram] = useState("");

  const [evangelismos, setEvangelismos] = useState<Evangelismo[]>([]);

  function clearMessages() {
    setErro(null);
    setSucesso(null);
  }

  function clearFieldErrors() {
    setFieldErrors({});
  }

  function toastErro(e: any, fallback: string) {
    const msg =
      typeof e?.message === "string" && e.message.trim()
        ? e.message
        : typeof e === "string" && e.trim()
        ? e
        : fallback;

    const finalMsg = msg.startsWith("Erro:") ? msg : `Erro: ${msg}`;
    setErro(finalMsg);
    toast.error(finalMsg);
  }

  function toastOk(msg: string) {
    setSucesso(msg);
    toast.success(msg);
  }

  async function carregar(opts?: { silent?: boolean }) {
    try {
      setLoading(true);
      const items = await listarEvangelismos();
      setEvangelismos(items);

      if (!opts?.silent) {
        toast.success("Lista de evangelismos atualizada.");
      }
    } catch (e: any) {
      console.error(e);
      toastErro(e, "Não foi possível carregar os evangelismos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregar({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function validarFormulario() {
    const errors: FieldErrors = {};

    if (!dataEvangelismo) {
      errors.dataEvangelismo = "Informe a data do evangelismo.";
    }

    if (!localRealizado.trim()) {
      errors.localRealizado = "Informe onde foi realizado o evangelismo.";
    }

    if (!ipdaResponsavel.trim()) {
      errors.ipdaResponsavel = "Informe qual IPDA realizou o evangelismo.";
    }

    if (teveApoioExterno === "Sim" && !ipdaApoiadora.trim()) {
      errors.ipdaApoiadora = "Informe qual IPDA ajudou.";
    }

    const aceitou = Number(onlyDigits(almasAceitaramJesus || "0"));
    const reconciliou = Number(onlyDigits(almasSeReconciliaram || "0"));

    if (!Number.isFinite(aceitou) || aceitou < 0) {
      errors.almasAceitaramJesus = "Informe um número válido.";
    }

    if (!Number.isFinite(reconciliou) || reconciliou < 0) {
      errors.almasSeReconciliaram = "Informe um número válido.";
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      const msg = "Revise os campos destacados antes de salvar.";
      setErro(msg);
      toast.error(msg);
      return false;
    }

    return true;
  }

  function limparFormulario() {
    setDataEvangelismo("");
    setLocalRealizado("");
    setIpdaResponsavel("");
    setTeveApoioExterno("Não");
    setIpdaApoiadora("");
    setAlmasAceitaramJesus("");
    setAlmasSeReconciliaram("");
    setFieldErrors({});
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;

    clearMessages();
    clearFieldErrors();

    const ok = validarFormulario();
    if (!ok) return;

    try {
      setSaving(true);

      await criarEvangelismo({
        dataEvangelismo,
        localRealizado,
        ipdaResponsavel,
        teveApoioExterno: teveApoioExterno === "Sim",
        ipdaApoiadora: teveApoioExterno === "Sim" ? ipdaApoiadora : null,
        almasAceitaramJesus: Number(onlyDigits(almasAceitaramJesus || "0")),
        almasSeReconciliaram: Number(onlyDigits(almasSeReconciliaram || "0")),
      });

      toastOk("Evangelismo registrado com sucesso.");
      limparFormulario();
      await carregar({ silent: true });
    } catch (e: any) {
      console.error(e);
      toastErro(e, "Não foi possível salvar o evangelismo.");
    } finally {
      setSaving(false);
    }
  }

  const evangelismosFiltrados = useMemo(() => {
    const term = normalizeText(busca);
    if (!term) return evangelismos;

    return evangelismos.filter((item) => {
      const blobs = [
        item.dataEvangelismo,
        formatarDataBR(item.dataEvangelismo),
        item.localRealizado,
        item.ipdaResponsavel,
        item.teveApoioExterno ? "sim" : "nao",
        item.ipdaApoiadora ?? "",
        String(item.almasAceitaramJesus ?? 0),
        String(item.almasSeReconciliaram ?? 0),
      ]
        .map(normalizeText)
        .join(" ");

      return blobs.includes(term);
    });
  }, [evangelismos, busca]);

  const resumo = useMemo(() => {
    let totalAceitaram = 0;
    let totalReconciliaram = 0;
    let totalComApoio = 0;

    for (const item of evangelismosFiltrados) {
      totalAceitaram += Number(item.almasAceitaramJesus ?? 0);
      totalReconciliaram += Number(item.almasSeReconciliaram ?? 0);
      if (item.teveApoioExterno) totalComApoio++;
    }

    return {
      totalRegistros: evangelismosFiltrados.length,
      totalAceitaram,
      totalReconciliaram,
      totalComApoio,
    };
  }, [evangelismosFiltrados]);

  async function exportarExcel() {
    if (exporting) return;

    try {
      setExporting(true);

      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Evangelismos");

      const hoje = new Date();
      const stamp = [
        hoje.getFullYear(),
        String(hoje.getMonth() + 1).padStart(2, "0"),
        String(hoje.getDate()).padStart(2, "0"),
      ].join("-");

      worksheet.mergeCells("A1:G1");
      const titulo = worksheet.getCell("A1");
      titulo.value = "Relatório de Evangelismo - Gestão IPDA Caxias";
      titulo.font = { bold: true, size: 16, color: { argb: "FFFFFFFF" } };
      titulo.alignment = { vertical: "middle", horizontal: "center" };
      titulo.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1D4ED8" },
      };
      worksheet.getRow(1).height = 24;

      worksheet.mergeCells("A2:G2");
      const subtitulo = worksheet.getCell("A2");
      subtitulo.value = `Gerado em ${hoje.toLocaleDateString("pt-BR")} • ${evangelismosFiltrados.length} registro(s) exportado(s)`;
      subtitulo.font = { italic: true, color: { argb: "FF374151" } };
      subtitulo.alignment = { horizontal: "center" };

      worksheet.getCell("A4").value = "Total de evangelismos";
      worksheet.getCell("B4").value = resumo.totalRegistros;
      worksheet.getCell("C4").value = "Almas aceitaram Jesus";
      worksheet.getCell("D4").value = resumo.totalAceitaram;
      worksheet.getCell("E4").value = "Almas reconciliadas";
      worksheet.getCell("F4").value = resumo.totalReconciliaram;
      worksheet.getCell("G4").value = `Com apoio externo: ${resumo.totalComApoio}`;

      ["A4", "C4", "E4"].forEach((cellRef) => {
        const c = worksheet.getCell(cellRef);
        c.font = { bold: true, color: { argb: "FF1F2937" } };
        c.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFDBEAFE" },
        };
      });

      ["B4", "D4", "F4", "G4"].forEach((cellRef) => {
        const c = worksheet.getCell(cellRef);
        c.font = { bold: true };
        c.alignment = { horizontal: "center" };
      });

      const headerRowIndex = 6;
      const headers = [
        "Data",
        "Local",
        "IPDA responsável",
        "Teve apoio externo?",
        "IPDA apoiadora",
        "Almas aceitaram Jesus",
        "Almas se reconciliaram",
      ];

      const headerRow = worksheet.getRow(headerRowIndex);
      headers.forEach((header, i) => {
        const cell = headerRow.getCell(i + 1);
        cell.value = header;
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF2563EB" },
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FFBFDBFE" } },
          left: { style: "thin", color: { argb: "FFBFDBFE" } },
          bottom: { style: "thin", color: { argb: "FFBFDBFE" } },
          right: { style: "thin", color: { argb: "FFBFDBFE" } },
        };
      });
      headerRow.height = 22;

      evangelismosFiltrados.forEach((item, index) => {
        const row = worksheet.addRow([
          formatarDataBR(item.dataEvangelismo),
          item.localRealizado || "—",
          item.ipdaResponsavel || "—",
          item.teveApoioExterno ? "Sim" : "Não",
          item.ipdaApoiadora || "—",
          Number(item.almasAceitaramJesus ?? 0),
          Number(item.almasSeReconciliaram ?? 0),
        ]);

        const isEven = index % 2 === 0;

        row.eachCell((cell, colNumber) => {
          cell.alignment = {
            vertical: "middle",
            horizontal: colNumber >= 6 ? "center" : "left",
            wrapText: true,
          };

          cell.border = {
            top: { style: "thin", color: { argb: "FFE5E7EB" } },
            left: { style: "thin", color: { argb: "FFE5E7EB" } },
            bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
            right: { style: "thin", color: { argb: "FFE5E7EB" } },
          };

          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: isEven ? "FFF8FAFC" : "FFFFFFFF" },
          };

          cell.font = {
            color: { argb: "FF111827" },
          };
        });

        if (item.teveApoioExterno) {
          row.getCell(4).fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFDCFCE7" },
          };
          row.getCell(4).font = {
            bold: true,
            color: { argb: "FF166534" },
          };
        }
      });

      worksheet.columns = [
        { width: 14 },
        { width: 30 },
        { width: 24 },
        { width: 18 },
        { width: 24 },
        { width: 20 },
        { width: 22 },
      ];

      worksheet.views = [{ state: "frozen", ySplit: 6 }];

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `evangelismos_${stamp}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);

      toast.success("Planilha Excel gerada com sucesso.");
    } catch (e: any) {
      console.error(e);
      toastErro(e, "Não foi possível gerar a planilha Excel.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <AuthGuard>
      <main className="min-h-screen bg-gray-100 p-4 md:p-8">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-blue-700">
                Evangelismo
              </h1>
              <p className="text-gray-600 mt-1">
                Registre e acompanhe os evangelismos realizados pela igreja.
              </p>
            </div>

            <Link
              href="/dashboard"
              className="rounded-xl bg-white px-4 py-2 shadow hover:bg-gray-50"
            >
              ← Voltar
            </Link>
          </div>

          <form onSubmit={salvar} className="mt-6 space-y-5">
            {sucesso ? (
              <div className="rounded-2xl bg-green-50 border border-green-200 p-4 text-green-800">
                {sucesso}
              </div>
            ) : null}

            {erro ? (
              <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-red-700">
                {erro}
              </div>
            ) : null}

            <Card title="Registrar evangelismo">
              <Row>
                <Field label="Data do evangelismo *" error={fieldErrors.dataEvangelismo}>
                  <input
                    type="date"
                    value={dataEvangelismo}
                    onChange={(e) => setDataEvangelismo(e.target.value)}
                    className={inputClass(!!fieldErrors.dataEvangelismo)}
                    disabled={saving}
                  />
                </Field>

                <Field
                  label="Onde foi realizado o evangelismo *"
                  error={fieldErrors.localRealizado}
                >
                  <input
                    value={localRealizado}
                    onChange={(e) => setLocalRealizado(e.target.value)}
                    className={inputClass(!!fieldErrors.localRealizado)}
                    placeholder="Ex.: Praça do bairro, Saracuruna..."
                    disabled={saving}
                  />
                </Field>

                <Field
                  label="Qual IPDA realizou o evangelismo *"
                  error={fieldErrors.ipdaResponsavel}
                >
                  <input
                    value={ipdaResponsavel}
                    onChange={(e) => setIpdaResponsavel(e.target.value)}
                    className={inputClass(!!fieldErrors.ipdaResponsavel)}
                    placeholder="Ex.: IPDA Caxias"
                    disabled={saving}
                  />
                </Field>
              </Row>

              <Row>
                <Field label="Teve IPDA de fora ajudando?">
                  <select
                    value={teveApoioExterno}
                    onChange={(e) => setTeveApoioExterno(e.target.value as "Sim" | "Não")}
                    className={inputClass(false)}
                    disabled={saving}
                  >
                    <option value="Não">Não</option>
                    <option value="Sim">Sim</option>
                  </select>
                </Field>

                <Field
                  label="Se sim, qual IPDA ajudou"
                  error={fieldErrors.ipdaApoiadora}
                >
                  <input
                    value={ipdaApoiadora}
                    onChange={(e) => setIpdaApoiadora(e.target.value)}
                    className={inputClass(!!fieldErrors.ipdaApoiadora)}
                    placeholder="Ex.: IPDA Belford Roxo"
                    disabled={saving || teveApoioExterno !== "Sim"}
                  />
                </Field>

                <Field
                  label="Quantas almas aceitaram Jesus"
                  error={fieldErrors.almasAceitaramJesus}
                >
                  <input
                    value={almasAceitaramJesus}
                    onChange={(e) =>
                      setAlmasAceitaramJesus(onlyDigits(e.target.value))
                    }
                    className={inputClass(!!fieldErrors.almasAceitaramJesus)}
                    inputMode="numeric"
                    placeholder="0"
                    disabled={saving}
                  />
                </Field>
              </Row>

              <Row>
                <Field
                  label="Quantas almas se reconciliaram com Jesus"
                  error={fieldErrors.almasSeReconciliaram}
                >
                  <input
                    value={almasSeReconciliaram}
                    onChange={(e) =>
                      setAlmasSeReconciliaram(onlyDigits(e.target.value))
                    }
                    className={inputClass(!!fieldErrors.almasSeReconciliaram)}
                    inputMode="numeric"
                    placeholder="0"
                    disabled={saving}
                  />
                </Field>

                <Field label="">
                  <div />
                </Field>

                <Field label="">
                  <div />
                </Field>
              </Row>

              <div className="flex flex-col md:flex-row gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
                >
                  {saving ? "Salvando..." : "Salvar registro"}
                </button>

                <button
                  type="button"
                  onClick={limparFormulario}
                  disabled={saving}
                  className="bg-white border px-6 py-3 rounded-xl font-semibold hover:bg-gray-50 disabled:opacity-60"
                >
                  Limpar
                </button>
              </div>
            </Card>

            <Card title="Registros cadastrados">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <MiniStat
                  label="Registros"
                  value={String(resumo.totalRegistros)}
                />
                <MiniStat
                  label="Aceitaram Jesus"
                  value={String(resumo.totalAceitaram)}
                />
                <MiniStat
                  label="Se reconciliaram"
                  value={String(resumo.totalReconciliaram)}
                />
                <MiniStat
                  label="Com apoio externo"
                  value={String(resumo.totalComApoio)}
                />
              </div>

              <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Pesquisar
                  </label>
                  <input
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    className={inputClass(false)}
                    placeholder="Data, local, IPDA, apoio externo, quantidades..."
                  />
                </div>

                <div className="flex items-end gap-2">
                  <button
                    type="button"
                    onClick={() => carregar()}
                    disabled={loading}
                    className="flex-1 px-4 py-3 rounded-xl bg-white border font-semibold hover:bg-gray-50 disabled:opacity-60"
                  >
                    Atualizar
                  </button>

                  <button
                    type="button"
                    onClick={exportarExcel}
                    disabled={exporting || evangelismosFiltrados.length === 0}
                    className="flex-1 px-4 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60"
                  >
                    {exporting ? "Gerando..." : "Baixar Excel"}
                  </button>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {loading ? (
                  <div className="bg-gray-50 rounded-2xl border p-4">
                    Carregando registros...
                  </div>
                ) : evangelismosFiltrados.length === 0 ? (
                  <div className="bg-gray-50 rounded-2xl border p-4">
                    Nenhum evangelismo encontrado.
                  </div>
                ) : (
                  evangelismosFiltrados.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl border shadow-sm p-4 md:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <p className="text-lg font-bold text-gray-900">
                          {item.localRealizado || "Local não informado"}
                        </p>

                        <p className="text-sm text-gray-600">
                          Data:{" "}
                          <span className="font-semibold text-gray-900">
                            {formatarDataBR(item.dataEvangelismo)}
                          </span>
                        </p>

                        <p className="text-sm text-gray-600">
                          IPDA responsável:{" "}
                          <span className="font-semibold text-gray-900">
                            {item.ipdaResponsavel || "—"}
                          </span>
                        </p>

                        <p className="text-sm text-gray-600">
                          Apoio externo:{" "}
                          <span
                            className={
                              item.teveApoioExterno
                                ? "font-semibold text-green-700"
                                : "font-semibold text-gray-700"
                            }
                          >
                            {item.teveApoioExterno ? "Sim" : "Não"}
                          </span>
                          {item.teveApoioExterno && item.ipdaApoiadora
                            ? ` • ${item.ipdaApoiadora}`
                            : ""}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 md:min-w-[260px]">
                        <InfoBox
                          label="Aceitaram Jesus"
                          value={String(item.almasAceitaramJesus ?? 0)}
                        />
                        <InfoBox
                          label="Se reconciliaram"
                          value={String(item.almasSeReconciliaram ?? 0)}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </form>
        </div>

        <style jsx>{`
          .inputBase {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid rgb(229 231 235);
            border-radius: 0.75rem;
            background: white;
            outline: none;
          }
          .inputError {
            border-color: rgb(248 113 113);
            box-shadow: 0 0 0 3px rgba(248, 113, 113, 0.15);
          }
          .textareaBase {
            width: 100%;
            min-height: 120px;
            padding: 0.75rem;
            border: 1px solid rgb(229 231 235);
            border-radius: 0.75rem;
            background: white;
            outline: none;
          }
        `}</style>
      </main>
    </AuthGuard>
  );
}

function Card(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-3xl shadow p-5 md:p-7">
      <h2 className="text-lg font-bold text-gray-900">{props.title}</h2>
      <div className="mt-4 space-y-4">{props.children}</div>
    </div>
  );
}

function Row(props: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{props.children}</div>;
}

function Field(props: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{props.label}</label>
      <div className="mt-2">{props.children}</div>
      {props.error ? <p className="mt-2 text-sm text-red-600">{props.error}</p> : null}
    </div>
  );
}

function MiniStat(props: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-blue-50 p-4">
      <p className="text-sm text-blue-700">{props.label}</p>
      <p className="text-2xl font-bold text-blue-900 mt-1">{props.value}</p>
    </div>
  );
}

function InfoBox(props: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-gray-50 border p-3">
      <p className="text-xs text-gray-500">{props.label}</p>
      <p className="text-xl font-bold text-gray-900 mt-1">{props.value}</p>
    </div>
  );
}
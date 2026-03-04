"use client";

import React, { useEffect, useMemo, useState } from "react";
import AuthGuard from "@/app/components/AuthGuard";
import Link from "next/link";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/src/lib/firebase";

type Membro = {
  id: string;
  nomeCompleto?: string;
  dataNascimento?: string; // yyyy-mm-dd
  telefoneCelular?: string;
  status?: "Ativo" | "Inativo";
};

function onlyDigits(v: string) {
  return (v || "").replace(/\D/g, "");
}

function maskPhone(v: string) {
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

function getMonthFromISO(dateISO?: string) {
  // yyyy-mm-dd
  if (!dateISO || dateISO.length < 7) return null;
  const mm = Number(dateISO.slice(5, 7));
  if (!mm || mm < 1 || mm > 12) return null;
  return mm;
}

function getDayFromISO(dateISO?: string) {
  if (!dateISO || dateISO.length < 10) return null;
  const dd = Number(dateISO.slice(8, 10));
  if (!dd || dd < 1 || dd > 31) return null;
  return dd;
}

const MESES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
];

export default function AniversariantesPage() {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const [membros, setMembros] = useState<Membro[]>([]);
  const [soAtivos, setSoAtivos] = useState(true);

  const mesAtual = new Date().getMonth() + 1; // 1-12
  const [mesSelecionado, setMesSelecionado] = useState<number>(mesAtual);

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);
        setErro(null);

        const snap = await getDocs(collection(db, "membros"));
        const arr: Membro[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));

        if (alive) setMembros(arr);
      } catch (e: any) {
        console.error(e);
        if (alive) setErro(e?.message ? `Erro: ${e.message}` : "Erro ao carregar membros.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  const aniversariantes = useMemo(() => {
    return membros
      .filter((m) => (soAtivos ? (m.status || "Ativo") === "Ativo" : true))
      .map((m) => ({
        ...m,
        mes: getMonthFromISO(m.dataNascimento),
        dia: getDayFromISO(m.dataNascimento),
      }))
      .filter((m) => m.mes === mesSelecionado && !!m.dia)
      .sort((a: any, b: any) => (a.dia as number) - (b.dia as number));
  }, [membros, soAtivos, mesSelecionado]);

  return (
    <AuthGuard>
      <main className="min-h-screen bg-gray-100 p-4 md:p-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex items-start justify-between gap-4 no-print">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-blue-700">
                Aniversariantes do mês
              </h1>
              <p className="text-gray-600 mt-1">
                Ordenado por dia, com opção de imprimir.
              </p>
            </div>

            <div className="flex gap-2">
              <Link
                href="/relatorios"
                className="rounded-xl bg-white px-4 py-2 shadow hover:bg-gray-50"
              >
                Voltar
              </Link>
              <button
                onClick={() => window.print()}
                className="rounded-xl bg-blue-600 text-white px-4 py-2 shadow hover:bg-blue-700"
              >
                Imprimir
              </button>
            </div>
          </div>

          {erro ? (
            <div className="mt-6 rounded-2xl bg-red-50 border border-red-200 p-4 text-red-700">
              {erro}
            </div>
          ) : null}

          <div className="mt-6 bg-white rounded-3xl shadow p-5 md:p-7">
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center no-print">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">Mês:</span>
                <select
                  value={mesSelecionado}
                  onChange={(e) => setMesSelecionado(Number(e.target.value))}
                  className="px-4 py-3 border rounded-xl"
                >
                  {MESES.map((nome, idx) => (
                    <option key={nome} value={idx + 1}>
                      {nome}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={soAtivos}
                  onChange={(e) => setSoAtivos(e.target.checked)}
                />
                Mostrar somente Ativos
              </label>

              <div className="text-sm text-gray-600 md:ml-auto">
                Total: <b>{aniversariantes.length}</b>
              </div>
            </div>

            {loading ? (
              <div className="mt-4">Carregando...</div>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 pr-3">Dia</th>
                      <th className="py-2 pr-3">Nome</th>
                      <th className="py-2">Telefone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aniversariantes.map((m: any) => (
                      <tr key={m.id} className="border-b">
                        <td className="py-2 pr-3 font-semibold">{m.dia}</td>
                        <td className="py-2 pr-3">{m.nomeCompleto || "(Sem nome)"}</td>
                        <td className="py-2">
                          {maskPhone(m.telefoneCelular || "") || "-"}
                        </td>
                      </tr>
                    ))}

                    {aniversariantes.length === 0 ? (
                      <tr>
                        <td className="py-4 text-gray-600" colSpan={3}>
                          Nenhum aniversariante encontrado para este mês.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <style jsx global>{`
          @media print {
            .no-print {
              display: none !important;
            }
            body {
              background: white !important;
            }
            table {
              font-size: 12px;
            }
          }
        `}</style>
      </main>
    </AuthGuard>
  );
}

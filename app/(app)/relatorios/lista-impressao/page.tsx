"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import { useToast } from "@/app/components/ToastProvider";

type Membro = {
  id: string;
  nomeCompleto?: string;
  telefoneCelular?: string;
  telefoneResidencial?: string | null;
  endereco?: {
    logradouro?: string;
    numero?: string;
    complemento?: string | null;
    bairro?: string;
    cidade?: string;
    estado?: string;
    cep?: string | null;
  };
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

function maskCEP(v: string) {
  const d = onlyDigits(v).slice(0, 8);
  if (!d) return "";
  return d.replace(/^(\d{5})(\d)/, "$1-$2");
}

function formatEndereco(m: Membro) {
  const e = m.endereco || {};
  const partes: string[] = [];

  const linha1 = [e.logradouro, e.numero].filter(Boolean).join(", ");
  if (linha1) partes.push(linha1);

  if (e.complemento) partes.push(String(e.complemento));
  if (e.bairro) partes.push(String(e.bairro));

  const cidadeUf = [e.cidade, e.estado].filter(Boolean).join(" / ");
  if (cidadeUf) partes.push(cidadeUf);

  const cep = maskCEP(e.cep || "");
  if (cep) partes.push(`CEP: ${cep}`);

  return partes.join(" - ");
}

export default function ListaImpressaoPage() {
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
  const [soAtivos, setSoAtivos] = useState(true);
  const [busca, setBusca] = useState("");

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        setLoading(true);

        const q = query(collection(db, "membros"), orderBy("nomeCompleto", "asc"));
        const snap = await getDocs(q);

        const arr: Membro[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));

        if (alive) setMembros(arr);
      } catch (e: any) {
        console.error(e);
        if (alive) toastErro(e, "Erro ao carregar membros.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtrados = useMemo(() => {
    const b = busca.trim().toLowerCase();

    return membros
      .filter((m) => (soAtivos ? (m.status || "Ativo") === "Ativo" : true))
      .filter((m) => {
        if (!b) return true;
        const nome = (m.nomeCompleto || "").toLowerCase();
        const tel =
          onlyDigits(m.telefoneCelular || "") +
          onlyDigits(m.telefoneResidencial || "");
        const end = formatEndereco(m).toLowerCase();
        return (
          nome.includes(b) || tel.includes(onlyDigits(b)) || end.includes(b)
        );
      });
  }, [membros, soAtivos, busca]);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap no-print">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold text-blue-700">
            Lista para impressão
          </h1>
          <p className="text-gray-600">Nome + telefone + endereço.</p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/relatorios"
            className="rounded-xl bg-white px-4 py-2 shadow hover:bg-gray-50"
          >
            Voltar
          </Link>
          <button
            type="button"
            onClick={() => {
              toast.info("Abrindo impressão…");
              window.print();
            }}
            className="rounded-xl bg-blue-600 text-white px-4 py-2 shadow hover:bg-blue-700"
          >
            Imprimir
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow p-5 md:p-7">
        <div className="flex flex-col md:flex-row gap-3 items-start md:items-center no-print">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nome, telefone ou endereço..."
            className="w-full md:max-w-md px-4 py-3 border rounded-xl"
          />

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={soAtivos}
              onChange={(e) => setSoAtivos(e.target.checked)}
            />
            Mostrar somente Ativos
          </label>

          <div className="text-sm text-gray-600 md:ml-auto">
            Total: <b>{filtrados.length}</b>
          </div>
        </div>

        {loading ? (
          <div className="mt-4 text-gray-600">Carregando...</div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="py-2 pr-3">#</th>
                  <th className="py-2 pr-3">Nome</th>
                  <th className="py-2 pr-3">Telefone</th>
                  <th className="py-2">Endereço</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((m, idx) => {
                  const tel =
                    maskPhone(m.telefoneCelular || "") ||
                    maskPhone(m.telefoneResidencial || "") ||
                    "-";
                  const end = formatEndereco(m) || "-";

                  return (
                    <tr key={m.id} className="border-b">
                      <td className="py-2 pr-3">{idx + 1}</td>
                      <td className="py-2 pr-3 font-medium">
                        {m.nomeCompleto || "(Sem nome)"}
                      </td>
                      <td className="py-2 pr-3">{tel}</td>
                      <td className="py-2">{end}</td>
                    </tr>
                  );
                })}

                {filtrados.length === 0 ? (
                  <tr>
                    <td className="py-4 text-gray-600" colSpan={4}>
                      Nenhum membro encontrado.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        )}
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
    </div>
  );
}
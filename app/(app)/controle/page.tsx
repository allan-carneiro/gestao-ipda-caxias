"use client";

import { db } from "@/src/lib/firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import Link from "next/link";
import React, { useEffect, useMemo, useState } from "react";
import { listarControleCeia, marcarPresencaNoControle } from "@/src/lib/ceia";
import { useToast } from "@/app/components/ToastProvider";
import { getUserRoleFromToken } from "@/src/lib/auth/getUserRole";
import { canEditMembers, isDemo } from "@/src/lib/auth/permissions";
import { getPaths } from "@/src/lib/demo/paths";
import type { UserRole } from "@/src/types/auth";

type MembroListItem = {
  id: string;
  nomeCompleto?: string;
  telefoneCelular?: string;
  status?: "Ativo" | "Inativo";
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

export default function SantaCeiaControlePage() {
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
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  const now = new Date();
  const [year, setYear] = useState<number>(now.getFullYear());
  const [month, setMonth] = useState<number>(now.getMonth() + 1);

  const [membros, setMembros] = useState<MembroListItem[]>([]);
  const [participantesSet, setParticipantesSet] = useState<Set<string>>(
    new Set()
  );

  const [qText, setQText] = useState("");

  const paths = useMemo(() => getPaths(userRole ?? undefined), [userRole]);
  const demoMode = useMemo(() => isDemo(userRole ?? undefined), [userRole]);
  const allowWriteControle = useMemo(
    () => canEditMembers(userRole ?? undefined) && !isDemo(userRole ?? undefined),
    [userRole]
  );

  const membrosFiltrados = useMemo(() => {
    const t = qText.trim().toLowerCase();
    const base = membros.filter((m) => (m.status || "Ativo") === "Ativo");
    if (!t) return base;

    return base.filter((m) => {
      const nome = (m.nomeCompleto || "").toLowerCase();
      const tel = (m.telefoneCelular || "").toLowerCase();
      return nome.includes(t) || tel.includes(t);
    });
  }, [membros, qText]);

  useEffect(() => {
    let alive = true;

    async function loadRole() {
      try {
        setLoadingRole(true);
        const role = await getUserRoleFromToken();
        if (!alive) return;
        setUserRole(role);
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setUserRole(null);
      } finally {
        if (alive) setLoadingRole(false);
      }
    }

    void loadRole();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function loadMembros() {
      if (!userRole) return;

      try {
        setLoading(true);

        const q = query(
          collection(db, paths.membros),
          orderBy("nomeCompleto", "asc")
        );
        const snap = await getDocs(q);

        const list: MembroListItem[] = [];
        snap.forEach((d) => {
          const data = d.data() as any;
          list.push({
            id: d.id,
            nomeCompleto: data.nomeCompleto || data.nome || "",
            telefoneCelular: data.telefoneCelular || data.telefone || "",
            status: data.status || "Ativo",
          });
        });

        if (!alive) return;
        setMembros(list);
      } catch (e: any) {
        console.error(e);
        toastErro(e, "Erro ao carregar membros.");
      } finally {
        if (alive) setLoading(false);
      }
    }

    void loadMembros();

    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRole, paths.membros]);

  useEffect(() => {
    let alive = true;

    async function loadParticipantes() {
      if (!userRole) return;

      try {
        const lista = await listarControleCeia(year, month);
        const set = new Set(
          lista.filter((p) => p.presente).map((p) => p.membroId)
        );

        if (!alive) return;
        setParticipantesSet(set);
      } catch (e: any) {
        console.error(e);
        if (!alive) return;
        toastErro(e, "Erro ao carregar participações.");
      }
    }

    void loadParticipantes();

    return () => {
      alive = false;
    };
  }, [year, month, userRole]);

  async function toggleParticipou(m: MembroListItem) {
    if (loading || loadingRole || !userRole) return;

    if (!allowWriteControle) {
      toast.error(
        demoMode
          ? "Modo demonstração: alterações do controle ao vivo estão desabilitadas para esta conta."
          : "Você não tem permissão para alterar o controle ao vivo."
      );
      return;
    }

    try {
      const ja = participantesSet.has(m.id);
      const novo = new Set(participantesSet);

      if (ja) novo.delete(m.id);
      else novo.add(m.id);

      setParticipantesSet(novo);

      await marcarPresencaNoControle(
        year,
        month,
        m.id,
        m.nomeCompleto || "",
        !ja
      );

      toast.success(ja ? "Participação removida." : "Participação registrada!");
    } catch (e: any) {
      console.error(e);
      toastErro(e, "Erro ao salvar participação.");
    }
  }

  const totalParticipantes = participantesSet.size;

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h1 className="text-2xl md:text-3xl font-bold text-blue-700">
            Santa Ceia — Controle (ao vivo)
          </h1>
          <p className="text-gray-600">
            Marque quem está participando no mês selecionado.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href="/santa-ceia"
            className="rounded-xl bg-white px-4 py-2 shadow hover:bg-gray-50"
          >
            Voltar
          </Link>
          <Link
            href="/santa-ceia/registro"
            className="rounded-xl bg-white px-4 py-2 shadow hover:bg-gray-50"
          >
            Registro
          </Link>
        </div>
      </div>

      {demoMode ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
          <strong>Modo demonstração:</strong> alterações do controle ao vivo estão
          desabilitadas para esta conta.
        </div>
      ) : null}

      {!loadingRole && !demoMode && !allowWriteControle ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
          Você não tem permissão para alterar o controle ao vivo.
        </div>
      ) : null}

      <div className="bg-white rounded-3xl shadow p-5 md:p-7">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Ano</label>
            <input
              value={year}
              onChange={(e) => setYear(Number(e.target.value || now.getFullYear()))}
              className="mt-2 w-full rounded-xl border px-3 py-2"
              inputMode="numeric"
              disabled={loading || loadingRole}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Mês</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="mt-2 w-full rounded-xl border px-3 py-2 bg-white"
              disabled={loading || loadingRole}
            >
              {Array.from({ length: 12 }).map((_, i) => {
                const m = i + 1;
                return (
                  <option key={m} value={m}>
                    {pad2(m)}
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex items-end justify-between gap-2">
            <div className="w-full">
              <label className="block text-sm font-medium text-gray-700">
                Buscar membro
              </label>
              <input
                value={qText}
                onChange={(e) => setQText(e.target.value)}
                className="mt-2 w-full rounded-xl border px-3 py-2"
                placeholder="Digite nome ou telefone…"
                disabled={loading || loadingRole}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-gray-700">
            <span className="font-semibold">Total marcados:</span>{" "}
            {totalParticipantes}
          </p>
          <p className="text-gray-500 text-sm">
            Ano {year} / Mês {pad2(month)}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow p-5 md:p-7">
        {loading || loadingRole ? (
          <p>Carregando membros…</p>
        ) : (
          <div className="space-y-2">
            {membrosFiltrados.map((m) => {
              const marcado = participantesSet.has(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleParticipou(m)}
                  disabled={loading || loadingRole || !allowWriteControle}
                  title={
                    !allowWriteControle
                      ? demoMode
                        ? "Modo demonstração: alteração desabilitada"
                        : "Você não tem permissão para alterar"
                      : ""
                  }
                  className={`w-full flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left hover:bg-gray-50 transition ${
                    marcado
                      ? "border-green-300 bg-green-50"
                      : "border-gray-200 bg-white"
                  } ${
                    loading || loadingRole || !allowWriteControle
                      ? "opacity-60 cursor-not-allowed"
                      : ""
                  }`}
                >
                  <div>
                    <p className="font-semibold text-gray-900">
                      {m.nomeCompleto || "(Sem nome)"}
                    </p>
                    <p className="text-sm text-gray-600">
                      {m.telefoneCelular || "—"}
                    </p>
                  </div>

                  <div className="text-sm font-semibold">
                    {marcado ? "✅ Participou" : "Marcar"}
                  </div>
                </button>
              );
            })}

            {membrosFiltrados.length === 0 ? (
              <p className="text-gray-600">Nenhum membro encontrado.</p>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getUserRoleFromToken } from "@/src/lib/auth/getUserRole";
import { isDemo } from "@/src/lib/auth/permissions";
import type { UserRole } from "@/src/types/auth";

export default function RelatoriosPage() {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);

  const demoMode = isDemo(userRole ?? undefined);

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

    loadRole();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-blue-700">
          Relatórios
        </h1>

        <p className="text-gray-600 mt-1">
          Gere listas e relatórios para impressão.
        </p>
      </div>

      {/* AVISO DEMO */}
      {!loadingRole && demoMode && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
          <strong>Modo demonstração:</strong> você pode visualizar os relatórios
          normalmente usando dados fictícios.
        </div>
      )}

      {/* CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/relatorios/lista-impressao"
          className="bg-white rounded-3xl shadow p-6 hover:bg-gray-50 transition"
        >
          <h2 className="text-lg font-bold">🖨️ Lista para impressão</h2>

          <p className="text-gray-600 mt-1">
            Nome + telefone + endereço (bem estilo secretaria).
          </p>
        </Link>

        <Link
          href="/relatorios/aniversariantes"
          className="bg-white rounded-3xl shadow p-6 hover:bg-gray-50 transition"
        >
          <h2 className="text-lg font-bold">🎂 Aniversariantes do mês</h2>

          <p className="text-gray-600 mt-1">
            Lista por dia, com opção de imprimir.
          </p>
        </Link>
      </div>
    </div>
  );
}
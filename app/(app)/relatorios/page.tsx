"use client";

import Link from "next/link";

export default function RelatoriosPage() {
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link
          href="/relatorios/lista-impressao"
          className="bg-white rounded-3xl shadow p-6 hover:bg-gray-50"
        >
          <h2 className="text-lg font-bold">🖨️ Lista para impressão</h2>
          <p className="text-gray-600 mt-1">
            Nome + telefone + endereço (bem estilo secretaria).
          </p>
        </Link>

        <Link
          href="/relatorios/aniversariantes"
          className="bg-white rounded-3xl shadow p-6 hover:bg-gray-50"
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
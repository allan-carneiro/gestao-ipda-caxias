"use client";

import AuthGuard from "@/app/components/AuthGuard";
import Link from "next/link";

export default function RegistroPage() {
  return (
    <AuthGuard>
      <div className="p-6 space-y-4">
        <div>
          <h1 className="text-2xl font-semibold">Registro</h1>
          <p className="text-sm text-gray-600">
            Página placeholder para não quebrar o build na Vercel.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/dashboard"
            className="px-3 py-2 rounded-md bg-gray-900 text-white text-sm"
          >
            Voltar ao Dashboard
          </Link>

          <Link
            href="/santa-ceia"
            className="px-3 py-2 rounded-md border text-sm"
          >
            Ir para Santa Ceia
          </Link>

          <Link
            href="/membros"
            className="px-3 py-2 rounded-md border text-sm"
          >
            Ir para Membros
          </Link>
        </div>

        <div className="rounded-lg border p-4 text-sm text-gray-700">
          Quando você for implementar de verdade, você troca este conteúdo.
          O importante agora é ter um <code>export default</code> válido.
        </div>
      </div>
    </AuthGuard>
  );
}
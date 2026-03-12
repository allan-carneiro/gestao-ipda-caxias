"use client";

import { usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { useEffect, useMemo, useState } from "react";
import { auth } from "@/src/lib/firebase";
import { getUserRoleFromToken } from "@/src/lib/auth/getUserRole";
import { isDemo } from "@/src/lib/auth/permissions";
import type { UserRole } from "@/src/types/auth";

type Item = { href: string; label: string; icon: string };

type SidebarProps = {
  onNavigate?: (href: string) => void;
  onLogoutStart?: () => void;
};

const ITEMS: Item[] = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/membros", label: "Membros", icon: "👥" },
  { href: "/membros/novo", label: "Novo membro", icon: "➕" },
  { href: "/evangelismo", label: "Evangelismo", icon: "📖" },
  { href: "/relatorios", label: "Relatórios", icon: "📊" },
];

export default function Sidebar({ onNavigate, onLogoutStart }: SidebarProps) {
  const pathname = usePathname();

  const [loadingRole, setLoadingRole] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

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

    void loadRole();

    return () => {
      active = false;
    };
  }, []);

  const demoMode = useMemo(
    () => !loadingRole && isDemo(userRole ?? undefined),
    [loadingRole, userRole]
  );

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  async function logout() {
    onLogoutStart?.();
    await signOut(auth);
    window.location.href = "/login";
  }

  function go(href: string) {
    if (onNavigate) onNavigate(href);
    else window.location.href = href;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-lg font-extrabold text-blue-700 leading-tight">
              Gestão IPDA
            </div>
            <div className="text-sm text-gray-500">Caxias</div>
          </div>

          {demoMode ? (
            <span className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-amber-700">
              Demo
            </span>
          ) : null}
        </div>

        {demoMode ? (
          <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Ambiente demonstrativo com dados fictícios e edição desabilitada.
          </div>
        ) : null}
      </div>

      <nav className="p-3 space-y-1 flex-1">
        {ITEMS.map((it) => {
          const active = isActive(it.href);

          return (
            <button
              key={it.href}
              type="button"
              onClick={() => go(it.href)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl font-semibold transition text-left
              ${
                active
                  ? "bg-blue-600 text-white"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <span className="text-lg">{it.icon}</span>
              <span>{it.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t">
        <button
          type="button"
          onClick={logout}
          className="w-full px-4 py-2 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition"
        >
          Sair
        </button>
      </div>
    </div>
  );
}
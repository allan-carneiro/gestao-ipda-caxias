"use client";

import { usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/src/lib/firebase";

type Item = { href: string; label: string; icon: string };

type SidebarProps = {
  onNavigate?: (href: string) => void;
  onLogoutStart?: () => void;
};

const ITEMS: Item[] = [
  { href: "/dashboard", label: "Dashboard", icon: "🏠" },
  { href: "/membros", label: "Membros", icon: "👥" },
  { href: "/membros/novo", label: "Novo membro", icon: "➕" },
  { href: "/relatorios", label: "Relatórios", icon: "📊" },
];

export default function Sidebar({ onNavigate, onLogoutStart }: SidebarProps) {
  const pathname = usePathname();

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
      {/* HEADER */}
      <div className="px-5 py-5 border-b">
        <div className="text-lg font-extrabold text-blue-700 leading-tight">
          Gestão IPDA
        </div>
        <div className="text-sm text-gray-500">Caxias</div>
      </div>

      {/* NAV */}
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

      {/* FOOTER */}
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
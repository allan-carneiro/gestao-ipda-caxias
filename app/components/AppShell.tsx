"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "@/app/components/Sidebar";
import LoaderOverlay from "@/app/components/LoaderOverlay";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [loggingOut, setLoggingOut] = useState(false);
  const [navigating, setNavigating] = useState(false);

  // Drawer mobile
  const [mobileOpen, setMobileOpen] = useState(false);

  const lastPathRef = useRef(pathname);

  // Quando a rota mudar:
  // - fecha overlay de navegação
  // - fecha drawer mobile
  useEffect(() => {
    if (lastPathRef.current !== pathname) {
      lastPathRef.current = pathname;

      setMobileOpen(false);

      const t = setTimeout(() => setNavigating(false), 180);
      return () => clearTimeout(t);
    }
  }, [pathname]);

  // Trava o scroll do body quando o drawer estiver aberto
  useEffect(() => {
    if (!mobileOpen) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  // Fechar drawer com ESC
  useEffect(() => {
    if (!mobileOpen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  // Navegação com overlay (para Sidebar usar)
  function go(href: string) {
    if (pathname === href) {
      setMobileOpen(false);
      return;
    }
    setNavigating(true);
    requestAnimationFrame(() => router.push(href));
  }

  // Logout: deixa o Sidebar executar e só nos avisa
  async function beginLogoutOverlay() {
    if (loggingOut) return;
    setLoggingOut(true);
    await sleep(16); // 1 frame pro overlay aparecer
  }

  const showOverlay = useMemo(
    () => loggingOut || navigating,
    [loggingOut, navigating]
  );

  const overlayText = loggingOut ? "Saindo..." : "Carregando...";

  return (
    <>
      <LoaderOverlay show={showOverlay} text={overlayText} />

      <div className="min-h-screen bg-gray-100">
        {/* ================= DESKTOP (>= md) ================= */}
        <div className="hidden md:flex min-h-screen">
          <aside className="w-64 shrink-0 bg-white border-r">
            <Sidebar
              onNavigate={(href: string) => go(href)}
              onLogoutStart={beginLogoutOverlay}
            />
          </aside>

          <main className="flex-1 min-w-0 p-8">{children}</main>
        </div>

        {/* ================= MOBILE (< md) ================= */}
        <div className="md:hidden min-h-screen">
          {/* Topbar */}
          <header className="sticky top-0 z-40 flex items-center gap-3 bg-white px-4 py-3 shadow-sm">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
              aria-expanded={mobileOpen}
              aria-controls="mobile-drawer"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white"
            >
              <span className="block h-0.5 w-5 bg-gray-800" />
              <span className="ml-[-20px] mt-2 block h-0.5 w-5 bg-gray-800" />
              <span className="ml-[-20px] mt-2 block h-0.5 w-5 bg-gray-800" />
            </button>

            <div className="leading-tight">
              <div className="text-sm font-semibold text-gray-900">
                Gestão IPDA — Caxias
              </div>
              <div className="text-xs text-gray-500">Painel administrativo</div>
            </div>
          </header>

          <main className="min-w-0 p-4">{children}</main>

          {/* Overlay drawer */}
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setMobileOpen(false)}
            className={[
              "fixed inset-0 z-40 bg-black/50 transition-opacity duration-200",
              mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
            ].join(" ")}
          />

          {/* Drawer */}
          <div
            id="mobile-drawer"
            className={[
              "fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-white shadow-2xl transform transition-transform duration-300",
              mobileOpen ? "translate-x-0" : "-translate-x-full",
            ].join(" ")}
            role="dialog"
            aria-modal="true"
            aria-label="Menu lateral"
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <div className="text-sm font-semibold text-gray-900">Menu</div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm"
              >
                Fechar
              </button>
            </div>

            <Sidebar
              onNavigate={(href: string) => go(href)}
              onLogoutStart={beginLogoutOverlay}
            />
          </div>
        </div>
      </div>
    </>
  );
}
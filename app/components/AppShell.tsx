"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import Sidebar from "@/app/components/Sidebar";
import LoaderOverlay from "@/app/components/LoaderOverlay";
import { getUserRoleFromToken } from "@/src/lib/auth/getUserRole";
import { isDemo } from "@/src/lib/auth/permissions";
import type { UserRole } from "@/src/types/auth";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function DemoBanner() {
  return (
    <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 shadow-sm">
      <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-wide">
            Ambiente de Demonstração
          </p>
          <p className="text-sm">
            Você está visualizando <span className="font-semibold">dados fictícios</span>.
            Alterações de cadastro, edição e escrita estão desabilitadas nesta conta.
          </p>
        </div>

        <div className="text-xs font-medium text-amber-700">
          Modo DEMO ativo
        </div>
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [loggingOut, setLoggingOut] = useState(false);
  const [navigating, setNavigating] = useState(false);

  const [mobileOpen, setMobileOpen] = useState(false);

  const [loadingRole, setLoadingRole] = useState(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  const lastPathRef = useRef(pathname);

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

  useEffect(() => {
    if (lastPathRef.current !== pathname) {
      lastPathRef.current = pathname;

      setMobileOpen(false);

      const t = setTimeout(() => setNavigating(false), 180);
      return () => clearTimeout(t);
    }
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMobileOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  function go(href: string) {
    if (pathname === href) {
      setMobileOpen(false);
      return;
    }
    setNavigating(true);
    requestAnimationFrame(() => router.push(href));
  }

  async function beginLogoutOverlay() {
    if (loggingOut) return;
    setLoggingOut(true);
    await sleep(16);
  }

  const showOverlay = useMemo(
    () => loggingOut || navigating,
    [loggingOut, navigating]
  );

  const overlayText = loggingOut ? "Saindo..." : "Carregando...";
  const demoMode = useMemo(
    () => !loadingRole && isDemo(userRole ?? undefined),
    [loadingRole, userRole]
  );

  return (
    <>
      <LoaderOverlay show={showOverlay} text={overlayText} />

      <div className="min-h-screen bg-gray-100">
        <div className="hidden md:flex min-h-screen">
          <aside className="w-64 shrink-0 bg-white border-r">
            <Sidebar
              onNavigate={(href: string) => go(href)}
              onLogoutStart={beginLogoutOverlay}
            />
          </aside>

          <main className="flex-1 min-w-0 p-8">
            {demoMode ? <DemoBanner /> : null}
            {children}
          </main>
        </div>

        <div className="md:hidden min-h-screen">
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

          <main className="min-w-0 p-4">
            {demoMode ? <DemoBanner /> : null}
            {children}
          </main>

          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setMobileOpen(false)}
            className={[
              "fixed inset-0 z-40 bg-black/50 transition-opacity duration-200",
              mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
            ].join(" ")}
          />

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
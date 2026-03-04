"use client";

import AppBackground from "@/app/components/AppBackground";
import LoaderOverlay from "@/app/components/LoaderOverlay";
import React, { useEffect, useMemo, useState } from "react";
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "../../../src/lib/firebase";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [mounted, setMounted] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPass, setShowPass] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loadingReset, setLoadingReset] = useState(false);

  const loading = loadingLogin || loadingReset;

  useEffect(() => {
    setMounted(true);
  }, []);

  function clearMsgs() {
    setError("");
    setSuccess("");
  }

  const emailTrim = useMemo(() => email.trim(), [email]);

  const canSubmit = useMemo(() => {
    return !loading && !!emailTrim && !!password;
  }, [loading, emailTrim, password]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    clearMsgs();

    if (!emailTrim) {
      setError("Digite seu e-mail.");
      return;
    }
    if (!password) {
      setError("Digite sua senha.");
      return;
    }

    try {
      setLoadingLogin(true);
      await signInWithEmailAndPassword(auth, emailTrim, password);
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      setError("E-mail ou senha inválidos.");
    } finally {
      setLoadingLogin(false);
    }
  };

  const handleResetSenha = async () => {
    if (loading) return;

    clearMsgs();

    if (!emailTrim) {
      setError("Digite seu e-mail para receber o link de redefinição.");
      return;
    }

    try {
      setLoadingReset(true);
      await sendPasswordResetEmail(auth, emailTrim);
      setSuccess(
        "Link de redefinição enviado. Verifique seu e-mail (e a caixa de spam)."
      );
    } catch (err) {
      console.error(err);
      setError(
        "Não foi possível enviar o link. Verifique o e-mail e tente novamente."
      );
    } finally {
      setLoadingReset(false);
    }
  };

  return (
    <>
      <AppBackground />

      <main className="min-h-screen flex items-center justify-center px-4 py-10">
        <form
          onSubmit={handleLogin}
          aria-busy={loading}
          className={[
            "w-full max-w-md rounded-3xl bg-white/10 backdrop-blur-xl border border-white/15 shadow-2xl p-6",
            "transition duration-700 ease-out will-change-transform",
            mounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
          ].join(" ")}
        >
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Login
            </h1>
            <p className="text-white/80 text-sm mt-1">
              Igreja Pentecostal Deus É Amor
            </p>
          </div>

          {/* Mensagens com aria-live (acessibilidade) */}
          <div aria-live="polite" aria-atomic="true" className="mb-4 space-y-3">
            {error ? (
              <p className="text-red-100 bg-red-500/20 border border-red-400/30 rounded-xl px-3 py-2">
                {error}
              </p>
            ) : null}

            {success ? (
              <p className="text-emerald-100 bg-emerald-500/15 border border-emerald-400/30 rounded-xl px-3 py-2">
                {success}
              </p>
            ) : null}
          </div>

          <label className="block text-white/80 text-sm mb-1" htmlFor="email">
            E-mail
          </label>
          <div className="group relative mb-4">
            <input
              id="email"
              type="email"
              placeholder="seuemail@exemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={[
                "w-full p-3 rounded-xl bg-white/90 border border-white/30 outline-none",
                "transition duration-200",
                "focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:border-white/40",
                "disabled:opacity-80 disabled:cursor-not-allowed",
                "group-hover:shadow-sm",
              ].join(" ")}
              autoComplete="email"
              inputMode="email"
              disabled={loading}
              required
            />

            {/* brilho sutil no foco */}
            <span
              aria-hidden="true"
              className={[
                "pointer-events-none absolute -inset-0.5 rounded-2xl opacity-0 blur-md transition duration-300",
                "group-focus-within:opacity-100",
              ].join(" ")}
              style={{
                background:
                  "radial-gradient(60% 60% at 50% 50%, rgba(147,197,253,0.35), transparent 70%)",
              }}
            />
          </div>

          <label className="block text-white/80 text-sm mb-1" htmlFor="password">
            Senha
          </label>
          <div className="group relative mb-3">
            <input
              id="password"
              type={showPass ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={[
                "w-full p-3 pr-12 rounded-xl bg-white/90 border border-white/30 outline-none",
                "transition duration-200",
                "focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:border-white/40",
                "disabled:opacity-80 disabled:cursor-not-allowed",
                "group-hover:shadow-sm",
              ].join(" ")}
              autoComplete="current-password"
              disabled={loading}
              required
            />

            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              disabled={loading}
              className={[
                "absolute right-2 top-1/2 -translate-y-1/2",
                "px-2 py-1 rounded-lg text-xs font-medium",
                "text-slate-700/80 bg-white/70 border border-white/40",
                "transition",
                "hover:bg-white/90 hover:text-slate-900",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300",
                "disabled:opacity-60 disabled:cursor-not-allowed",
              ].join(" ")}
              aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPass ? "Ocultar" : "Mostrar"}
            </button>

            <span
              aria-hidden="true"
              className={[
                "pointer-events-none absolute -inset-0.5 rounded-2xl opacity-0 blur-md transition duration-300",
                "group-focus-within:opacity-100",
              ].join(" ")}
              style={{
                background:
                  "radial-gradient(60% 60% at 50% 50%, rgba(147,197,253,0.35), transparent 70%)",
              }}
            />
          </div>

          <div className="flex items-center justify-between mb-5">
            <button
              type="button"
              onClick={handleResetSenha}
              disabled={loading}
              className={[
                "text-sm text-white/80 underline underline-offset-4 transition",
                "hover:text-white",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:rounded-lg",
                loading ? "opacity-60 cursor-not-allowed" : "",
              ].join(" ")}
            >
              {loadingReset ? "Enviando link..." : "Esqueci minha senha"}
            </button>

            <span className="text-xs text-white/60" aria-live="polite">
              {loadingLogin ? "Autenticando..." : ""}
            </span>
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className={[
              "relative w-full rounded-2xl font-semibold py-3",
              "text-white bg-blue-600",
              "transition duration-200",
              "hover:bg-blue-700 active:scale-[0.99]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent",
              "disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:bg-blue-600",
              "overflow-hidden",
            ].join(" ")}
          >
            {/* glow premium */}
            <span
              aria-hidden="true"
              className={[
                "pointer-events-none absolute inset-0 opacity-0 transition duration-300",
                "hover:opacity-100",
                loading ? "opacity-0" : "",
              ].join(" ")}
              style={{
                background:
                  "radial-gradient(70% 120% at 50% 0%, rgba(255,255,255,0.35), transparent 60%)",
              }}
            />

            <span className="relative inline-flex items-center justify-center gap-2">
              {loadingLogin ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      stroke="currentColor"
                      strokeWidth="3"
                      opacity="0.25"
                    />
                    <path
                      d="M21 12a9 9 0 0 0-9-9"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </span>
          </button>

          <p className="mt-5 text-center text-xs text-white/60">
            Ao entrar, você concorda com o uso do sistema conforme as permissões
            do seu perfil.
          </p>
        </form>
      </main>

      <LoaderOverlay show={loading} />
    </>
  );
}
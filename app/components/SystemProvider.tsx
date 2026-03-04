"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ToastProvider } from "@/app/components/ToastProvider";

/* =========================================================
   SYSTEM PROVIDER (Enterprise)
   - Toast: já vem do seu ToastProvider (não muda)
   - Confirm: useConfirm()
   - Modal: useModal()
   - Loading overlay: useLoading()
========================================================= */

/* ---------------------------
   Loading
---------------------------- */

type LoadingState = {
  open: boolean;
  title?: string;
  message?: string;
};

type LoadingCtx = {
  showLoading: (opts?: { title?: string; message?: string }) => void;
  hideLoading: () => void;
  withLoading: <T>(
    fn: () => Promise<T>,
    opts?: { title?: string; message?: string }
  ) => Promise<T>;
};

const LoadingContext = createContext<LoadingCtx | null>(null);

export function useLoading() {
  const ctx = useContext(LoadingContext);
  if (!ctx) throw new Error("useLoading precisa estar dentro de SystemProvider");
  return ctx;
}

/* ---------------------------
   Confirm
---------------------------- */

type ConfirmOptions = {
  title?: string;
  message?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "default";
};

type ConfirmRequest = {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmText: string;
  cancelText: string;
  variant: "danger" | "default";
};

type ConfirmCtx = {
  confirm: (message: ReactNode, opts?: ConfirmOptions) => Promise<boolean>;
};

const ConfirmContext = createContext<ConfirmCtx | null>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm precisa estar dentro de SystemProvider");
  return ctx;
}

/* ---------------------------
   Modal genérico
---------------------------- */

type ModalOpenOptions = {
  title?: string;
  maxWidthClass?: string; // ex: "max-w-2xl"
  closeOnBackdrop?: boolean; // default true
};

type ModalState = {
  open: boolean;
  title?: string;
  content?: ReactNode;
  maxWidthClass: string;
  closeOnBackdrop: boolean;
};

type ModalCtx = {
  openModal: (content: ReactNode, opts?: ModalOpenOptions) => void;
  closeModal: () => void;
  isOpen: boolean;
};

const ModalContext = createContext<ModalCtx | null>(null);

export function useModal() {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModal precisa estar dentro de SystemProvider");
  return ctx;
}

/* ---------------------------
   Provider principal
---------------------------- */

export default function SystemProvider({ children }: { children: ReactNode }) {
  // Loading
  const [loading, setLoading] = useState<LoadingState>({ open: false });

  const showLoading = useCallback(
    (opts?: { title?: string; message?: string }) => {
      setLoading({ open: true, title: opts?.title, message: opts?.message });
    },
    []
  );

  const hideLoading = useCallback(() => {
    setLoading({ open: false, title: undefined, message: undefined });
  }, []);

  const withLoading = useCallback(
    async <T,>(
      fn: () => Promise<T>,
      opts?: { title?: string; message?: string }
    ) => {
      showLoading(opts);
      try {
        return await fn();
      } finally {
        hideLoading();
      }
    },
    [showLoading, hideLoading]
  );

  const loadingCtx = useMemo<LoadingCtx>(
    () => ({ showLoading, hideLoading, withLoading }),
    [showLoading, hideLoading, withLoading]
  );

  // Confirm
  const resolverRef = useRef<((v: boolean) => void) | null>(null);
  const [confirmReq, setConfirmReq] = useState<ConfirmRequest>({
    open: false,
    title: "Confirmar",
    message: "Tem certeza?",
    confirmText: "Confirmar",
    cancelText: "Cancelar",
    variant: "default",
  });

  const confirm = useCallback(
    (message: ReactNode, opts?: ConfirmOptions) => {
      return new Promise<boolean>((resolve) => {
        resolverRef.current = resolve;

        setConfirmReq({
          open: true,
          title: opts?.title ?? "Confirmar",
          message,
          confirmText: opts?.confirmText ?? "Confirmar",
          cancelText: opts?.cancelText ?? "Cancelar",
          variant: opts?.variant ?? "default",
        });
      });
    },
    []
  );

  const closeConfirm = useCallback((value: boolean) => {
    setConfirmReq((p) => ({ ...p, open: false }));
    const r = resolverRef.current;
    resolverRef.current = null;
    r?.(value);
  }, []);

  const confirmCtx = useMemo<ConfirmCtx>(() => ({ confirm }), [confirm]);

  // Modal genérico
  const [modal, setModal] = useState<ModalState>({
    open: false,
    title: undefined,
    content: undefined,
    maxWidthClass: "max-w-2xl",
    closeOnBackdrop: true,
  });

  const openModal = useCallback((content: ReactNode, opts?: ModalOpenOptions) => {
    setModal({
      open: true,
      title: opts?.title,
      content,
      maxWidthClass: opts?.maxWidthClass ?? "max-w-2xl",
      closeOnBackdrop: opts?.closeOnBackdrop ?? true,
    });
  }, []);

  const closeModal = useCallback(() => {
    setModal((p) => ({ ...p, open: false, content: undefined, title: p.title }));
  }, []);

  const modalCtx = useMemo<ModalCtx>(
    () => ({
      openModal,
      closeModal,
      isOpen: modal.open,
    }),
    [openModal, closeModal, modal.open]
  );

  return (
    <ToastProvider>
      <LoadingContext.Provider value={loadingCtx}>
        <ConfirmContext.Provider value={confirmCtx}>
          <ModalContext.Provider value={modalCtx}>
            {children}

            {/* HOSTS globais */}
            <LoadingOverlay open={loading.open} title={loading.title} message={loading.message} />
            <ConfirmDialog
              open={confirmReq.open}
              title={confirmReq.title}
              message={confirmReq.message}
              confirmText={confirmReq.confirmText}
              cancelText={confirmReq.cancelText}
              variant={confirmReq.variant}
              onConfirm={() => closeConfirm(true)}
              onCancel={() => closeConfirm(false)}
            />
            <GenericModal
              open={modal.open}
              title={modal.title}
              maxWidthClass={modal.maxWidthClass}
              closeOnBackdrop={modal.closeOnBackdrop}
              onClose={closeModal}
            >
              {modal.content}
            </GenericModal>
          </ModalContext.Provider>
        </ConfirmContext.Provider>
      </LoadingContext.Provider>
    </ToastProvider>
  );
}

/* =========================================================
   UI COMPONENTS (Hosts)
========================================================= */

function LoadingOverlay({
  open,
  title,
  message,
}: {
  open: boolean;
  title?: string;
  message?: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[1px]" />
      <div className="relative w-[92vw] max-w-sm rounded-2xl bg-white shadow-2xl border p-5">
        <div className="flex items-center gap-3">
          <Spinner />
          <div className="min-w-0">
            <div className="font-semibold text-gray-900 truncate">
              {title ?? "Aguarde…"}
            </div>
            <div className="text-sm text-gray-600">
              {message ?? "Processando sua solicitação."}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfirmDialog({
  open,
  title,
  message,
  confirmText,
  cancelText,
  variant,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmText: string;
  cancelText: string;
  variant: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  const confirmBtn =
    variant === "danger"
      ? "bg-red-600 hover:bg-red-700 text-white"
      : "bg-blue-600 hover:bg-blue-700 text-white";

  return (
    <div className="fixed inset-0 z-[110]">
      <button
        type="button"
        aria-label="Fechar"
        onClick={onCancel}
        className="absolute inset-0 bg-black/40 animate-[fadeIn_160ms_ease-out]"
      />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border overflow-hidden animate-[popIn_180ms_ease-out]">
          <div className="px-5 py-4 border-b">
            <div className="font-semibold text-gray-900">{title}</div>
          </div>

          <div className="px-5 py-4 text-sm text-gray-700">{message}</div>

          <div className="px-5 py-4 border-t flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 rounded-xl bg-white border text-sm font-semibold hover:bg-gray-50"
            >
              {cancelText}
            </button>

            <button
              type="button"
              onClick={onConfirm}
              className={`px-4 py-2 rounded-xl text-sm font-semibold ${confirmBtn}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes popIn {
          from { opacity: 0; transform: translateY(6px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

function GenericModal({
  open,
  title,
  children,
  onClose,
  maxWidthClass,
  closeOnBackdrop,
}: {
  open: boolean;
  title?: string;
  children?: ReactNode;
  onClose: () => void;
  maxWidthClass: string;
  closeOnBackdrop: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[105]">
      <button
        type="button"
        aria-label="Fechar"
        onClick={() => (closeOnBackdrop ? onClose() : null)}
        className="absolute inset-0 bg-black/40 animate-[fadeIn_160ms_ease-out]"
      />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className={[
            "w-full rounded-2xl bg-white shadow-2xl border overflow-hidden animate-[popIn_180ms_ease-out]",
            maxWidthClass,
          ].join(" ")}
        >
          <div className="flex items-center justify-between px-5 py-4 border-b">
            <div className="font-semibold text-gray-900">
              {title ?? "Detalhes"}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              ✕
            </button>
          </div>

          <div className="p-5">{children}</div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes popIn {
          from { opacity: 0; transform: translateY(6px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

function Spinner() {
  return (
    <div
      className="w-8 h-8 rounded-full border-2 border-gray-200 border-t-gray-700 animate-spin"
      aria-label="Carregando"
      title="Carregando"
    />
  );
}
"use client";

type LoaderOverlayProps = {
  show: boolean;
  text?: string;
};

export default function LoaderOverlay({
  show,
  text = "Carregando...",
}: LoaderOverlayProps) {
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-auto"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex flex-col items-center gap-4 select-none">
        {/* spinner */}
        <div className="w-14 h-14 rounded-full border-4 border-white/30 border-t-white animate-spin" />

        {/* texto */}
        <p className="text-white/90 text-sm tracking-wide">
          {text}
        </p>
      </div>
    </div>
  );
}
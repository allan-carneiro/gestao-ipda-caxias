import Image from "next/image";

type Props = {
  src?: string;
  darken?: number;
  blurPx?: number;
  brandTint?: boolean;
  variant?: "app" | "login";
};

export default function AppBackground({
  src,
  darken = 0.55,
  blurPx = 2,
  brandTint = true,
  variant = "app",
}: Props) {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {src ? (
        <div
          className="absolute inset-0 scale-[1.03]"
          style={{ filter: `blur(${blurPx}px)` }}
        >
          <Image
            src={src}
            alt=""
            fill
            className="object-cover"
            sizes="100vw"
            priority={variant === "login"}
          />
        </div>
      ) : (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900" />
          <div className="absolute inset-0 opacity-[0.65] bg-[radial-gradient(1200px_800px_at_20%_10%,rgba(30,64,175,0.35),transparent_55%)]" />
          <div className="absolute inset-0 opacity-[0.60] bg-[radial-gradient(900px_700px_at_80%_20%,rgba(212,175,55,0.18),transparent_55%)]" />
          <div className="absolute inset-0 opacity-[0.55] bg-[radial-gradient(900px_700px_at_50%_110%,rgba(59,130,246,0.16),transparent_55%)]" />
        </>
      )}

      <div
        className="absolute inset-0 bg-black"
        style={{ opacity: darken }}
      />

      {brandTint && (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-blue-900/35 via-transparent to-blue-950/45" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.14),transparent_60%)]" />
        </>
      )}

      <div className="absolute inset-0 opacity-[0.10] [background-image:radial-gradient(rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:18px_18px]" />
    </div>
  );
}
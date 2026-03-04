export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950">

      {/* Gradiente base */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900 via-slate-900 to-indigo-950" />

      {/* Blob 1 */}
      <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-blue-600/30 rounded-full blur-3xl" />

      {/* Blob 2 */}
      <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-indigo-600/30 rounded-full blur-3xl" />

      {/* Conteúdo */}
      <div className="relative z-10 w-full px-4">
        {children}
      </div>
    </div>
  );
}
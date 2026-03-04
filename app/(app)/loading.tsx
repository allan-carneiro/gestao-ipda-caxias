// app/(app)/loading.tsx
export default function LoadingApp() {
  return (
    <div className="min-h-[60vh] w-full px-4 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="h-8 w-56 rounded-xl bg-white/10 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-28 rounded-3xl bg-white/10 animate-pulse" />
          <div className="h-28 rounded-3xl bg-white/10 animate-pulse" />
          <div className="h-28 rounded-3xl bg-white/10 animate-pulse" />
        </div>
        <div className="h-64 rounded-3xl bg-white/10 animate-pulse" />
      </div>
    </div>
  );
}
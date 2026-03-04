import AuthGuard from "@/app/components/AuthGuard";
import AppShell from "@/app/components/AppShell";
import TopLoader from "@/app/components/TopLoader";
import PageTransition from "@/app/components/PageTransition";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <TopLoader />
      <AuthGuard>
        <AppShell>
          <PageTransition>{children}</PageTransition>
        </AppShell>
      </AuthGuard>
    </>
  );
}
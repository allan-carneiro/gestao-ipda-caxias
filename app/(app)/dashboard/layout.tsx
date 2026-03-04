import AuthGuard from "@/app/components/AuthGuard";
import AppBackground from "@/app/components/AppBackground";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <AppBackground variant="app" darken={0.72} brandTint />
      {children}
    </AuthGuard>
  );
}
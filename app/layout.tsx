// app/layout.tsx
import "./globals.css";
import SystemProvider from "@/app/components/SystemProvider";

export const metadata = {
  title: "Gestão Igreja",
  description: "Sistema de gestão da igreja",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="bg-gray-100 font-sans">
        <SystemProvider>{children}</SystemProvider>
      </body>
    </html>
  );
}
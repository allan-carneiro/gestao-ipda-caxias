"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/src/lib/firebase";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u ?? null);
      setLoading(false);

      if (!u) {
        router.replace("/login");
      }
    });

    return () => unsubscribe();
  }, [router]);

  // Enquanto carrega o estado de auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Carregando...
      </div>
    );
  }

  // Se não tem usuário, não monta nada (evita qualquer leitura no Firestore)
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Redirecionando...
      </div>
    );
  }

  // ✅ Aqui: AuthGuard só libera o conteúdo protegido.
  return <>{children}</>;
}
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/src/lib/firebase";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await signOut(auth);
    router.push("/login");
  }

  function item(href: string, label: string) {
    const active = pathname === href;

    return (
      <Link
        href={href}
        className={`px-4 py-2 rounded-xl font-semibold transition
        ${active
            ? "bg-blue-600 text-white"
            : "text-gray-700 hover:bg-gray-100"
          }`}
      >
        {label}
      </Link>
    );
  }

  return (
    <div className="w-full bg-white border-b shadow-sm">
      <div className="max-w-6xl mx-auto flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          {item("/", "Dashboard")}
          {item("/membros", "Membros")}
          {item("/membros/novo", "Novo membro")}
        </div>

        <button
          onClick={logout}
          className="px-4 py-2 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700"
        >
          Sair
        </button>
      </div>
    </div>
  );
}

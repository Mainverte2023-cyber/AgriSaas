"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { User } from "@supabase/supabase-js";

interface Props {
  user: User;
  profil: { nom_complet?: string; role?: string } | null;
}

export default function TopBar({ user, profil }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const name = profil?.nom_complet ?? user.email ?? "Utilisateur";
  const initials = name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <header className="flex items-center justify-between px-6 h-14 bg-white border-b border-slate-200 shrink-0">
      {/* Titre de page (dynamique côté client) */}
      <div className="flex items-center gap-2">
        <span className="text-slate-300 text-sm">🌿</span>
        <span className="text-xs text-slate-400 font-medium">AgriSaaS Platform</span>
      </div>

      <div className="flex items-center gap-3">
        {/* Notifications */}
        <button className="relative p-2 rounded-xl hover:bg-slate-50 text-slate-500 transition-colors">
          <span className="text-lg">🔔</span>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>

        {/* Avatar / menu */}
        <div className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-slate-50 transition-colors border border-slate-200"
          >
            <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {initials}
            </div>
            <span className="text-sm font-medium text-slate-700 hidden sm:block max-w-32 truncate">{name}</span>
            <span className="text-slate-400 text-xs">▾</span>
          </button>

          {open && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50 animate-fade-up">
              <div className="px-4 py-2 border-b border-slate-100 mb-1">
                <div className="text-sm font-semibold text-slate-800 truncate">{name}</div>
                <div className="text-xs text-slate-400 capitalize">{profil?.role?.replace("_", " ")}</div>
              </div>
              <button className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                Mon profil
              </button>
              <button className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors">
                Paramètres
              </button>
              <div className="border-t border-slate-100 mt-1 pt-1">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  🚪 Se déconnecter
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

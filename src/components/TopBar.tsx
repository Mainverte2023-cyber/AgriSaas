"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import type { User } from "@supabase/supabase-js";

interface Props {
  user: User;
  profil: { nom_complet?: string; role?: string; organisation_id?: string } | null;
}

export default function TopBar({ user, profil }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [menuOpen, setMenuOpen]   = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifs, setNotifs]       = useState<any[]>([]);
  const [unread, setUnread]       = useState(0);
  const notifRef = useRef<HTMLDivElement>(null);
  const menuRef  = useRef<HTMLDivElement>(null);

  const orgId = (profil as any)?.organisation_id;

  // Charger les notifications
  useEffect(() => {
    if (!orgId) return;
    chargerNotifs();

    // Temps réel
    const ch = supabase.channel("notifs_" + user.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `destinataire_id=eq.${user.id}` },
        () => chargerNotifs()
      ).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [orgId]);

  async function chargerNotifs() {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("destinataire_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) {
      setNotifs(data);
      setUnread(data.filter((n: any) => !n.lu).length);
    }
  }

  async function marquerLu(id: string) {
    await supabase.from("notifications").update({ lu: true }).eq("id", id);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, lu: true } : n));
    setUnread(prev => Math.max(0, prev - 1));
  }

  async function toutMarquerLu() {
    await supabase.from("notifications").update({ lu: true }).eq("destinataire_id", user.id).eq("lu", false);
    setNotifs(prev => prev.map(n => ({ ...n, lu: true })));
    setUnread(0);
  }

  // Fermer au clic extérieur
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (menuRef.current  && !menuRef.current.contains(e.target as Node))  setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const name     = profil?.nom_complet ?? user.email ?? "Utilisateur";
  const initials = name.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  const notifIcons: Record<string, string> = {
    diagnostic: "🔬", message: "💬", alerte: "⚠️",
    paiement: "💳", abonnement: "📅", info: "ℹ️",
  };

  return (
    <header className="flex items-center justify-between px-6 h-14 bg-white border-b border-slate-200 shrink-0 z-40">
      <div className="flex items-center gap-2">
        <span className="text-slate-300 text-sm">🌿</span>
        <span className="text-xs text-slate-400 font-medium">AgriSaaS Platform</span>
      </div>

      <div className="flex items-center gap-2">

        {/* 🔔 Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setNotifOpen(o => !o); setMenuOpen(false); }}
            className="relative p-2 rounded-xl hover:bg-slate-50 text-slate-500 transition-colors"
          >
            <span className="text-lg">🔔</span>
            {unread > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white font-bold flex items-center justify-center">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 z-50 animate-fade-up overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <span className="font-bold text-slate-800 text-sm">🔔 Notifications</span>
                {unread > 0 && (
                  <button onClick={toutMarquerLu} className="text-xs text-green-600 hover:underline font-medium">
                    Tout marquer lu
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifs.length === 0 ? (
                  <div className="text-center py-10 text-slate-400 text-sm">
                    <div className="text-3xl mb-2">🔔</div>
                    Aucune notification
                  </div>
                ) : notifs.map(n => (
                  <div
                    key={n.id}
                    onClick={() => marquerLu(n.id)}
                    className={`flex gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-50 ${!n.lu ? "bg-green-50/50" : ""}`}
                  >
                    <span className="text-xl shrink-0 mt-0.5">{notifIcons[n.type] ?? "ℹ️"}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm leading-tight ${!n.lu ? "font-semibold text-slate-800" : "text-slate-600"}`}>
                        {n.titre}
                      </div>
                      {n.message && <div className="text-xs text-slate-400 mt-0.5 line-clamp-2">{n.message}</div>}
                      <div className="text-[10px] text-slate-400 mt-1">
                        {new Date(n.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    {!n.lu && <div className="w-2 h-2 bg-green-500 rounded-full shrink-0 mt-2" />}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Avatar / menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => { setMenuOpen(o => !o); setNotifOpen(false); }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-slate-50 transition-colors border border-slate-200"
          >
            <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {initials}
            </div>
            <span className="text-sm font-medium text-slate-700 hidden sm:block max-w-32 truncate">{name}</span>
            <span className="text-slate-400 text-xs">▾</span>
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-fade-up">
              <div className="px-4 py-2 border-b border-slate-100 mb-1">
                <div className="text-sm font-semibold text-slate-800 truncate">{name}</div>
                <div className="text-xs text-slate-400 capitalize">{profil?.role?.replace(/_/g, " ")}</div>
              </div>
              <a href="/dashboard/abonnement" className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                💳 Mon abonnement
              </a>
              <a href="/dashboard/messages" className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2">
                💬 Messagerie
              </a>
              <div className="border-t border-slate-100 mt-1 pt-1">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
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

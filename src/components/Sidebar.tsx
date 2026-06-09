"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type Role = "super_admin" | "admin_client" | "client" | "agent_terrain" | "comptable" | "technicien" | "observateur";

interface NavItem {
  href: string;
  icon: string;
  label: string;
  roles: Role[];
  badge?: string;
}

const NAV: NavItem[] = [
  { href: "/dashboard",              icon: "🏠", label: "Tableau de bord",   roles: ["super_admin","admin_client","client","agent_terrain","comptable","technicien","observateur"] },
  { href: "/dashboard/champs",       icon: "🗺️", label: "Mes champs",        roles: ["super_admin","admin_client","client","agent_terrain","technicien","observateur"] },
  { href: "/dashboard/cultures",     icon: "🌾", label: "Cultures",          roles: ["super_admin","admin_client","client","agent_terrain","technicien","observateur"] },
  { href: "/dashboard/intrants",     icon: "🧪", label: "Intrants",          roles: ["super_admin","admin_client","client","agent_terrain","technicien"] },
  { href: "/dashboard/diagnostic",   icon: "🔬", label: "Diagnostic",        roles: ["super_admin","admin_client","client","agent_terrain","technicien","observateur"] },
  { href: "/dashboard/irrigation",   icon: "💧", label: "Irrigation",        roles: ["super_admin","admin_client","agent_terrain","technicien"] },
  { href: "/dashboard/agents",       icon: "👷", label: "Agents terrain",    roles: ["super_admin","admin_client"] },
  { href: "/dashboard/carte",        icon: "🗺️", label: "Carte",             roles: ["super_admin","admin_client","client","agent_terrain","technicien","observateur"] },
  { href: "/dashboard/comptabilite",  icon: "💰", label: "Comptabilité",      roles: ["super_admin","admin_client","client","comptable"] },
  { href: "/dashboard/messages",     icon: "💬", label: "Messagerie",        roles: ["super_admin","admin_client","client","agent_terrain","technicien","comptable"] },
  { href: "/dashboard/rapports",     icon: "📊", label: "Rapports",          roles: ["super_admin","admin_client","comptable","observateur"] },
  { href: "/dashboard/abonnement",   icon: "💳", label: "Abonnement",        roles: ["super_admin","admin_client"] },
  { href: "/dashboard/admin",        icon: "⚙️",  label: "Administration",   roles: ["super_admin"] },
];

export default function Sidebar({ role, orgNom }: { role: Role; orgNom: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const visible = NAV.filter((n) => n.roles.includes(role));

  return (
    <aside
      className="flex flex-col bg-white border-r border-slate-200 transition-all duration-300 shrink-0"
      style={{ width: collapsed ? 64 : 240 }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-100">
        <div className="w-9 h-9 shrink-0 rounded-xl bg-green-600 flex items-center justify-center text-white text-lg shadow-sm">
          🌿
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div className="font-extrabold text-slate-800 text-[15px] leading-tight">AgriSaaS</div>
            <div className="text-[11px] text-slate-400 truncate">{orgNom || "Plateforme agricole"}</div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-0.5 overflow-y-auto">
        {visible.map((item) => {
          const active = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-[13.5px] transition-all group
                ${active
                  ? "bg-green-50 text-green-700 shadow-sm"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                }`}
            >
              <span className="text-lg shrink-0">{item.icon}</span>
              {!collapsed && (
                <span className="truncate">{item.label}</span>
              )}
              {!collapsed && item.badge && (
                <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
              {!collapsed && active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-green-600 shrink-0" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Rôle utilisateur + toggle */}
      <div className="p-3 border-t border-slate-100 space-y-2">
        {!collapsed && (
          <div className="px-2 py-1.5 bg-green-50 rounded-lg">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Rôle</div>
            <div className="text-[12px] text-green-700 font-bold mt-0.5 capitalize">{role.replace("_", " ")}</div>
          </div>
        )}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="w-full flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
          title={collapsed ? "Agrandir" : "Réduire"}
        >
          {collapsed ? "▶" : "◀"}
        </button>
      </div>
    </aside>
  );
}

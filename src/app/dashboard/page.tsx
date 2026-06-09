export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";

// Helpers
function fmtMoney(v: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(v)) + " FCFA";
}

async function getStats(orgId: string, supabase: Awaited<ReturnType<typeof createClient>>) {
  const [
    { count: nbChamps },
    { count: nbCulturesActives },
    { data: depenses },
    { data: alertes },
    { data: travaux },
    { data: intrants },
  ] = await Promise.all([
    supabase.from("champs").select("*", { count: "exact", head: true }).eq("organisation_id", orgId),
    supabase.from("cultures").select("*", { count: "exact", head: true }).eq("organisation_id", orgId).eq("statut", "en_cours"),
    supabase.from("depenses").select("montant").eq("organisation_id", orgId).gte("date", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]),
    supabase.from("alertes").select("*").eq("organisation_id", orgId).eq("lue", false).order("created_at", { ascending: false }).limit(5),
    supabase.from("travaux_culturaux").select("*, cultures(type_culture), profils(nom_complet)").eq("organisation_id", orgId).order("created_at", { ascending: false }).limit(6),
    supabase.from("applications_intrants").select("produit, created_at, cultures(type_culture)").eq("organisation_id", orgId).order("created_at", { ascending: false }).limit(5),
  ]);

  const totalDepenses = (depenses ?? []).reduce((s: number, d: any) => s + (d.montant ?? 0), 0);

  return { nbChamps: nbChamps ?? 0, nbCulturesActives: nbCulturesActives ?? 0, totalDepenses, alertes: alertes ?? [], travaux: travaux ?? [], intrants: intrants ?? [] };
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profil } = await supabase.from("profils").select("*, organisations(id, nom)").eq("id", user!.id).single();

  const orgId = (profil as any)?.organisations?.id;
  const stats = orgId ? await getStats(orgId, supabase) : null;

  const niveauBadge: Record<string, string> = { urgent: "badge-red", attention: "badge-amber", info: "badge-blue" };
  const statutBadge: Record<string, string> = { planifie: "badge-slate", realise: "badge-green", annule: "badge-red" };

  return (
    <div className="animate-fade-up space-y-8 max-w-7xl">
      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">
            Bonjour, {(profil as any)?.nom_complet?.split(" ")[0] ?? "Bienvenue"} 👋
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            {(profil as any)?.organisations?.nom && (
              <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                {(profil as any).organisations.nom}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/dashboard/champs" className="btn-primary text-sm px-4 py-2">
            + Nouveau champ
          </a>
          <a href="/dashboard/rapports" className="btn-secondary text-sm px-4 py-2">
            📊 Rapports
          </a>
        </div>
      </div>

      {/* Alertes actives */}
      {stats && stats.alertes.length > 0 && (
        <div className="space-y-2">
          {stats.alertes.slice(0, 2).map((a: any) => (
            <div key={a.id} className={a.niveau === "urgent" ? "alert-urgent" : "alert-warn"}>
              <div className="flex items-center gap-2">
                <span>{a.niveau === "urgent" ? "🚨" : "⚠️"}</span>
                <strong className="text-sm">{a.titre}</strong>
                {a.message && <span className="text-sm opacity-80 ml-1">— {a.message}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Statistiques */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: "🗺️", label: "Champs enregistrés",  value: stats?.nbChamps ?? 0,               color: "text-blue-600",  bg: "bg-blue-50" },
          { icon: "🌾", label: "Cultures actives",     value: stats?.nbCulturesActives ?? 0,       color: "text-green-600", bg: "bg-green-50" },
          { icon: "💰", label: "Dépenses du mois",     value: stats ? fmtMoney(stats.totalDepenses) : "—", color: "text-amber-600",  bg: "bg-amber-50" },
          { icon: "🔔", label: "Alertes non lues",     value: stats?.alertes.length ?? 0,          color: "text-red-600",   bg: "bg-red-50" },
        ].map(({ icon, label, value, color, bg }) => (
          <div key={label} className="stat-card">
            <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center text-xl mb-3`}>
              {icon}
            </div>
            <div className={`text-2xl font-extrabold ${color} leading-none`}>{value}</div>
            <div className="text-xs text-slate-500 font-medium mt-1.5 leading-snug">{label}</div>
          </div>
        ))}
      </div>

      {/* Grille principale */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Activités récentes */}
        <div className="section-card">
          <div className="section-header">
            <h2 className="font-bold text-slate-800 text-[15px]">📋 Travaux récents</h2>
            <a href="/dashboard/cultures" className="text-xs text-green-600 hover:underline font-medium">Voir tout →</a>
          </div>
          <div className="divide-y divide-slate-50">
            {stats && stats.travaux.length > 0 ? stats.travaux.map((t: any) => (
              <div key={t.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-700 truncate">{t.type_travail}</div>
                  <div className="text-xs text-slate-400 truncate">
                    {t.cultures?.type_culture} {t.profils?.nom_complet ? `· ${t.profils.nom_complet}` : ""}
                  </div>
                </div>
                <span className={`badge ${statutBadge[t.statut] ?? "badge-slate"} shrink-0`}>
                  {t.statut}
                </span>
              </div>
            )) : (
              <div className="px-5 py-8 text-center text-slate-400 text-sm">Aucun travail enregistré pour l'instant</div>
            )}
          </div>
        </div>

        {/* Intrants récents */}
        <div className="section-card">
          <div className="section-header">
            <h2 className="font-bold text-slate-800 text-[15px]">🧪 Intrants récents</h2>
            <a href="/dashboard/intrants" className="text-xs text-green-600 hover:underline font-medium">Voir tout →</a>
          </div>
          <div className="divide-y divide-slate-50">
            {stats && stats.intrants.length > 0 ? stats.intrants.map((i: any) => (
              <div key={i.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-700 truncate">{i.produit}</div>
                  <div className="text-xs text-slate-400 truncate">
                    {i.cultures?.type_culture} · {new Date(i.created_at).toLocaleDateString("fr-FR")}
                  </div>
                </div>
                <span className="text-lg">🧪</span>
              </div>
            )) : (
              <div className="px-5 py-8 text-center text-slate-400 text-sm">Aucun intrant enregistré pour l'instant</div>
            )}
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="section-card section-body">
        <h2 className="font-bold text-slate-800 text-[15px] mb-4">⚡ Actions rapides</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { href: "/dashboard/champs",     icon: "🗺️", label: "Ajouter un champ" },
            { href: "/dashboard/cultures",   icon: "🌾", label: "Nouvelle culture" },
            { href: "/dashboard/intrants",   icon: "🧪", label: "Saisir un intrant" },
            { href: "/dashboard/irrigation", icon: "💧", label: "Relevé irrigation" },
            { href: "/dashboard/agents",     icon: "👷", label: "Rapport terrain" },
            { href: "/dashboard/rapports",   icon: "📊", label: "Générer rapport" },
          ].map(({ href, icon, label }) => (
            <a
              key={href}
              href={href}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 hover:border-green-300 hover:bg-green-50 transition-all group text-center"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform">{icon}</span>
              <span className="text-xs font-medium text-slate-600 group-hover:text-green-700 leading-tight">{label}</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

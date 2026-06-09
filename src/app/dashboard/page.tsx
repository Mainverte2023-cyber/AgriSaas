export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

function fmtMoney(v: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(v)) + " FCFA";
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profil } = await supabase
    .from("profils")
    .select("*, organisations(id, nom, statut)")
    .eq("id", user!.id)
    .single();

  const role  = (profil as any)?.role;
  const orgId = (profil as any)?.organisations?.id;
  const orgNom = (profil as any)?.organisations?.nom;

  // Toujours filtrer par organisation de l'utilisateur connecté
  // Le super_admin voit ses propres stats — pour voir un client, il va dans Administration
  const [
    { count: nbChamps },
    { count: nbCulturesActives },
    { data: intrantsRecents },
    { data: rapportsRecents },
    { data: diagnosticsEnAttente },
    { data: ventes },
    { data: intrantsMois },
  ] = await Promise.all([
    supabase.from("champs").select("*", { count: "exact", head: true }).eq("organisation_id", orgId),
    supabase.from("cultures").select("*", { count: "exact", head: true }).eq("organisation_id", orgId).eq("statut", "en_cours"),
    supabase.from("applications_intrants").select("produit, created_at, cout, cultures(type_culture)").eq("organisation_id", orgId).order("created_at", { ascending: false }).limit(5),
    supabase.from("rapports_terrain").select("titre, created_at, profils(nom_complet)").eq("organisation_id", orgId).order("created_at", { ascending: false }).limit(5),
    supabase.from("diagnostics").select("*", { count: "exact", head: true }).eq("organisation_id", orgId).eq("statut", "en_attente"),
    supabase.from("ventes").select("montant_total").eq("organisation_id", orgId).gte("date_vente", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]),
    supabase.from("applications_intrants").select("cout").eq("organisation_id", orgId).gte("date_application", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]),
  ]);

  const totalVentes   = (ventes ?? []).reduce((s: number, v: any) => s + (v.montant_total ?? 0), 0);
  const totalDepenses = (intrantsMois ?? []).reduce((s: number, i: any) => s + (i.cout ?? 0), 0);
  const nbDiags       = (diagnosticsEnAttente as any)?.count ?? 0;

  // Compter les clients si super_admin
  let nbClients = 0;
  if (role === "super_admin") {
    const { count } = await supabase.from("organisations").select("*", { count: "exact", head: true });
    nbClients = count ?? 0;
  }

  return (
    <div className="animate-fade-up space-y-7 max-w-7xl">

      {/* En-tête */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">
            Bonjour, {(profil as any)?.nom_complet?.split(" ")[0] ?? "Bienvenue"} 👋
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            {orgNom && (
              <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                {orgNom}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/dashboard/champs/nouveau" className="btn-primary text-sm px-4 py-2">+ Nouveau champ</Link>
          <Link href="/dashboard/rapports" className="btn-secondary text-sm px-4 py-2">📊 Rapports</Link>
        </div>
      </div>

      {/* Bandeau super_admin — accès rapide clients */}
      {role === "super_admin" && (
        <div className="bg-gradient-to-r from-green-700 to-emerald-600 rounded-2xl p-5 text-white flex items-center justify-between gap-4 flex-wrap">
          <div>
            <div className="font-extrabold text-lg">🌿 Vue Super Admin</div>
            <div className="text-green-100 text-sm mt-0.5">
              Vous gérez <strong>{nbClients} client(s)</strong> sur la plateforme. Cliquez sur un client pour voir ses données.
            </div>
          </div>
          <Link href="/dashboard/admin" className="bg-white text-green-700 font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-green-50 transition-colors">
            👥 Voir mes clients →
          </Link>
        </div>
      )}

      {/* Alerte diagnostics en attente */}
      {nbDiags > 0 && (
        <Link href="/dashboard/diagnostic" className="alert-warn flex items-center gap-3 no-underline hover:opacity-90 transition-opacity">
          <span className="text-2xl">🔬</span>
          <div>
            <strong>{nbDiags} diagnostic(s) en attente</strong> de réponse.
            <span className="ml-2 text-sm opacity-80">Cliquez pour répondre →</span>
          </div>
        </Link>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/dashboard/champs" className="stat-card stat-blue no-underline">
          <div className="flex items-center gap-3 mb-3">
            <div className="icon-box icon-blue">🗺️</div>
            <span className="text-sm font-semibold text-blue-700">Mes champs</span>
          </div>
          <div className="text-3xl font-extrabold text-blue-800">{nbChamps ?? 0}</div>
          <div className="text-xs text-blue-600 mt-1">Parcelles enregistrées</div>
        </Link>

        <Link href="/dashboard/cultures" className="stat-card stat-green no-underline">
          <div className="flex items-center gap-3 mb-3">
            <div className="icon-box icon-green">🌾</div>
            <span className="text-sm font-semibold text-green-700">Cultures actives</span>
          </div>
          <div className="text-3xl font-extrabold text-green-800">{nbCulturesActives ?? 0}</div>
          <div className="text-xs text-green-600 mt-1">En cours ce mois</div>
        </Link>

        <Link href="/dashboard/comptabilite" className="stat-card stat-teal no-underline">
          <div className="flex items-center gap-3 mb-3">
            <div className="icon-box icon-teal">💵</div>
            <span className="text-sm font-semibold text-teal-700">Ventes ce mois</span>
          </div>
          <div className="text-2xl font-extrabold text-teal-800">{fmtMoney(totalVentes)}</div>
          <div className="text-xs text-teal-600 mt-1">Revenus enregistrés</div>
        </Link>

        <Link href="/dashboard/comptabilite" className="stat-card stat-amber no-underline">
          <div className="flex items-center gap-3 mb-3">
            <div className="icon-box icon-amber">💸</div>
            <span className="text-sm font-semibold text-amber-700">Dépenses ce mois</span>
          </div>
          <div className="text-2xl font-extrabold text-amber-800">{fmtMoney(totalDepenses)}</div>
          <div className="text-xs text-amber-600 mt-1">Intrants & traitements</div>
        </Link>
      </div>

      {/* Activité récente */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="section-card">
          <div className="section-header">
            <h2 className="font-bold text-slate-800 text-[15px]">🧪 Derniers intrants</h2>
            <Link href="/dashboard/intrants" className="text-xs text-green-600 hover:underline font-medium">Voir tout →</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {(intrantsRecents ?? []).length > 0 ? (intrantsRecents ?? []).map((i: any) => (
              <div key={i.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-700 truncate">{i.produit}</div>
                  <div className="text-xs text-slate-400">{(i.cultures as any)?.type_culture} · {new Date(i.created_at).toLocaleDateString("fr-FR")}</div>
                </div>
                {i.cout > 0 && <span className="text-xs font-bold text-red-500 shrink-0">{fmtMoney(i.cout)}</span>}
              </div>
            )) : (
              <div className="px-5 py-8 text-center text-slate-400 text-sm">Aucun intrant enregistré</div>
            )}
          </div>
        </div>

        <div className="section-card">
          <div className="section-header">
            <h2 className="font-bold text-slate-800 text-[15px]">👷 Rapports terrain récents</h2>
            <Link href="/dashboard/agents" className="text-xs text-green-600 hover:underline font-medium">Voir tout →</Link>
          </div>
          <div className="divide-y divide-slate-50">
            {(rapportsRecents ?? []).length > 0 ? (rapportsRecents ?? []).map((r: any) => (
              <div key={r.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-slate-700 truncate">{r.titre}</div>
                  <div className="text-xs text-slate-400">{(r.profils as any)?.nom_complet} · {new Date(r.created_at).toLocaleDateString("fr-FR")}</div>
                </div>
                <span className="text-lg shrink-0">📋</span>
              </div>
            )) : (
              <div className="px-5 py-8 text-center text-slate-400 text-sm">Aucun rapport terrain</div>
            )}
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="section-card section-body">
        <h2 className="font-bold text-slate-800 text-[15px] mb-4">⚡ Actions rapides</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { href: "/dashboard/champs/nouveau",   icon: "🗺️", label: "Nouveau champ" },
            { href: "/dashboard/cultures/nouvelle", icon: "🌾", label: "Nouvelle culture" },
            { href: "/dashboard/intrants/nouveau",  icon: "🧪", label: "Saisir intrant" },
            { href: "/dashboard/agents/nouveau",    icon: "👷", label: "Rapport terrain" },
            { href: "/dashboard/diagnostic",        icon: "🔬", label: "Diagnostic" },
            { href: "/dashboard/comptabilite",      icon: "💰", label: "Comptabilité" },
          ].map(({ href, icon, label }) => (
            <Link key={href} href={href} className="quick-action">
              <div className="qa-icon">{icon}</div>
              <span>{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

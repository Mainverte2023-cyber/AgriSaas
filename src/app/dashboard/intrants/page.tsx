export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";

const CAT_ICONS: Record<string, string> = {
  engrais: "🌿", herbicide: "🌿", insecticide: "🐛", fongicide: "🍄", autre_phyto: "🧪",
};
const CAT_LABELS: Record<string, string> = {
  engrais: "Engrais", herbicide: "Herbicide", insecticide: "Insecticide", fongicide: "Fongicide", autre_phyto: "Autre phyto",
};

function fmtMoney(v: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(v)) + " FCFA";
}

export default async function IntraitsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profil } = await supabase.from("profils").select("organisation_id").eq("id", user!.id).single();
  const orgId = (profil as any)?.organisation_id;

  const { data: intrants } = await supabase
    .from("applications_intrants")
    .select("*, cultures(type_culture, champs(nom)), profils(nom_complet)")
    .eq("organisation_id", orgId)
    .order("date_application", { ascending: false });

  const total = (intrants ?? []).reduce((s: number, i: any) => s + (i.cout ?? 0), 0);

  // Regrouper par catégorie pour le résumé
  const parCat: Record<string, { nb: number; cout: number }> = {};
  for (const i of intrants ?? []) {
    if (!parCat[i.categorie]) parCat[i.categorie] = { nb: 0, cout: 0 };
    parCat[i.categorie].nb++;
    parCat[i.categorie].cout += i.cout ?? 0;
  }

  return (
    <div className="animate-fade-up space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">🧪 Intrants</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            {intrants?.length ?? 0} application(s) · Coût total : <strong className="text-amber-600">{fmtMoney(total)}</strong>
          </p>
        </div>
        <a href="/dashboard/intrants/nouveau" className="btn-primary">+ Saisir un intrant</a>
      </div>

      {/* Résumé par catégorie */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {Object.entries(parCat).map(([cat, data]) => (
          <div key={cat} className="stat-card text-center py-4">
            <div className="text-2xl mb-1">{CAT_ICONS[cat] ?? "🧪"}</div>
            <div className="text-lg font-extrabold text-slate-800">{data.nb}</div>
            <div className="text-xs text-slate-500 font-medium">{CAT_LABELS[cat] ?? cat}</div>
            <div className="text-xs text-amber-600 font-semibold mt-1">{fmtMoney(data.cout)}</div>
          </div>
        ))}
        {Object.keys(parCat).length === 0 && (
          <div className="col-span-5 text-center text-slate-400 text-sm py-4">Aucune donnée</div>
        )}
      </div>

      {/* Tableau historique */}
      <div className="section-card overflow-hidden">
        <div className="section-header">
          <h2 className="font-bold text-slate-800 text-[15px]">Historique des applications</h2>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Produit</th>
              <th>Catégorie</th>
              <th>Quantité</th>
              <th>Culture</th>
              <th>Champ</th>
              <th>Agent</th>
              <th>Coût</th>
            </tr>
          </thead>
          <tbody>
            {intrants && intrants.length > 0 ? intrants.map((i: any) => (
              <tr key={i.id}>
                <td className="text-slate-600 text-sm">{new Date(i.date_application).toLocaleDateString("fr-FR")}</td>
                <td className="font-semibold text-slate-800">{i.produit}</td>
                <td>
                  <span className="badge badge-green text-[11px]">
                    {CAT_ICONS[i.categorie]} {CAT_LABELS[i.categorie] ?? i.categorie}
                  </span>
                </td>
                <td className="text-slate-600">{i.quantite ?? "—"}</td>
                <td className="text-slate-600">{i.cultures?.type_culture ?? "—"}</td>
                <td>
                  <span className="badge badge-slate text-[11px]">{i.cultures?.champs?.nom ?? "—"}</span>
                </td>
                <td className="text-slate-500 text-sm">{i.profils?.nom_complet ?? "—"}</td>
                <td className="font-semibold text-amber-600">{i.cout ? fmtMoney(i.cout) : "—"}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-400">
                  <div className="text-3xl mb-2">🧪</div>
                  Aucun intrant enregistré. <a href="/dashboard/intrants/nouveau" className="text-green-600 underline">Ajouter un intrant</a>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

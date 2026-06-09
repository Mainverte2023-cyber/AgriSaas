export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";

const STATUT_BADGES: Record<string, string> = {
  planifiee: "badge-blue",
  en_cours: "badge-green",
  recoltee: "badge-amber",
  abandonnee: "badge-red",
};

const STATUT_LABELS: Record<string, string> = {
  planifiee: "Planifiée",
  en_cours: "En cours",
  recoltee: "Récoltée",
  abandonnee: "Abandonnée",
};

export default async function CulturesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profil } = await supabase.from("profils").select("organisation_id").eq("id", user!.id).single();
  const orgId = (profil as any)?.organisation_id;

  const { data: cultures } = await supabase
    .from("cultures")
    .select("*, champs(nom)")
    .eq("organisation_id", orgId)
    .order("created_at", { ascending: false });

  return (
    <div className="animate-fade-up space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">🌾 Cultures</h1>
          <p className="text-slate-500 text-sm mt-0.5">{cultures?.length ?? 0} culture(s) enregistrée(s)</p>
        </div>
        <a href="/dashboard/cultures/nouvelle" className="btn-primary">+ Nouvelle culture</a>
      </div>

      <div className="section-card overflow-hidden">
        <table className="data-table">
          <thead>
            <tr>
              <th>Culture</th>
              <th>Variété</th>
              <th>Champ</th>
              <th>Date semis</th>
              <th>Récolte prévue</th>
              <th>Rendement estimé</th>
              <th>Statut</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {cultures && cultures.length > 0 ? cultures.map((c: any) => (
              <tr key={c.id}>
                <td className="font-semibold text-slate-800">{c.type_culture}</td>
                <td className="text-slate-500">{c.variete ?? "—"}</td>
                <td>
                  <span className="badge badge-slate">{(c.champs as any)?.nom ?? "—"}</span>
                </td>
                <td className="text-slate-600">{c.date_semis ? new Date(c.date_semis).toLocaleDateString("fr-FR") : "—"}</td>
                <td className="text-slate-600">{c.date_recolte_prevue ? new Date(c.date_recolte_prevue).toLocaleDateString("fr-FR") : "—"}</td>
                <td className="text-slate-600">{c.rendement_estime ? `${c.rendement_estime} t/ha` : "—"}</td>
                <td>
                  <span className={`badge ${STATUT_BADGES[c.statut] ?? "badge-slate"}`}>
                    {STATUT_LABELS[c.statut] ?? c.statut}
                  </span>
                </td>
                <td>
                  <a href={`/dashboard/cultures/${c.id}`} className="text-green-600 hover:underline text-sm font-medium">
                    Détails →
                  </a>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-400">
                  <div className="text-3xl mb-2">🌱</div>
                  Aucune culture enregistrée. <a href="/dashboard/cultures/nouvelle" className="text-green-600 underline">Ajouter une culture</a>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

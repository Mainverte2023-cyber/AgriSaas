export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";

function fmtMoney(v: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(v)) + " FCFA";
}

const STATUT_BADGES: Record<string, string> = {
  actif: "badge-green", en_retard: "badge-amber", suspendu: "badge-red", resilie: "badge-slate",
};
const STATUT_LABELS: Record<string, string> = {
  actif: "Actif", en_retard: "En retard", suspendu: "Suspendu", resilie: "Résilié",
};

export default async function AbonnementPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profil } = await supabase.from("profils").select("organisation_id").eq("id", user!.id).single();
  const orgId = (profil as any)?.organisation_id;

  const { data: abo } = await supabase.from("abonnements").select("*").eq("organisation_id", orgId).single();
  const { data: paiements } = await supabase
    .from("paiements_abonnement")
    .select("*")
    .eq("abonnement_id", abo?.id ?? "")
    .order("date_paiement", { ascending: false });

  return (
    <div className="animate-fade-up space-y-6 max-w-3xl">
      <h1 className="text-2xl font-extrabold text-slate-800">💳 Mon abonnement</h1>

      {/* Statut abonnement */}
      {abo ? (
        <div className="section-card section-body">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-bold text-slate-800 text-lg capitalize">{abo.plan}</h2>
              <p className="text-slate-500 text-sm">Abonnement mensuel · {fmtMoney(abo.montant_mensuel)} / mois</p>
            </div>
            <span className={`badge ${STATUT_BADGES[abo.statut] ?? "badge-slate"} text-sm px-4 py-1.5`}>
              {STATUT_LABELS[abo.statut] ?? abo.statut}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Début</div>
              <div className="font-bold text-slate-700">{new Date(abo.date_debut).toLocaleDateString("fr-FR")}</div>
            </div>
            <div className={`rounded-xl p-4 ${abo.statut === "en_retard" ? "bg-amber-50" : "bg-slate-50"}`}>
              <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Prochaine échéance</div>
              <div className={`font-bold ${abo.statut === "en_retard" ? "text-amber-600" : "text-slate-700"}`}>
                {abo.prochaine_echeance ? new Date(abo.prochaine_echeance).toLocaleDateString("fr-FR") : "—"}
              </div>
            </div>
          </div>

          {abo.statut === "en_retard" && (
            <div className="alert-warn mt-4 flex items-center gap-2 text-sm">
              ⚠️ Votre abonnement est en retard de paiement. Veuillez régulariser pour éviter la suspension.
            </div>
          )}
          {abo.statut === "suspendu" && (
            <div className="alert-urgent mt-4 text-sm">
              🚫 Votre compte est suspendu. Contactez l'administration pour rétablir l'accès.
            </div>
          )}
        </div>
      ) : (
        <div className="section-card section-body text-center py-10 text-slate-400">
          Aucun abonnement trouvé. Contactez l'administration AgriSaaS.
        </div>
      )}

      {/* Historique paiements */}
      {paiements && paiements.length > 0 && (
        <div className="section-card overflow-hidden">
          <div className="section-header">
            <h2 className="font-bold text-slate-800 text-[15px]">Historique des paiements</h2>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Période</th>
                <th>Montant</th>
                <th>Méthode</th>
                <th>Référence</th>
              </tr>
            </thead>
            <tbody>
              {paiements.map((p: any) => (
                <tr key={p.id}>
                  <td>{new Date(p.date_paiement).toLocaleDateString("fr-FR")}</td>
                  <td className="text-slate-500">{p.periode_couverte ?? "—"}</td>
                  <td className="font-semibold text-green-700">{fmtMoney(p.montant)}</td>
                  <td className="text-slate-500">{p.methode ?? "—"}</td>
                  <td className="text-slate-400 text-xs font-mono">{p.reference ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

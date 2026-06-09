export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";

export default async function ChampDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profil } = await supabase.from("profils").select("organisation_id, role").eq("id", user!.id).single();

  const role  = (profil as any)?.role;
  const orgId = (profil as any)?.organisation_id;

  // Récupérer le champ
  const { data: champ } = await supabase
    .from("champs")
    .select("*, organisations(nom)")
    .eq("id", id)
    .single();

  if (!champ) return notFound();

  // Vérifier l'accès : le champ doit appartenir à la même org (sauf super_admin)
  if (role !== "super_admin" && champ.organisation_id !== orgId) {
    return notFound();
  }

  // Données liées
  const [
    { data: cultures },
    { data: intrants },
    { data: rapports },
    { data: diagnostics },
  ] = await Promise.all([
    supabase.from("cultures").select("*").eq("champ_id", champ.id).order("created_at", { ascending: false }),
    supabase.from("applications_intrants").select("*").eq("organisation_id", champ.organisation_id).order("date_application", { ascending: false }).limit(10),
    supabase.from("rapports_terrain").select("*, profils(nom_complet)").eq("champ_id", champ.id).order("created_at", { ascending: false }).limit(5),
    supabase.from("diagnostics").select("*").eq("champ_id", champ.id).order("created_at", { ascending: false }).limit(5),
  ]);

  const totalDepenses = (intrants ?? []).reduce((s: number, i: any) => s + (i.cout ?? 0), 0);
  const culturesActives = (cultures ?? []).filter((c: any) => c.statut === "en_cours").length;

  function fmtMoney(v: number) { return new Intl.NumberFormat("fr-FR").format(Math.round(v)) + " FCFA"; }
  function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString("fr-FR") : "—"; }

  const canEdit = role === "super_admin" || role === "admin_client";

  return (
    <div className="animate-fade-up space-y-6 max-w-5xl">
      {/* Retour */}
      <div>
        <Link href="/dashboard/champs" className="text-sm text-slate-400 hover:text-slate-600 flex items-center gap-1">
          ← Retour aux champs
        </Link>
      </div>

      {/* Header champ */}
      <div className="section-card overflow-hidden">
        <div className="h-40 bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center relative">
          {champ.photo_url ? (
            <img src={champ.photo_url} alt={champ.nom} className="w-full h-full object-cover" />
          ) : (
            <span className="text-7xl">🌿</span>
          )}
          {role === "super_admin" && (
            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur rounded-xl px-3 py-1 text-xs font-bold text-slate-700">
              🏢 {(champ.organisations as any)?.nom}
            </div>
          )}
        </div>
        <div className="section-body">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-800">{champ.nom}</h1>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {champ.surface_ha && (
                  <span className="badge badge-green">📐 {champ.surface_ha} ha</span>
                )}
                {champ.localisation && (
                  <span className="badge badge-slate">📍 {champ.localisation}</span>
                )}
                <span className="badge badge-blue">🌾 {culturesActives} culture(s) active(s)</span>
              </div>
              {champ.notes && (
                <p className="text-slate-500 text-sm mt-2">{champ.notes}</p>
              )}
            </div>
            <div className="flex gap-2 flex-wrap">
              {champ.gps_lat && champ.gps_lng && (
                <a
                  href={`https://www.google.com/maps?q=${champ.gps_lat},${champ.gps_lng}`}
                  target="_blank" rel="noopener noreferrer"
                  className="btn-secondary text-sm"
                >
                  📍 Voir sur la carte
                </a>
              )}
              {canEdit && (
                <Link href={`/dashboard/champs/${champ.id}/modifier`} className="btn-secondary text-sm">
                  ✏️ Modifier
                </Link>
              )}
            </div>
          </div>

          {/* Stats rapides */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
            {[
              { icon: "🌾", label: "Cultures totales", value: (cultures ?? []).length },
              { icon: "✅", label: "En cours", value: culturesActives },
              { icon: "📋", label: "Rapports terrain", value: (rapports ?? []).length },
              { icon: "💸", label: "Dépenses intrants", value: fmtMoney(totalDepenses) },
            ].map(s => (
              <div key={s.label} className="bg-slate-50 rounded-xl p-3 text-center">
                <div className="text-xl mb-1">{s.icon}</div>
                <div className="font-bold text-slate-800 text-sm">{s.value}</div>
                <div className="text-xs text-slate-400">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* GPS coords */}
      {champ.gps_lat && champ.gps_lng && (
        <div className="section-card section-body">
          <h2 className="font-bold text-slate-700 text-sm mb-3">📍 Coordonnées GPS</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="text-xs text-slate-400 mb-1">Latitude</div>
              <div className="font-mono font-bold text-slate-700">{champ.gps_lat}</div>
            </div>
            <div className="bg-slate-50 rounded-xl p-3">
              <div className="text-xs text-slate-400 mb-1">Longitude</div>
              <div className="font-mono font-bold text-slate-700">{champ.gps_lng}</div>
            </div>
          </div>
        </div>
      )}

      {/* Cultures */}
      <div className="section-card overflow-hidden">
        <div className="section-header">
          <h2 className="font-bold text-slate-800 text-sm">🌾 Cultures ({(cultures ?? []).length})</h2>
          <Link href="/dashboard/cultures/nouvelle" className="btn-primary text-xs px-3 py-1.5">+ Nouvelle</Link>
        </div>
        {(cultures ?? []).length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-sm">Aucune culture enregistrée</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr><th>Culture</th><th>Variété</th><th>Date semis</th><th>Récolte prévue</th><th>Statut</th></tr>
            </thead>
            <tbody>
              {(cultures ?? []).map((c: any) => (
                <tr key={c.id}>
                  <td className="font-semibold">{c.type_culture}</td>
                  <td className="text-slate-500">{c.variete ?? "—"}</td>
                  <td>{fmtDate(c.date_semis)}</td>
                  <td>{fmtDate(c.date_recolte_prevue)}</td>
                  <td>
                    <span className={`badge text-[10px] ${
                      c.statut === "en_cours"  ? "badge-green" :
                      c.statut === "planifiee" ? "badge-blue"  : "badge-slate"
                    }`}>
                      {c.statut === "en_cours"  ? "✅ En cours" :
                       c.statut === "planifiee" ? "📅 Planifiée" : "🏁 Récoltée"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Rapports terrain */}
      {(rapports ?? []).length > 0 && (
        <div className="section-card overflow-hidden">
          <div className="section-header">
            <h2 className="font-bold text-slate-800 text-sm">👷 Rapports terrain ({(rapports ?? []).length})</h2>
            <Link href="/dashboard/agents/nouveau" className="btn-primary text-xs px-3 py-1.5">+ Rapport</Link>
          </div>
          <table className="data-table">
            <thead>
              <tr><th>Titre</th><th>Agent</th><th>Date</th></tr>
            </thead>
            <tbody>
              {(rapports ?? []).map((r: any) => (
                <tr key={r.id}>
                  <td className="font-semibold">{r.titre}</td>
                  <td className="text-slate-500">{(r.profils as any)?.nom_complet ?? "—"}</td>
                  <td>{fmtDate(r.date_intervention)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Diagnostics */}
      {(diagnostics ?? []).length > 0 && (
        <div className="section-card overflow-hidden">
          <div className="section-header">
            <h2 className="font-bold text-slate-800 text-sm">🔬 Diagnostics ({(diagnostics ?? []).length})</h2>
          </div>
          <table className="data-table">
            <thead>
              <tr><th>Symptôme</th><th>Culture</th><th>Gravité</th><th>Statut</th><th>Date</th></tr>
            </thead>
            <tbody>
              {(diagnostics ?? []).map((d: any) => (
                <tr key={d.id}>
                  <td className="font-semibold">{d.symptome}</td>
                  <td className="text-slate-500">{d.culture_affectee ?? "—"}</td>
                  <td>
                    <span className={`badge text-[10px] ${
                      d.gravite === "faible"   ? "badge-green" :
                      d.gravite === "modere"   ? "badge-amber" : "badge-red"
                    }`}>{d.gravite}</span>
                  </td>
                  <td>
                    <span className={`badge text-[10px] ${
                      d.statut === "resolu"     ? "badge-green" :
                      d.statut === "en_cours"   ? "badge-blue"  : "badge-amber"
                    }`}>{d.statut === "resolu" ? "✅ Résolu" : d.statut === "en_cours" ? "🔍 En cours" : "⏳ En attente"}</span>
                  </td>
                  <td>{fmtDate(d.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Actions rapides */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Link href="/dashboard/cultures/nouvelle" className="quick-action">
          <div className="qa-icon">🌾</div>
          <span>Nouvelle culture</span>
        </Link>
        <Link href="/dashboard/intrants/nouveau" className="quick-action">
          <div className="qa-icon">🧪</div>
          <span>Saisir intrant</span>
        </Link>
        <Link href="/dashboard/agents/nouveau" className="quick-action">
          <div className="qa-icon">📋</div>
          <span>Rapport terrain</span>
        </Link>
        <Link href="/dashboard/diagnostic" className="quick-action">
          <div className="qa-icon">🔬</div>
          <span>Diagnostic</span>
        </Link>
      </div>
    </div>
  );
}

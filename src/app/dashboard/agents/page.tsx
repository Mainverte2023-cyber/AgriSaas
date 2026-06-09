export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";

export default async function AgentsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profil } = await supabase.from("profils").select("organisation_id").eq("id", user!.id).single();
  const orgId = (profil as any)?.organisation_id;

  const { data: rapports } = await supabase
    .from("rapports_terrain")
    .select("*, profils(nom_complet), champs(nom), cultures(type_culture)")
    .eq("organisation_id", orgId)
    .order("date_intervention", { ascending: false });

  const { data: agents } = await supabase
    .from("profils")
    .select("id, nom_complet, telephone, actif")
    .eq("organisation_id", orgId)
    .eq("role", "agent_terrain");

  return (
    <div className="animate-fade-up space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">👷 Agents terrain</h1>
          <p className="text-slate-500 text-sm mt-0.5">{agents?.length ?? 0} agent(s) · {rapports?.length ?? 0} rapport(s)</p>
        </div>
      </div>

      {/* Agents actifs */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {agents && agents.length > 0 ? agents.map((a: any) => (
          <div key={a.id} className="stat-card flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-lg shrink-0">
              👷
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-slate-800 text-sm truncate">{a.nom_complet}</div>
              <div className="text-xs text-slate-400">{a.telephone ?? "Pas de tél."}</div>
              <span className={`badge text-[10px] mt-1 ${a.actif ? "badge-green" : "badge-slate"}`}>
                {a.actif ? "Actif" : "Inactif"}
              </span>
            </div>
          </div>
        )) : (
          <div className="col-span-4 text-center text-slate-400 text-sm py-6 section-card section-body">
            Aucun agent terrain dans votre organisation.
          </div>
        )}
      </div>

      {/* Rapports terrain */}
      <div className="section-card overflow-hidden">
        <div className="section-header">
          <h2 className="font-bold text-slate-800 text-[15px]">📋 Rapports terrain récents</h2>
        </div>
        {rapports && rapports.length > 0 ? (
          <div className="divide-y divide-slate-50">
            {rapports.map((r: any) => (
              <div key={r.id} className="px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-800 text-sm">{r.titre}</h3>
                      {r.champs?.nom && <span className="badge badge-slate text-[11px]">📍 {r.champs.nom}</span>}
                      {r.cultures?.type_culture && <span className="badge badge-green text-[11px]">🌾 {r.cultures.type_culture}</span>}
                    </div>
                    {r.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{r.description}</p>}
                    <div className="text-xs text-slate-400 mt-1.5 flex items-center gap-3">
                      <span>👷 {r.profils?.nom_complet ?? "Agent inconnu"}</span>
                      <span>🕐 {new Date(r.date_intervention).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}</span>
                      {r.gps_lat && r.gps_lng && (
                        <a
                          href={`https://maps.google.com/?q=${r.gps_lat},${r.gps_lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline"
                        >
                          Voir GPS 📍
                        </a>
                      )}
                    </div>
                  </div>
                  {/* Photos */}
                  {(r.photo_avant_url || r.photo_apres_url) && (
                    <div className="flex gap-2 shrink-0">
                      {r.photo_avant_url && (
                        <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-100">
                          <img src={r.photo_avant_url} alt="Avant" className="w-full h-full object-cover" />
                        </div>
                      )}
                      {r.photo_apres_url && (
                        <div className="w-14 h-14 rounded-lg overflow-hidden bg-slate-100">
                          <img src={r.photo_apres_url} alt="Après" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-slate-400 text-sm">
            <div className="text-3xl mb-2">📋</div>
            Aucun rapport terrain pour l'instant.
          </div>
        )}
      </div>
    </div>
  );
}

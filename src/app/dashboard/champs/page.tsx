export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function ChampsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profil } = await supabase.from("profils").select("organisation_id").eq("id", user!.id).single();
  const orgId = (profil as any)?.organisation_id;

  const { data: champs } = await supabase
    .from("champs")
    .select("*, cultures(id, type_culture, statut)")
    .eq("organisation_id", orgId)
    .order("created_at", { ascending: false });

  return (
    <div className="animate-fade-up space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">🗺️ Mes champs</h1>
          <p className="text-slate-500 text-sm mt-0.5">{champs?.length ?? 0} champ(s) enregistré(s)</p>
        </div>
        <a href="/dashboard/champs/nouveau" className="btn-primary">+ Nouveau champ</a>
      </div>

      {/* Grille des champs */}
      {champs && champs.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {champs.map((c: any) => {
            const culturesActives = (c.cultures ?? []).filter((cu: any) => cu.statut === "en_cours").length;
            return (
              <Link
                key={c.id}
                href={`/dashboard/champs/${c.id}`}
                className="section-card p-5 hover:border-green-300 hover:shadow-md transition-all block"
              >
                {/* Photo ou placeholder */}
                <div className="w-full h-32 rounded-xl bg-gradient-to-br from-green-100 to-emerald-200 flex items-center justify-center mb-4 overflow-hidden">
                  {c.photo_url
                    ? <img src={c.photo_url} alt={c.nom} className="w-full h-full object-cover rounded-xl" />
                    : <span className="text-5xl">🌿</span>
                  }
                </div>
                <h3 className="font-bold text-slate-800 text-[15px]">{c.nom}</h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {c.surface_ha && (
                    <span className="badge badge-green text-[11px]">📐 {c.surface_ha} ha</span>
                  )}
                  {c.localisation && (
                    <span className="badge badge-slate text-[11px]">📍 {c.localisation}</span>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500">{culturesActives} culture(s) active(s)</span>
                  {c.gps_lat && c.gps_lng && (
                    <a
                      href={`https://maps.google.com/?q=${c.gps_lat},${c.gps_lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      GPS 📍
                    </a>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="section-card section-body text-center py-16">
          <div className="text-5xl mb-4">🌿</div>
          <h3 className="font-bold text-slate-700 text-lg mb-2">Aucun champ enregistré</h3>
          <p className="text-slate-400 text-sm mb-6">Commencez par ajouter votre premier champ ou parcelle agricole.</p>
          <a href="/dashboard/champs/nouveau" className="btn-primary">+ Ajouter mon premier champ</a>
        </div>
      )}
    </div>
  );
}

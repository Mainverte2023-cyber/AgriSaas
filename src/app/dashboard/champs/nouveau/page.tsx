"use client";
export const dynamic = "force-dynamic";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function NouveauChampPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    nom: "", surface_ha: "", localisation: "",
    gps_lat: "", gps_lng: "", notes: "",
  });

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");

    const { data: { user } } = await supabase.auth.getUser();
    const { data: profil } = await supabase.from("profils").select("organisation_id").eq("id", user!.id).single();

    const { error: err } = await supabase.from("champs").insert({
      organisation_id: (profil as any).organisation_id,
      nom: form.nom,
      surface_ha: form.surface_ha ? parseFloat(form.surface_ha) : null,
      localisation: form.localisation || null,
      gps_lat: form.gps_lat ? parseFloat(form.gps_lat) : null,
      gps_lng: form.gps_lng ? parseFloat(form.gps_lng) : null,
      notes: form.notes || null,
    });

    setLoading(false);
    if (err) { setError(err.message); return; }
    router.push("/dashboard/champs");
  }

  return (
    <div className="animate-fade-up max-w-2xl">
      <div className="mb-6">
        <a href="/dashboard/champs" className="text-sm text-slate-400 hover:text-slate-600">← Retour aux champs</a>
        <h1 className="text-2xl font-extrabold text-slate-800 mt-2">🗺️ Nouveau champ</h1>
      </div>

      <div className="section-card section-body">
        {error && <div className="alert-urgent mb-4 text-sm">❌ {error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="field-label">Nom du champ *</label>
            <input className="input" value={form.nom} onChange={e => set("nom", e.target.value)} placeholder="Ex : Champ Nord, Parcelle A, Bas-fond..." required />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Surface (hectares)</label>
              <input className="input" type="number" step="0.01" value={form.surface_ha} onChange={e => set("surface_ha", e.target.value)} placeholder="Ex : 2.5" />
            </div>
            <div>
              <label className="field-label">Localisation / Village</label>
              <input className="input" value={form.localisation} onChange={e => set("localisation", e.target.value)} placeholder="Ex : Bamako, Sikasso, Ségou, Koutiala..." />
            </div>
          </div>

          <div>
            <label className="field-label">📍 Coordonnées GPS <span className="text-slate-400 font-normal">(optionnel)</span></label>
            <div className="grid sm:grid-cols-2 gap-4">
              <input className="input" type="number" step="any" value={form.gps_lat} onChange={e => set("gps_lat", e.target.value)} placeholder="Latitude  Ex : 12.6500" />
              <input className="input" type="number" step="any" value={form.gps_lng} onChange={e => set("gps_lng", e.target.value)} placeholder="Longitude  Ex : -8.0000" />
            </div>
            <p className="text-xs text-slate-400 mt-1">Sur ton téléphone : ouvre Google Maps, maintiens le doigt sur l'emplacement, copie les coordonnées.</p>
          </div>

          <div>
            <label className="field-label">Notes</label>
            <textarea className="input" rows={3} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Description du sol, historique, particularités..." />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Enregistrement…</> : "✅ Enregistrer le champ"}
            </button>
            <a href="/dashboard/champs" className="btn-secondary">Annuler</a>
          </div>
        </form>
      </div>
    </div>
  );
}

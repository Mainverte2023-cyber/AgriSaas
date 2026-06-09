"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function NouveauRapportPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [champs, setChamps] = useState<any[]>([]);
  const [cultures, setCultures] = useState<any[]>([]);
  const [form, setForm] = useState({
    titre: "", description: "", champ_id: "", culture_id: "",
    gps_lat: "", gps_lng: "",
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      supabase.from("profils").select("organisation_id").eq("id", user!.id).single().then(({ data: profil }) => {
        const oid = (profil as any).organisation_id;
        supabase.from("champs").select("id, nom").eq("organisation_id", oid).order("nom").then(({ data }) => setChamps(data ?? []));
        supabase.from("cultures").select("id, type_culture, champs(nom)").eq("organisation_id", oid).eq("statut", "en_cours").then(({ data }) => setCultures(data ?? []));
      });
    });
  }, []);

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");

    const { data: { user } } = await supabase.auth.getUser();
    const { data: profil } = await supabase.from("profils").select("organisation_id").eq("id", user!.id).single();

    const { error: err } = await supabase.from("rapports_terrain").insert({
      organisation_id: (profil as any).organisation_id,
      agent_id: user!.id,
      titre: form.titre,
      description: form.description || null,
      champ_id: form.champ_id || null,
      culture_id: form.culture_id || null,
      gps_lat: form.gps_lat ? parseFloat(form.gps_lat) : null,
      gps_lng: form.gps_lng ? parseFloat(form.gps_lng) : null,
      date_intervention: new Date().toISOString(),
    });

    setLoading(false);
    if (err) { setError(err.message); return; }
    router.push("/dashboard/agents");
  }

  function getGPS() {
    if (!navigator.geolocation) { setError("GPS non disponible sur cet appareil."); return; }
    navigator.geolocation.getCurrentPosition(
      pos => { set("gps_lat", pos.coords.latitude.toFixed(6)); set("gps_lng", pos.coords.longitude.toFixed(6)); },
      () => setError("Impossible d'obtenir la position GPS.")
    );
  }

  return (
    <div className="animate-fade-up max-w-2xl">
      <div className="mb-6">
        <a href="/dashboard/agents" className="text-sm text-slate-400 hover:text-slate-600">← Retour aux agents</a>
        <h1 className="text-2xl font-extrabold text-slate-800 mt-2">📋 Nouveau rapport terrain</h1>
      </div>

      <div className="section-card section-body">
        {error && <div className="alert-urgent mb-4 text-sm">❌ {error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="field-label">Titre du rapport *</label>
            <input className="input" value={form.titre} onChange={e => set("titre", e.target.value)} placeholder="Ex : Traitement fongicide, Inspection parcelle Nord..." required />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Champ concerné</label>
              <select className="input" value={form.champ_id} onChange={e => set("champ_id", e.target.value)}>
                <option value="">— Choisir —</option>
                {champs.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Culture concernée</label>
              <select className="input" value={form.culture_id} onChange={e => set("culture_id", e.target.value)}>
                <option value="">— Choisir —</option>
                {cultures.map((c: any) => <option key={c.id} value={c.id}>{c.type_culture} — {(c.champs as any)?.nom}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="field-label">Description / Observations</label>
            <textarea className="input" rows={4} value={form.description} onChange={e => set("description", e.target.value)} placeholder="Décrivez ce que vous avez observé ou fait sur le terrain..." />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="field-label mb-0">📍 Position GPS</label>
              <button type="button" onClick={getGPS} className="btn-secondary text-xs px-3 py-1.5">
                📍 Ma position actuelle
              </button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <input className="input" value={form.gps_lat} onChange={e => set("gps_lat", e.target.value)} placeholder="Latitude" />
              <input className="input" value={form.gps_lng} onChange={e => set("gps_lng", e.target.value)} placeholder="Longitude" />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Envoi…</> : "✅ Envoyer le rapport"}
            </button>
            <a href="/dashboard/agents" className="btn-secondary">Annuler</a>
          </div>
        </form>
      </div>
    </div>
  );
}

"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const CULTURES_COURANTES = ["Maïs","Riz","Manioc","Arachide","Fonio","Gombo","Tomate","Oignon","Aubergine","Piment","Banane","Ananas","Mangue","Papaye","Haricot","Sorgho","Mil","Igname","Patate douce","Chou"];

export default function NouvelleCulturePage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [champs, setChamps] = useState<any[]>([]);
  const [form, setForm] = useState({
    champ_id: "", type_culture: "", variete: "",
    date_semis: "", date_recolte_prevue: "",
    quantite_semences: "", rendement_estime: "", statut: "planifiee",
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      supabase.from("profils").select("organisation_id").eq("id", user!.id).single().then(({ data: profil }) => {
        supabase.from("champs").select("id, nom").eq("organisation_id", (profil as any).organisation_id).order("nom").then(({ data }) => setChamps(data ?? []));
      });
    });
  }, []);

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");

    const { data: { user } } = await supabase.auth.getUser();
    const { data: profil } = await supabase.from("profils").select("organisation_id").eq("id", user!.id).single();

    const { error: err } = await supabase.from("cultures").insert({
      organisation_id: (profil as any).organisation_id,
      champ_id: form.champ_id,
      type_culture: form.type_culture,
      variete: form.variete || null,
      date_semis: form.date_semis || null,
      date_recolte_prevue: form.date_recolte_prevue || null,
      quantite_semences: form.quantite_semences || null,
      rendement_estime: form.rendement_estime ? parseFloat(form.rendement_estime) : null,
      statut: form.statut,
    });

    setLoading(false);
    if (err) { setError(err.message); return; }
    router.push("/dashboard/cultures");
  }

  return (
    <div className="animate-fade-up max-w-2xl">
      <div className="mb-6">
        <a href="/dashboard/cultures" className="text-sm text-slate-400 hover:text-slate-600">← Retour aux cultures</a>
        <h1 className="text-2xl font-extrabold text-slate-800 mt-2">🌾 Nouvelle culture</h1>
      </div>

      <div className="section-card section-body">
        {error && <div className="alert-urgent mb-4 text-sm">❌ {error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Champ / Parcelle *</label>
              <select className="input" value={form.champ_id} onChange={e => set("champ_id", e.target.value)} required>
                <option value="">— Choisir un champ —</option>
                {champs.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Statut</label>
              <select className="input" value={form.statut} onChange={e => set("statut", e.target.value)}>
                <option value="planifiee">Planifiée</option>
                <option value="en_cours">En cours</option>
                <option value="recoltee">Récoltée</option>
              </select>
            </div>
          </div>

          <div>
            <label className="field-label">Type de culture *</label>
            <input
              className="input" list="cultures-list" value={form.type_culture}
              onChange={e => set("type_culture", e.target.value)}
              placeholder="Ex : Maïs, Riz, Tomate..." required
            />
            <datalist id="cultures-list">
              {CULTURES_COURANTES.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Variété</label>
              <input className="input" value={form.variete} onChange={e => set("variete", e.target.value)} placeholder="Ex : Maïs jaune local, Riz IR64..." />
            </div>
            <div>
              <label className="field-label">Quantité de semences</label>
              <input className="input" value={form.quantite_semences} onChange={e => set("quantite_semences", e.target.value)} placeholder="Ex : 25 kg, 5 sachets..." />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Date de semis</label>
              <input className="input" type="date" value={form.date_semis} onChange={e => set("date_semis", e.target.value)} />
            </div>
            <div>
              <label className="field-label">Récolte prévue</label>
              <input className="input" type="date" value={form.date_recolte_prevue} onChange={e => set("date_recolte_prevue", e.target.value)} />
            </div>
          </div>

          <div>
            <label className="field-label">Rendement estimé (t/ha)</label>
            <input className="input" type="number" step="0.1" value={form.rendement_estime} onChange={e => set("rendement_estime", e.target.value)} placeholder="Ex : 3.5" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Enregistrement…</> : "✅ Enregistrer la culture"}
            </button>
            <a href="/dashboard/cultures" className="btn-secondary">Annuler</a>
          </div>
        </form>
      </div>
    </div>
  );
}

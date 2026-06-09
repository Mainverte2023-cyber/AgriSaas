"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  { value: "engrais",     label: "🌿 Engrais" },
  { value: "herbicide",   label: "🌿 Herbicide" },
  { value: "insecticide", label: "🐛 Insecticide" },
  { value: "fongicide",   label: "🍄 Fongicide" },
  { value: "autre_phyto", label: "🧪 Autre produit" },
];

const PRODUITS_COMMUNS: Record<string, string[]> = {
  engrais:     ["NPK 15-15-15","Urée 46%","DAP","Sulfate d'ammoniaque","Compost","Fumier"],
  herbicide:   ["Glyphosate","Atrazine","Paraquat","2,4-D","Métolachlore"],
  insecticide: ["Imidaclopride","Lambda-cyhalothrine","Chlorpyrifos","Deltaméthrine","Acétamipride"],
  fongicide:   ["Mancozèbe","Carbendazime","Métalaxyl","Propiconazole","Cuivre"],
  autre_phyto: [],
};

export default function NouvelIntrantPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cultures, setCultures] = useState<any[]>([]);
  const [form, setForm] = useState({
    culture_id: "", categorie: "engrais", produit: "",
    quantite: "", date_application: new Date().toISOString().split("T")[0],
    cout: "", notes: "",
  });

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      supabase.from("profils").select("organisation_id").eq("id", user!.id).single().then(({ data: profil }) => {
        supabase.from("cultures")
          .select("id, type_culture, champs(nom)")
          .eq("organisation_id", (profil as any).organisation_id)
          .eq("statut", "en_cours")
          .order("type_culture")
          .then(({ data }) => setCultures(data ?? []));
      });
    });
  }, []);

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");

    const { data: { user } } = await supabase.auth.getUser();
    const { data: profil } = await supabase.from("profils").select("organisation_id").eq("id", user!.id).single();

    const { error: err } = await supabase.from("applications_intrants").insert({
      organisation_id: (profil as any).organisation_id,
      culture_id: form.culture_id,
      categorie: form.categorie,
      produit: form.produit,
      quantite: form.quantite || null,
      date_application: form.date_application,
      cout: form.cout ? parseFloat(form.cout) : 0,
      agent_id: user!.id,
      notes: form.notes || null,
    });

    setLoading(false);
    if (err) { setError(err.message); return; }
    router.push("/dashboard/intrants");
  }

  return (
    <div className="animate-fade-up max-w-2xl">
      <div className="mb-6">
        <a href="/dashboard/intrants" className="text-sm text-slate-400 hover:text-slate-600">← Retour aux intrants</a>
        <h1 className="text-2xl font-extrabold text-slate-800 mt-2">🧪 Saisir un intrant</h1>
      </div>

      <div className="section-card section-body">
        {error && <div className="alert-urgent mb-4 text-sm">❌ {error}</div>}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="field-label">Culture concernée *</label>
            <select className="input" value={form.culture_id} onChange={e => set("culture_id", e.target.value)} required>
              <option value="">— Choisir une culture en cours —</option>
              {cultures.map((c: any) => (
                <option key={c.id} value={c.id}>{c.type_culture} — {(c.champs as any)?.nom ?? "?"}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label">Catégorie de produit *</label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value} type="button"
                  onClick={() => { set("categorie", cat.value); set("produit", ""); }}
                  className={`py-2 px-2 rounded-xl border-2 text-xs font-semibold transition-all text-center ${
                    form.categorie === cat.value
                      ? "border-green-500 bg-green-50 text-green-700"
                      : "border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Nom du produit *</label>
              <input
                className="input" list="produits-list" value={form.produit}
                onChange={e => set("produit", e.target.value)}
                placeholder="Nom du produit utilisé" required
              />
              <datalist id="produits-list">
                {(PRODUITS_COMMUNS[form.categorie] ?? []).map(p => <option key={p} value={p} />)}
              </datalist>
            </div>
            <div>
              <label className="field-label">Quantité utilisée</label>
              <input className="input" value={form.quantite} onChange={e => set("quantite", e.target.value)} placeholder="Ex : 50 kg, 5 L, 3 sachets..." />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Date d'application *</label>
              <input className="input" type="date" value={form.date_application} onChange={e => set("date_application", e.target.value)} required />
            </div>
            <div>
              <label className="field-label">Coût (FCFA)</label>
              <input className="input" type="number" step="any" value={form.cout} onChange={e => set("cout", e.target.value)} placeholder="Ex : 25000" />
            </div>
          </div>

          <div>
            <label className="field-label">Notes / Observations</label>
            <textarea className="input" rows={2} value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Conditions d'application, observations..." />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Enregistrement…</> : "✅ Enregistrer l'intrant"}
            </button>
            <a href="/dashboard/intrants" className="btn-secondary">Annuler</a>
          </div>
        </form>
      </div>
    </div>
  );
}

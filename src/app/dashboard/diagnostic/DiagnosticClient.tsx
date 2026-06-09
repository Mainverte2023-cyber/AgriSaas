"use client";
import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const SYMPTOMES = [
  "Taches sur les feuilles","Jaunissement","Pourriture","Insectes visibles",
  "Flétrissement","Brûlures","Champignons","Virus","Carence nutritive","Autre",
];

interface Props {
  diagnostics: any[];
  champs: any[];
  userId: string;
  orgId: string;
  role: string;
}

export default function DiagnosticClient({ diagnostics, champs, userId, orgId, role }: Props) {
  const supabase = createClient();
  const [tab, setTab] = useState<"liste" | "nouveau">("liste");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    champ_id: champs[0]?.id ?? "",
    symptome: "Taches sur les feuilles",
    description: "",
    culture_affectee: "",
    gravite: "modere",
  });

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = ev => setPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setMessage(null);

    let photoUrl: string | null = null;

    // Upload photo si présente
    if (photoFile) {
      const ext = photoFile.name.split(".").pop();
      const path = `diagnostics/${orgId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("agrisaas-photos")
        .upload(path, photoFile, { cacheControl: "3600", upsert: false });

      if (!upErr) {
        const { data: urlData } = supabase.storage
          .from("agrisaas-photos")
          .getPublicUrl(path);
        photoUrl = urlData.publicUrl;
      }
    }

    const { error } = await supabase.from("diagnostics").insert({
      organisation_id: orgId,
      agent_id: userId,
      champ_id: form.champ_id || null,
      symptome: form.symptome,
      description: form.description || null,
      culture_affectee: form.culture_affectee || null,
      gravite: form.gravite,
      photo_url: photoUrl,
      statut: "en_attente",
    });

    setLoading(false);
    if (error) {
      setMessage({ text: "Erreur : " + error.message, ok: false });
    } else {
      setMessage({ text: "✅ Diagnostic envoyé ! Nous allons analyser et répondre.", ok: true });
      setForm({ champ_id: champs[0]?.id ?? "", symptome: "Taches sur les feuilles", description: "", culture_affectee: "", gravite: "modere" });
      setPhotoFile(null); setPreview(null);
      setTimeout(() => { setTab("liste"); window.location.reload(); }, 1500);
    }
  }

  const graviteColors: Record<string, string> = {
    faible: "badge-green",
    modere: "badge-amber",
    severe: "badge-red",
    critique: "badge-red",
  };
  const statutColors: Record<string, string> = {
    en_attente: "badge-amber",
    en_cours: "badge-blue",
    resolu: "badge-green",
  };

  return (
    <div className="animate-fade-up max-w-5xl space-y-6">
      {/* Header */}
      <div className="page-header">
        <div className="flex items-center gap-3 mb-1">
          <div className="icon-box icon-teal text-2xl">🔬</div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800">Diagnostic des cultures</h1>
            <p className="text-slate-500 text-sm">Envoyez une photo, nous analysons et proposons une solution</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar max-w-xs">
        <button className={`tab-btn ${tab === "liste" ? "active" : ""}`} onClick={() => setTab("liste")}>
          📋 Mes diagnostics ({diagnostics.length})
        </button>
        <button className={`tab-btn ${tab === "nouveau" ? "active" : ""}`} onClick={() => setTab("nouveau")}>
          ➕ Nouveau
        </button>
      </div>

      {/* LISTE */}
      {tab === "liste" && (
        <div>
          {diagnostics.length === 0 ? (
            <div className="section-card section-body text-center py-16">
              <div className="text-5xl mb-4">🔬</div>
              <h3 className="font-bold text-slate-700 text-lg">Aucun diagnostic</h3>
              <p className="text-slate-400 text-sm mt-1 mb-5">Envoyez une photo de votre culture malade pour recevoir une analyse</p>
              <button onClick={() => setTab("nouveau")} className="btn-primary">
                ➕ Soumettre un diagnostic
              </button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {diagnostics.map((d: any) => (
                <div key={d.id} className="diag-card">
                  {/* Photo ou placeholder */}
                  {d.photo_url ? (
                    <img src={d.photo_url} alt="Photo maladie" className="w-full h-44 object-cover" />
                  ) : (
                    <div className="diag-img">🌿</div>
                  )}
                  <div className="diag-body space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-slate-800 text-sm leading-tight">{d.symptome}</div>
                      <span className={`badge ${graviteColors[d.gravite] ?? "badge-slate"} text-[10px]`}>
                        {d.gravite}
                      </span>
                    </div>
                    {d.culture_affectee && (
                      <div className="text-xs text-slate-500">🌾 {d.culture_affectee}</div>
                    )}
                    {d.champs?.nom && (
                      <div className="text-xs text-slate-500">🗺️ {d.champs.nom}</div>
                    )}
                    {role === "super_admin" && d.organisations?.nom && (
                      <div className="text-xs text-slate-400">🏢 {d.organisations.nom}</div>
                    )}
                    <div className="flex items-center justify-between pt-1">
                      <span className={`badge ${statutColors[d.statut] ?? "badge-slate"} text-[10px]`}>
                        {d.statut === "en_attente" ? "⏳ En attente" :
                         d.statut === "en_cours"   ? "🔍 En cours d'analyse" :
                         "✅ Résolu"}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {new Date(d.created_at).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                    {/* Réponse si disponible */}
                    {d.reponse && (
                      <div className="mt-2 p-3 bg-green-50 border border-green-100 rounded-xl text-xs text-green-800">
                        <div className="font-bold mb-1">💡 Réponse de l'expert :</div>
                        {d.reponse}
                      </div>
                    )}
                    {d.description && (
                      <p className="text-xs text-slate-500 line-clamp-2">{d.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FORMULAIRE NOUVEAU */}
      {tab === "nouveau" && (
        <div className="section-card section-body max-w-2xl">
          <h2 className="font-bold text-slate-800 text-lg mb-5">🔬 Soumettre un diagnostic</h2>

          {message && (
            <div className={`mb-5 p-3 rounded-xl text-sm font-medium ${message.ok ? "alert-success" : "alert-urgent"}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Photo upload */}
            <div>
              <label className="field-label">📸 Photo de la maladie</label>
              <div
                className="upload-zone"
                onClick={() => fileRef.current?.click()}
              >
                {preview ? (
                  <div className="space-y-2">
                    <img src={preview} alt="Aperçu" className="max-h-48 mx-auto rounded-xl object-contain" />
                    <p className="text-xs text-slate-400">Clique pour changer la photo</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-4xl">📷</div>
                    <div>
                      <p className="font-bold text-slate-600">Clique pour ajouter une photo</p>
                      <p className="text-sm text-slate-400">JPG, PNG — Prenez la photo directement depuis votre téléphone</p>
                    </div>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="field-label">Symptôme observé *</label>
                <select className="input" value={form.symptome} onChange={e => set("symptome", e.target.value)} required>
                  {SYMPTOMES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Niveau de gravité *</label>
                <select className="input" value={form.gravite} onChange={e => set("gravite", e.target.value)}>
                  <option value="faible">🟢 Faible — quelques plantes</option>
                  <option value="modere">🟡 Modéré — zone limitée</option>
                  <option value="severe">🔴 Sévère — grande zone</option>
                  <option value="critique">🚨 Critique — tout le champ</option>
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="field-label">Culture affectée</label>
                <input className="input" value={form.culture_affectee} onChange={e => set("culture_affectee", e.target.value)} placeholder="Ex : Maïs, Tomate, Riz..." />
              </div>
              <div>
                <label className="field-label">Champ concerné</label>
                <select className="input" value={form.champ_id} onChange={e => set("champ_id", e.target.value)}>
                  <option value="">— Sélectionner —</option>
                  {champs.map((c: any) => <option key={c.id} value={c.id}>{c.nom}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="field-label">Description détaillée</label>
              <textarea
                className="input" rows={4} value={form.description}
                onChange={e => set("description", e.target.value)}
                placeholder="Décrivez ce que vous observez : depuis combien de temps, quelle partie de la plante est touchée, conditions météo récentes..."
              />
            </div>

            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl text-sm text-blue-700">
              <strong>ℹ️ Comment ça marche :</strong> Après envoi, notre équipe analyse votre photo et vous envoie une réponse avec le diagnostic et les solutions recommandées. Délai : 24-48h.
            </div>

            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? (
                  <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Envoi…</>
                ) : "🔬 Envoyer pour analyse"}
              </button>
              <button type="button" onClick={() => setTab("liste")} className="btn-secondary">Annuler</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

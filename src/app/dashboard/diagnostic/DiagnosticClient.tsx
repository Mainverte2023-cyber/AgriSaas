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
  const [tab, setTab]         = useState<"liste" | "nouveau">(diagnostics.length === 0 ? "nouveau" : "liste");
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [aiResultat, setAiResultat] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const fileRef    = useRef<HTMLInputElement>(null);
  const cameraRef  = useRef<HTMLInputElement>(null);

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
    setAiResultat(null);
    const reader = new FileReader();
    reader.onload = ev => {
      const result = ev.target?.result as string;
      setPreview(result);
      setPhotoBase64(result.split(",")[1]); // garder seulement le base64
    };
    reader.readAsDataURL(file);
  }

  // Analyse IA instantanée
  async function analyserAvecIA() {
    if (!photoBase64) { setMessage({ text: "Prenez d'abord une photo", ok: false }); return; }
    setAiLoading(true); setAiResultat(null);
    try {
      const res = await fetch("/api/diagnostic/analyser-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: photoBase64,
          symptome: form.symptome,
          culture: form.culture_affectee,
        }),
      });
      const data = await res.json();
      if (data.analyse) {
        setAiResultat(data.analyse);
        // Pré-remplir la description avec l'analyse
        if (!form.description) {
          set("description", `Analyse IA : ${data.analyse}`);
        }
      } else {
        setMessage({ text: data.error ?? "Erreur analyse IA", ok: false });
      }
    } catch {
      setMessage({ text: "Erreur de connexion à l'IA", ok: false });
    }
    setAiLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setMessage(null);

    let photoUrl: string | null = null;

    if (photoFile) {
      const ext  = photoFile.name.split(".").pop();
      const path = `diagnostics/${orgId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("agrisaas-photos")
        .upload(path, photoFile, { cacheControl: "3600", upsert: false });

      if (!upErr) {
        const { data: urlData } = supabase.storage.from("agrisaas-photos").getPublicUrl(path);
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
      statut: aiResultat ? "en_cours" : "en_attente",
      reponse: aiResultat ?? null,
    });

    setLoading(false);
    if (error) {
      setMessage({ text: "Erreur : " + error.message, ok: false });
    } else {
      setMessage({ text: "✅ Diagnostic envoyé !", ok: true });
      setForm({ champ_id: champs[0]?.id ?? "", symptome: "Taches sur les feuilles", description: "", culture_affectee: "", gravite: "modere" });
      setPhotoFile(null); setPreview(null); setPhotoBase64(null); setAiResultat(null);
      setTimeout(() => { setTab("liste"); window.location.reload(); }, 1500);
    }
  }

  // Répondre à un diagnostic (super_admin / technicien)
  async function repondre(id: string, reponse: string) {
    await supabase.from("diagnostics").update({ reponse, statut: "resolu" }).eq("id", id);
    window.location.reload();
  }

  const graviteColors: Record<string, string> = {
    faible: "badge-green", modere: "badge-amber",
    severe: "badge-red",   critique: "badge-red",
  };
  const statutColors: Record<string, string> = {
    en_attente: "badge-amber", en_cours: "badge-blue", resolu: "badge-green",
  };

  const canRepondre = role === "super_admin" || role === "technicien" || role === "admin_client";

  return (
    <div className="animate-fade-up max-w-5xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3">
            <div className="icon-box icon-teal">🔬</div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-800">Diagnostic des cultures</h1>
              <p className="text-slate-500 text-sm">Photo + analyse IA instantanée ou réponse d'expert</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar max-w-xs">
        <button className={`tab-btn ${tab === "liste" ? "active" : ""}`} onClick={() => setTab("liste")}>
          📋 Diagnostics ({diagnostics.length})
        </button>
        <button className={`tab-btn ${tab === "nouveau" ? "active" : ""}`} onClick={() => setTab("nouveau")}>
          ➕ Nouveau
        </button>
      </div>

      {/* ── LISTE ── */}
      {tab === "liste" && (
        diagnostics.length === 0 ? (
          <div className="section-card section-body text-center py-16">
            <div className="text-5xl mb-4">🔬</div>
            <h3 className="font-bold text-slate-700 text-lg">Aucun diagnostic</h3>
            <p className="text-slate-400 text-sm mt-1 mb-5">Prenez une photo de votre culture malade pour recevoir une analyse</p>
            <button onClick={() => setTab("nouveau")} className="btn-primary">➕ Nouveau diagnostic</button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {diagnostics.map((d: any) => (
              <DiagCard
                key={d.id} d={d}
                graviteColors={graviteColors} statutColors={statutColors}
                canRepondre={canRepondre} role={role}
                onRepondre={repondre}
              />
            ))}
          </div>
        )
      )}

      {/* ── FORMULAIRE ── */}
      {tab === "nouveau" && (
        <div className="section-card section-body max-w-2xl">
          <h2 className="font-bold text-slate-800 text-lg mb-5">🔬 Soumettre un diagnostic</h2>

          {message && (
            <div className={`mb-4 p-3 rounded-xl text-sm font-medium ${message.ok ? "alert-success" : "alert-urgent"}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Zone photo */}
            <div>
              <label className="field-label">📸 Photo de la maladie</label>

              {preview ? (
                <div className="space-y-3">
                  <img src={preview} alt="Aperçu" className="w-full max-h-56 object-contain rounded-xl border border-slate-200" />

                  {/* Bouton IA */}
                  <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div>
                        <div className="font-bold text-purple-800 text-sm">🤖 Analyse IA instantanée</div>
                        <div className="text-xs text-purple-600">L'IA analyse votre photo et identifie la maladie</div>
                      </div>
                      <button
                        type="button"
                        onClick={analyserAvecIA}
                        disabled={aiLoading}
                        className="btn-primary text-sm px-4 py-2"
                        style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}
                      >
                        {aiLoading ? (
                          <><span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Analyse…</>
                        ) : "🤖 Analyser maintenant"}
                      </button>
                    </div>

                    {/* Résultat IA */}
                    {aiResultat && (
                      <div className="mt-3 p-3 bg-white rounded-xl border border-purple-200 text-sm text-slate-700 leading-relaxed">
                        <div className="font-bold text-purple-700 mb-1">💡 Résultat de l'analyse IA :</div>
                        {aiResultat}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button type="button" onClick={() => cameraRef.current?.click()} className="btn-secondary flex-1 text-sm">
                      📷 Reprendre avec caméra
                    </button>
                    <button type="button" onClick={() => fileRef.current?.click()} className="btn-secondary flex-1 text-sm">
                      🖼️ Choisir une photo
                    </button>
                    <button type="button" onClick={() => { setPreview(null); setPhotoFile(null); setPhotoBase64(null); setAiResultat(null); }} className="btn-danger text-sm px-3">
                      ✕
                    </button>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {/* Caméra directe */}
                  <button
                    type="button"
                    onClick={() => cameraRef.current?.click()}
                    className="upload-zone flex-col gap-2 py-8"
                  >
                    <span className="text-4xl">📷</span>
                    <span className="font-bold text-slate-600 text-sm">Prendre une photo</span>
                    <span className="text-xs text-slate-400">Caméra directe</span>
                  </button>
                  {/* Galerie */}
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="upload-zone flex-col gap-2 py-8"
                  >
                    <span className="text-4xl">🖼️</span>
                    <span className="font-bold text-slate-600 text-sm">Galerie photos</span>
                    <span className="text-xs text-slate-400">Choisir depuis le téléphone</span>
                  </button>
                </div>
              )}

              {/* Input caméra (capture directe) */}
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
              {/* Input galerie */}
              <input ref={fileRef}   type="file" accept="image/*" className="hidden" onChange={handleFile} />
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
                  <option value="faible">🟢 Faible</option>
                  <option value="modere">🟡 Modéré</option>
                  <option value="severe">🔴 Sévère</option>
                  <option value="critique">🚨 Critique</option>
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
              <label className="field-label">Description / Observations</label>
              <textarea className="input" rows={3} value={form.description} onChange={e => set("description", e.target.value)}
                placeholder="Depuis combien de temps ? Quelle partie de la plante ? Conditions météo récentes..." />
            </div>

            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Envoi…</> : "🔬 Envoyer le diagnostic"}
              </button>
              <button type="button" onClick={() => setTab("liste")} className="btn-secondary">Annuler</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// Composant carte diagnostic
function DiagCard({ d, graviteColors, statutColors, canRepondre, role, onRepondre }: any) {
  const [showReponse, setShowReponse] = useState(false);
  const [reponseTexte, setReponseTexte] = useState(d.reponse ?? "");

  return (
    <div className="diag-card">
      {d.photo_url ? (
        <img src={d.photo_url} alt="Photo maladie" className="w-full h-44 object-cover" />
      ) : (
        <div className="diag-img">🌿</div>
      )}
      <div className="diag-body space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="font-bold text-slate-800 text-sm">{d.symptome}</div>
          <span className={`badge ${graviteColors[d.gravite] ?? "badge-slate"} text-[10px]`}>{d.gravite}</span>
        </div>
        {d.culture_affectee && <div className="text-xs text-slate-500">🌾 {d.culture_affectee}</div>}
        {d.champs?.nom      && <div className="text-xs text-slate-500">🗺️ {d.champs.nom}</div>}
        {role === "super_admin" && d.organisations?.nom && (
          <div className="text-xs text-slate-400">🏢 {d.organisations.nom}</div>
        )}
        <div className="flex items-center justify-between pt-1">
          <span className={`badge ${statutColors[d.statut] ?? "badge-slate"} text-[10px]`}>
            {d.statut === "en_attente" ? "⏳ En attente" :
             d.statut === "en_cours"   ? "🔍 En analyse" : "✅ Résolu"}
          </span>
          <span className="text-[11px] text-slate-400">{new Date(d.created_at).toLocaleDateString("fr-FR")}</span>
        </div>

        {/* Réponse existante */}
        {d.reponse && (
          <div className="p-2.5 bg-green-50 border border-green-100 rounded-xl text-xs text-green-800">
            <div className="font-bold mb-1">💡 Analyse :</div>
            {d.reponse}
          </div>
        )}

        {/* Répondre (experts) */}
        {canRepondre && d.statut !== "resolu" && (
          showReponse ? (
            <div className="space-y-2 mt-1">
              <textarea
                className="input text-xs" rows={3}
                value={reponseTexte}
                onChange={e => setReponseTexte(e.target.value)}
                placeholder="Entrez votre diagnostic et les solutions recommandées..."
              />
              <div className="flex gap-2">
                <button onClick={() => onRepondre(d.id, reponseTexte)} className="btn-primary text-xs px-3 py-1.5 flex-1">
                  ✅ Envoyer
                </button>
                <button onClick={() => setShowReponse(false)} className="btn-secondary text-xs px-3 py-1.5">
                  Annuler
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setShowReponse(true)} className="btn-secondary text-xs w-full justify-center mt-1">
              💬 Répondre au diagnostic
            </button>
          )
        )}
      </div>
    </div>
  );
}

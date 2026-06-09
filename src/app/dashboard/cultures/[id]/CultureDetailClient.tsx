"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

function fmt(v: number) { return new Intl.NumberFormat("fr-FR").format(Math.round(v)) + " FCFA"; }
function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString("fr-FR") : "—"; }

const POSTES_DEPENSES = [
  { value: "semences",       label: "🌱 Semences / Plants" },
  { value: "engrais",        label: "🌿 Engrais" },
  { value: "pesticides",     label: "🧪 Pesticides / Traitements" },
  { value: "main_oeuvre",    label: "👷 Main d'œuvre" },
  { value: "irrigation",     label: "💧 Irrigation" },
  { value: "transport",      label: "🚛 Transport" },
  { value: "materiel",       label: "🔧 Matériel / Outillage" },
  { value: "location_terre", label: "🗺️ Location de terre" },
  { value: "autre",          label: "📦 Autre dépense" },
];

interface Props {
  culture: any; intrants: any[]; ventes: any[];
  depensesCulture: any[]; rapports: any[];
  orgId: string; userId: string; role: string;
}

export default function CultureDetailClient({
  culture, intrants, ventes, depensesCulture, rapports, orgId, userId, role
}: Props) {
  const supabase = createClient();
  const [tab, setTab] = useState<"apercu" | "depenses" | "ventes" | "rapports">("apercu");
  const [showDepense, setShowDepense] = useState(false);
  const [showVente,   setShowVente]   = useState(false);
  const [loading, setLoading]         = useState(false);
  const [msg, setMsg]                 = useState<{ text: string; ok: boolean } | null>(null);

  const [formDep, setFormDep] = useState({
    poste: "semences", montant: "", description: "",
    date_depense: new Date().toISOString().split("T")[0],
  });
  const [formVente, setFormVente] = useState({
    quantite: "", unite: "kg", prix_unitaire: "",
    acheteur: "", date_vente: new Date().toISOString().split("T")[0],
  });

  // Toutes les dépenses = intrants + dépenses culture
  const toutesDepenses = [
    ...intrants.map(i => ({ ...i, poste: i.categorie ?? "intrant", montant: i.cout ?? 0, date: i.date_application, source: "intrant" })),
    ...depensesCulture.map(d => ({ ...d, date: d.date_depense, source: "depense" })),
  ];

  const totalDepenses = toutesDepenses.reduce((s, d) => s + (d.montant ?? d.cout ?? 0), 0);
  const totalVentes   = ventes.reduce((s, v) => s + (v.montant_total ?? 0), 0);
  const benefice      = totalVentes - totalDepenses;
  const rentabilite   = totalDepenses > 0 ? ((benefice / totalDepenses) * 100).toFixed(0) : null;

  // Stats par poste de dépense
  const parPoste = POSTES_DEPENSES.map(p => {
    const montant = toutesDepenses
      .filter(d => d.poste === p.value || d.categorie === p.value)
      .reduce((s, d) => s + (d.montant ?? d.cout ?? 0), 0);
    return { ...p, montant };
  }).filter(p => p.montant > 0);

  async function ajouterDepense(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("depenses_culture").insert({
      organisation_id: orgId,
      culture_id: culture.id,
      agent_id: userId,
      poste: formDep.poste,
      montant: parseFloat(formDep.montant),
      description: formDep.description || null,
      date_depense: formDep.date_depense,
    });
    setLoading(false);
    if (error) { setMsg({ text: "Erreur : " + error.message, ok: false }); return; }
    setMsg({ text: "✅ Dépense ajoutée !", ok: true });
    setTimeout(() => { setShowDepense(false); setMsg(null); window.location.reload(); }, 1200);
  }

  async function ajouterVente(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("ventes").insert({
      organisation_id: orgId,
      culture_id: culture.id,
      agent_id: userId,
      quantite: parseFloat(formVente.quantite),
      unite: formVente.unite,
      prix_unitaire: parseFloat(formVente.prix_unitaire),
      montant_total: parseFloat(formVente.quantite) * parseFloat(formVente.prix_unitaire),
      acheteur: formVente.acheteur || null,
      date_vente: formVente.date_vente,
    });
    setLoading(false);
    if (error) { setMsg({ text: "Erreur : " + error.message, ok: false }); return; }
    setMsg({ text: "✅ Vente enregistrée !", ok: true });
    setTimeout(() => { setShowVente(false); setMsg(null); window.location.reload(); }, 1200);
  }

  const statutColor = culture.statut === "en_cours" ? "badge-green" :
                      culture.statut === "planifiee" ? "badge-blue" : "badge-slate";

  return (
    <div className="animate-fade-up space-y-6 max-w-5xl">
      {/* Retour */}
      <Link href="/dashboard/cultures" className="text-sm text-slate-400 hover:text-slate-600">← Retour aux cultures</Link>

      {/* Header */}
      <div className="section-card section-body">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-extrabold text-slate-800">🌾 {culture.type_culture}</h1>
              <span className={`badge ${statutColor}`}>
                {culture.statut === "en_cours" ? "✅ En cours" :
                 culture.statut === "planifiee" ? "📅 Planifiée" : "🏁 Récoltée"}
              </span>
            </div>
            {culture.variete && <p className="text-slate-500 text-sm mt-1">Variété : {culture.variete}</p>}
            <div className="flex gap-2 mt-2 flex-wrap text-xs text-slate-500">
              <span>🗺️ {(culture.champs as any)?.nom ?? "—"}</span>
              {(culture.champs as any)?.localisation && <span>📍 {(culture.champs as any).localisation}</span>}
              {culture.date_semis && <span>🌱 Semis : {fmtDate(culture.date_semis)}</span>}
              {culture.date_recolte_prevue && <span>🏁 Récolte : {fmtDate(culture.date_recolte_prevue)}</span>}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setShowDepense(true)} className="btn-secondary text-sm">💸 Ajouter dépense</button>
            <button onClick={() => setShowVente(true)} className="btn-primary text-sm">💵 Enregistrer vente</button>
          </div>
        </div>

        {/* Bilan financier */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-center">
            <div className="text-xs text-red-500 font-bold uppercase tracking-wider mb-1">💸 Dépenses totales</div>
            <div className="text-xl font-extrabold text-red-700">{fmt(totalDepenses)}</div>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
            <div className="text-xs text-green-500 font-bold uppercase tracking-wider mb-1">💵 Ventes totales</div>
            <div className="text-xl font-extrabold text-green-700">{fmt(totalVentes)}</div>
          </div>
          <div className={`border rounded-xl p-4 text-center ${benefice >= 0 ? "bg-teal-50 border-teal-100" : "bg-amber-50 border-amber-100"}`}>
            <div className={`text-xs font-bold uppercase tracking-wider mb-1 ${benefice >= 0 ? "text-teal-500" : "text-amber-500"}`}>
              📊 Bénéfice net
            </div>
            <div className={`text-xl font-extrabold ${benefice >= 0 ? "text-teal-700" : "text-amber-700"}`}>
              {benefice >= 0 ? "+" : ""}{fmt(benefice)}
            </div>
            {rentabilite && (
              <div className={`text-xs mt-1 font-semibold ${benefice >= 0 ? "text-teal-500" : "text-amber-500"}`}>
                ROI : {benefice >= 0 ? "+" : ""}{rentabilite}%
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar max-w-md">
        {[
          { key: "apercu",   label: "📊 Aperçu" },
          { key: "depenses", label: `💸 Dépenses (${toutesDepenses.length})` },
          { key: "ventes",   label: `💵 Ventes (${ventes.length})` },
          { key: "rapports", label: `📋 Rapports (${rapports.length})` },
        ].map(t => (
          <button key={t.key} className={`tab-btn ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key as any)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* APERÇU */}
      {tab === "apercu" && (
        <div className="space-y-4">
          {parPoste.length > 0 && (
            <div className="section-card section-body">
              <h3 className="font-bold text-slate-700 text-sm mb-4">💸 Dépenses par poste</h3>
              <div className="space-y-3">
                {parPoste.sort((a, b) => b.montant - a.montant).map(p => (
                  <div key={p.value}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-slate-700">{p.label}</span>
                      <span className="font-bold text-slate-800">{fmt(p.montant)}</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-fill bg-red-400" style={{ width: `${totalDepenses > 0 ? (p.montant / totalDepenses) * 100 : 0}%`, background: "linear-gradient(90deg,#f87171,#ef4444)" }} />
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5 text-right">
                      {totalDepenses > 0 ? ((p.montant / totalDepenses) * 100).toFixed(0) : 0}% des dépenses
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {culture.quantite_semences && (
            <div className="section-card section-body">
              <h3 className="font-bold text-slate-700 text-sm mb-3">📦 Informations de production</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3">
                  <div className="text-xs text-slate-400 mb-1">Semences utilisées</div>
                  <div className="font-bold text-slate-700">{culture.quantite_semences}</div>
                </div>
                {culture.rendement_estime && (
                  <div className="bg-slate-50 rounded-xl p-3">
                    <div className="text-xs text-slate-400 mb-1">Rendement estimé</div>
                    <div className="font-bold text-slate-700">{culture.rendement_estime} t/ha</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* DÉPENSES */}
      {tab === "depenses" && (
        <div className="section-card overflow-hidden">
          <div className="section-header">
            <h2 className="font-bold text-slate-800 text-sm">💸 Toutes les dépenses</h2>
            <button onClick={() => setShowDepense(true)} className="btn-primary text-xs px-3 py-1.5">+ Ajouter</button>
          </div>
          {toutesDepenses.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              Aucune dépense enregistrée
              <br/>
              <button onClick={() => setShowDepense(true)} className="btn-primary mt-3 text-sm">+ Ajouter une dépense</button>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>Poste</th><th>Description</th><th>Date</th><th>Montant</th></tr>
              </thead>
              <tbody>
                {toutesDepenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((d, i) => (
                  <tr key={i}>
                    <td>
                      <span className="badge badge-red text-[10px]">
                        {POSTES_DEPENSES.find(p => p.value === (d.poste ?? d.categorie))?.label ?? d.poste ?? d.categorie ?? "—"}
                      </span>
                    </td>
                    <td className="text-slate-500">{d.description ?? d.produit ?? "—"}</td>
                    <td>{fmtDate(d.date)}</td>
                    <td className="font-bold text-red-600">{fmt(d.montant ?? d.cout ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="text-right font-bold text-slate-700 pr-4">Total :</td>
                  <td className="font-extrabold text-red-700">{fmt(totalDepenses)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {/* VENTES */}
      {tab === "ventes" && (
        <div className="section-card overflow-hidden">
          <div className="section-header">
            <h2 className="font-bold text-slate-800 text-sm">💵 Ventes de cette culture</h2>
            <button onClick={() => setShowVente(true)} className="btn-primary text-xs px-3 py-1.5">+ Ajouter</button>
          </div>
          {ventes.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              Aucune vente enregistrée
              <br/>
              <button onClick={() => setShowVente(true)} className="btn-primary mt-3 text-sm">+ Enregistrer une vente</button>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>Date</th><th>Quantité</th><th>Prix unit.</th><th>Acheteur</th><th>Total</th></tr>
              </thead>
              <tbody>
                {ventes.map(v => (
                  <tr key={v.id}>
                    <td>{fmtDate(v.date_vente)}</td>
                    <td>{v.quantite} {v.unite}</td>
                    <td className="text-slate-500">{fmt(v.prix_unitaire)}/{v.unite}</td>
                    <td className="text-slate-500">{v.acheteur ?? "—"}</td>
                    <td className="font-bold text-green-700">{fmt(v.montant_total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="text-right font-bold text-slate-700 pr-4">Total :</td>
                  <td className="font-extrabold text-green-700">{fmt(totalVentes)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {/* RAPPORTS */}
      {tab === "rapports" && (
        <div className="section-card overflow-hidden">
          <div className="section-header">
            <h2 className="font-bold text-slate-800 text-sm">📋 Rapports terrain</h2>
            <Link href="/dashboard/agents/nouveau" className="btn-primary text-xs px-3 py-1.5">+ Rapport</Link>
          </div>
          {rapports.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">Aucun rapport pour cette culture</div>
          ) : (
            <table className="data-table">
              <thead><tr><th>Titre</th><th>Agent</th><th>Date</th></tr></thead>
              <tbody>
                {rapports.map(r => (
                  <tr key={r.id}>
                    <td className="font-semibold">{r.titre}</td>
                    <td className="text-slate-500">{(r.profils as any)?.nom_complet ?? "—"}</td>
                    <td>{fmtDate(r.date_intervention)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal dépense */}
      {showDepense && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fade-up">
            <h3 className="font-extrabold text-slate-800 text-lg mb-4">💸 Ajouter une dépense</h3>
            {msg && <div className={`mb-3 p-3 rounded-xl text-sm ${msg.ok ? "alert-success" : "alert-urgent"}`}>{msg.text}</div>}
            <form onSubmit={ajouterDepense} className="space-y-4">
              <div>
                <label className="field-label">Poste de dépense *</label>
                <select className="input" value={formDep.poste} onChange={e => setFormDep(f => ({ ...f, poste: e.target.value }))}>
                  {POSTES_DEPENSES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Montant (FCFA) *</label>
                  <input className="input" type="number" step="any" value={formDep.montant} onChange={e => setFormDep(f => ({ ...f, montant: e.target.value }))} placeholder="Ex : 15000" required />
                </div>
                <div>
                  <label className="field-label">Date *</label>
                  <input className="input" type="date" value={formDep.date_depense} onChange={e => setFormDep(f => ({ ...f, date_depense: e.target.value }))} required />
                </div>
              </div>
              <div>
                <label className="field-label">Description</label>
                <input className="input" value={formDep.description} onChange={e => setFormDep(f => ({ ...f, description: e.target.value }))} placeholder="Ex : 3 ouvriers pour 2 jours, achat semences..." />
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
                  {loading ? "…" : "✅ Enregistrer"}
                </button>
                <button type="button" onClick={() => setShowDepense(false)} className="btn-secondary">Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal vente */}
      {showVente && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fade-up">
            <h3 className="font-extrabold text-slate-800 text-lg mb-4">💵 Enregistrer une vente</h3>
            {msg && <div className={`mb-3 p-3 rounded-xl text-sm ${msg.ok ? "alert-success" : "alert-urgent"}`}>{msg.text}</div>}
            <form onSubmit={ajouterVente} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="field-label">Quantité *</label>
                  <input className="input" type="number" step="any" value={formVente.quantite} onChange={e => setFormVente(f => ({ ...f, quantite: e.target.value }))} placeholder="Ex : 500" required />
                </div>
                <div>
                  <label className="field-label">Unité</label>
                  <select className="input" value={formVente.unite} onChange={e => setFormVente(f => ({ ...f, unite: e.target.value }))}>
                    <option value="kg">kg</option>
                    <option value="tonne">tonne</option>
                    <option value="sac">sac</option>
                    <option value="litre">litre</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Prix unitaire (FCFA) *</label>
                  <input className="input" type="number" step="any" value={formVente.prix_unitaire} onChange={e => setFormVente(f => ({ ...f, prix_unitaire: e.target.value }))} placeholder="Ex : 250" required />
                </div>
                <div>
                  <label className="field-label">Total</label>
                  <div className="input bg-slate-50 font-bold text-green-700">
                    {formVente.quantite && formVente.prix_unitaire ? fmt(parseFloat(formVente.quantite) * parseFloat(formVente.prix_unitaire)) : "—"}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Acheteur</label>
                  <input className="input" value={formVente.acheteur} onChange={e => setFormVente(f => ({ ...f, acheteur: e.target.value }))} placeholder="Marché, nom acheteur..." />
                </div>
                <div>
                  <label className="field-label">Date *</label>
                  <input className="input" type="date" value={formVente.date_vente} onChange={e => setFormVente(f => ({ ...f, date_vente: e.target.value }))} required />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
                  {loading ? "…" : "✅ Enregistrer"}
                </button>
                <button type="button" onClick={() => setShowVente(false)} className="btn-secondary">Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

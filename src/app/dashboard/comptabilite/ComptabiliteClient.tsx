"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

function fmt(v: number) { return new Intl.NumberFormat("fr-FR").format(Math.round(v)) + " FCFA"; }
function fmtDate(d: string) { return d ? new Date(d).toLocaleDateString("fr-FR") : "—"; }

interface Props {
  ventes: any[]; depenses: any[]; cultures: any[];
  orgId: string; userId: string;
}

export default function ComptabiliteClient({ ventes: initVentes, depenses, cultures, orgId, userId }: Props) {
  const supabase = createClient();
  const [tab, setTab] = useState<"resume" | "ventes" | "depenses">("resume");
  const [ventes, setVentes] = useState(initVentes);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [form, setForm] = useState({
    culture_id: cultures[0]?.id ?? "",
    quantite: "", unite: "kg", prix_unitaire: "",
    acheteur: "", date_vente: new Date().toISOString().split("T")[0],
    notes: "",
  });

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  const totalVentes   = ventes.reduce((s, v) => s + (v.montant_total ?? 0), 0);
  const totalDepenses = depenses.reduce((s, d) => s + (d.cout ?? 0), 0);
  const benefice      = totalVentes - totalDepenses;

  async function ajouterVente(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setMsg(null);
    const montant = parseFloat(form.quantite) * parseFloat(form.prix_unitaire);
    const { data, error } = await supabase.from("ventes").insert({
      organisation_id: orgId,
      agent_id: userId,
      culture_id: form.culture_id || null,
      quantite: parseFloat(form.quantite),
      unite: form.unite,
      prix_unitaire: parseFloat(form.prix_unitaire),
      montant_total: montant,
      acheteur: form.acheteur || null,
      date_vente: form.date_vente,
      notes: form.notes || null,
    }).select("*, cultures(type_culture), champs(nom)").single();

    setLoading(false);
    if (error) { setMsg({ text: "Erreur : " + error.message, ok: false }); return; }
    setVentes(prev => [data, ...prev]);
    setMsg({ text: "✅ Vente enregistrée !", ok: true });
    setForm({ culture_id: cultures[0]?.id ?? "", quantite: "", unite: "kg", prix_unitaire: "", acheteur: "", date_vente: new Date().toISOString().split("T")[0], notes: "" });
    setTimeout(() => { setShowForm(false); setMsg(null); }, 1500);
  }

  // Stats par culture
  const statsParCulture = cultures.map(c => {
    const ventesC   = ventes.filter(v => v.culture_id === c.id);
    const depensesC = depenses.filter(d => d.culture_id === c.id);
    return {
      nom: c.type_culture,
      champ: (c.champs as any)?.nom ?? "—",
      ventes: ventesC.reduce((s, v) => s + (v.montant_total ?? 0), 0),
      depenses: depensesC.reduce((s, d) => s + (d.cout ?? 0), 0),
    };
  }).filter(s => s.ventes > 0 || s.depenses > 0);

  return (
    <div className="animate-fade-up space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="page-header mb-0">
          <h1 className="text-2xl font-extrabold text-slate-800">💰 Comptabilité</h1>
          <p className="text-slate-500 text-sm">Ventes, dépenses et bilan de vos cultures</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">➕ Enregistrer une vente</button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card stat-green">
          <div className="flex items-center gap-3 mb-3">
            <div className="icon-box icon-green">💵</div>
            <span className="text-sm font-semibold text-green-700">Total ventes</span>
          </div>
          <div className="text-2xl font-extrabold text-green-800">{fmt(totalVentes)}</div>
          <div className="text-xs text-green-600 mt-1">{ventes.length} transaction(s)</div>
        </div>
        <div className="stat-card stat-red">
          <div className="flex items-center gap-3 mb-3">
            <div className="icon-box icon-red">💸</div>
            <span className="text-sm font-semibold text-red-700">Total dépenses</span>
          </div>
          <div className="text-2xl font-extrabold text-red-800">{fmt(totalDepenses)}</div>
          <div className="text-xs text-red-600 mt-1">Intrants & traitements</div>
        </div>
        <div className={`stat-card ${benefice >= 0 ? "stat-teal" : "stat-amber"}`}>
          <div className="flex items-center gap-3 mb-3">
            <div className={`icon-box ${benefice >= 0 ? "icon-teal" : "icon-amber"}`}>📊</div>
            <span className={`text-sm font-semibold ${benefice >= 0 ? "text-teal-700" : "text-amber-700"}`}>Bénéfice net</span>
          </div>
          <div className={`text-2xl font-extrabold ${benefice >= 0 ? "text-teal-800" : "text-amber-800"}`}>
            {benefice >= 0 ? "+" : ""}{fmt(benefice)}
          </div>
          <div className={`text-xs mt-1 ${benefice >= 0 ? "text-teal-600" : "text-amber-600"}`}>
            {benefice >= 0 ? "✅ Bénéficiaire" : "⚠️ Déficitaire"}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tab-bar max-w-sm">
        {[
          { key: "resume",   label: "📊 Résumé" },
          { key: "ventes",   label: `💵 Ventes (${ventes.length})` },
          { key: "depenses", label: `💸 Dépenses (${depenses.length})` },
        ].map(t => (
          <button key={t.key} className={`tab-btn ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key as any)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* RÉSUMÉ par culture */}
      {tab === "resume" && (
        <div className="section-card overflow-hidden">
          <div className="section-header">
            <h2 className="font-bold text-slate-800 text-sm">📊 Bilan par culture</h2>
          </div>
          {statsParCulture.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">Aucune donnée — enregistrez vos ventes et intrants</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>Culture</th><th>Champ</th><th>Ventes</th><th>Dépenses</th><th>Bénéfice</th></tr>
              </thead>
              <tbody>
                {statsParCulture.map((s, i) => {
                  const ben = s.ventes - s.depenses;
                  return (
                    <tr key={i}>
                      <td className="font-bold">🌾 {s.nom}</td>
                      <td className="text-slate-500">{s.champ}</td>
                      <td className="text-green-700 font-semibold">{fmt(s.ventes)}</td>
                      <td className="text-red-600 font-semibold">{fmt(s.depenses)}</td>
                      <td className={`font-bold ${ben >= 0 ? "text-teal-700" : "text-amber-700"}`}>
                        {ben >= 0 ? "+" : ""}{fmt(ben)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* VENTES */}
      {tab === "ventes" && (
        <div className="section-card overflow-hidden">
          <div className="section-header">
            <h2 className="font-bold text-slate-800 text-sm">💵 Historique des ventes</h2>
          </div>
          {ventes.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              Aucune vente enregistrée
              <br/>
              <button onClick={() => setShowForm(true)} className="btn-primary mt-3 text-sm">➕ Enregistrer une vente</button>
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>Date</th><th>Culture</th><th>Quantité</th><th>Prix unit.</th><th>Total</th><th>Acheteur</th></tr>
              </thead>
              <tbody>
                {ventes.map(v => (
                  <tr key={v.id}>
                    <td>{fmtDate(v.date_vente)}</td>
                    <td className="font-semibold">{(v.cultures as any)?.type_culture ?? "—"}</td>
                    <td className="text-slate-500">{v.quantite} {v.unite}</td>
                    <td className="text-slate-500">{fmt(v.prix_unitaire)}/{v.unite}</td>
                    <td className="font-bold text-green-700">{fmt(v.montant_total)}</td>
                    <td className="text-slate-500">{v.acheteur ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* DÉPENSES */}
      {tab === "depenses" && (
        <div className="section-card overflow-hidden">
          <div className="section-header">
            <h2 className="font-bold text-slate-800 text-sm">💸 Dépenses (intrants)</h2>
          </div>
          {depenses.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">Aucune dépense enregistrée</div>
          ) : (
            <table className="data-table">
              <thead>
                <tr><th>Date</th><th>Produit</th><th>Catégorie</th><th>Quantité</th><th>Coût</th></tr>
              </thead>
              <tbody>
                {depenses.map(d => (
                  <tr key={d.id}>
                    <td>{fmtDate(d.date_application)}</td>
                    <td className="font-semibold">{d.produit}</td>
                    <td><span className="badge badge-blue text-[10px]">{d.categorie}</span></td>
                    <td className="text-slate-500">{d.quantite ?? "—"}</td>
                    <td className="font-bold text-red-600">{fmt(d.cout ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal nouvelle vente */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 animate-fade-up">
            <h3 className="font-extrabold text-slate-800 text-lg mb-5">💵 Enregistrer une vente</h3>

            {msg && (
              <div className={`mb-4 p-3 rounded-xl text-sm ${msg.ok ? "alert-success" : "alert-urgent"}`}>{msg.text}</div>
            )}

            <form onSubmit={ajouterVente} className="space-y-4">
              <div>
                <label className="field-label">Culture vendue *</label>
                <select className="input" value={form.culture_id} onChange={e => set("culture_id", e.target.value)}>
                  <option value="">— Sélectionner —</option>
                  {cultures.map(c => (
                    <option key={c.id} value={c.id}>{c.type_culture} — {(c.champs as any)?.nom ?? "?"}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="field-label">Quantité vendue *</label>
                  <input className="input" type="number" step="any" value={form.quantite} onChange={e => set("quantite", e.target.value)} placeholder="Ex : 500" required />
                </div>
                <div>
                  <label className="field-label">Unité</label>
                  <select className="input" value={form.unite} onChange={e => set("unite", e.target.value)}>
                    <option value="kg">kg</option>
                    <option value="tonne">tonne</option>
                    <option value="sac">sac</option>
                    <option value="litre">litre</option>
                    <option value="carton">carton</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Prix unitaire (FCFA) *</label>
                  <input className="input" type="number" step="any" value={form.prix_unitaire} onChange={e => set("prix_unitaire", e.target.value)} placeholder="Ex : 250" required />
                </div>
                <div>
                  <label className="field-label">Montant total</label>
                  <div className="input bg-slate-50 font-bold text-green-700">
                    {form.quantite && form.prix_unitaire
                      ? fmt(parseFloat(form.quantite) * parseFloat(form.prix_unitaire))
                      : "—"}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label">Acheteur</label>
                  <input className="input" value={form.acheteur} onChange={e => set("acheteur", e.target.value)} placeholder="Nom du marché ou acheteur" />
                </div>
                <div>
                  <label className="field-label">Date de vente *</label>
                  <input className="input" type="date" value={form.date_vente} onChange={e => set("date_vente", e.target.value)} required />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
                  {loading ? <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Enregistrement…</> : "✅ Enregistrer la vente"}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";
import { useState, useRef } from "react";

function fmtMoney(v: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(v)) + " FCFA";
}
function fmtDate(d: string) {
  return d ? new Date(d).toLocaleDateString("fr-FR") : "—";
}

interface Props {
  champs: any[]; cultures: any[]; intrants: any[];
  rapports: any[]; org: any; orgs: any[];
  isSuperAdmin: boolean; orgId: string;
}

export default function RapportsClient({ champs, cultures, intrants, rapports, org, orgs, isSuperAdmin }: Props) {
  const [tab, setTab] = useState<"apercu" | "cultures" | "intrants" | "agents">("apercu");
  const [generating, setGenerating] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const totalDepenses = intrants.reduce((s, i) => s + (i.cout ?? 0), 0);
  const culturesActives = cultures.filter(c => c.statut === "en_cours").length;
  const surfaceTotale = champs.reduce((s, c) => s + (c.surface_ha ?? 0), 0);

  async function genererPDF() {
    setGenerating(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: html2canvas } = await import("html2canvas");

      const element = printRef.current;
      if (!element) return;

      const canvas = await html2canvas(element, {
        scale: 2, useCORS: true, logging: false,
        backgroundColor: "#ffffff",
      });

      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgH  = (canvas.height * pageW) / canvas.width;

      // Si le contenu dépasse une page
      let y = 0;
      while (y < imgH) {
        if (y > 0) pdf.addPage();
        pdf.addImage(
          canvas.toDataURL("image/jpeg", 0.95),
          "JPEG", 0, -y, pageW, imgH
        );
        y += pageH;
      }

      const date = new Date().toLocaleDateString("fr-FR").replace(/\//g, "-");
      pdf.save(`Rapport_AgriSaaS_${org?.nom ?? "client"}_${date}.pdf`);
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="animate-fade-up space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="page-header mb-0">
          <h1 className="text-2xl font-extrabold text-slate-800">📊 Rapports</h1>
          <p className="text-slate-500 text-sm">{org?.nom} · Générez et exportez vos rapports en PDF</p>
        </div>
        <button onClick={genererPDF} disabled={generating} className="btn-primary">
          {generating ? (
            <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Génération…</>
          ) : "⬇️ Télécharger en PDF"}
        </button>
      </div>

      {/* Tabs */}
      <div className="tab-bar max-w-lg">
        {[
          { key: "apercu",   label: "📋 Aperçu général" },
          { key: "cultures", label: "🌾 Cultures" },
          { key: "intrants", label: "🧪 Intrants" },
          { key: "agents",   label: "👷 Agents" },
        ].map(t => (
          <button key={t.key} className={`tab-btn ${tab === t.key ? "active" : ""}`} onClick={() => setTab(t.key as any)}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Contenu imprimable */}
      <div ref={printRef} className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm space-y-8">

        {/* En-tête du rapport */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center text-white text-xl">🌿</div>
              <div>
                <div className="font-extrabold text-slate-800 text-xl">AgriSaaS</div>
                <div className="text-slate-400 text-xs">Plateforme agricole · Mali</div>
              </div>
            </div>
            <h2 className="text-2xl font-extrabold text-slate-800 mt-3">{org?.nom}</h2>
            <p className="text-slate-500 text-sm">{org?.pays}</p>
          </div>
          <div className="text-right text-sm text-slate-500">
            <div className="font-bold text-slate-700">Rapport mensuel</div>
            <div>{new Date().toLocaleDateString("fr-FR", { year: "numeric", month: "long" })}</div>
            <div className="text-xs mt-1">Généré le {new Date().toLocaleDateString("fr-FR")}</div>
          </div>
        </div>

        {/* KPIs */}
        <div>
          <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-4">📈 Résumé de la période</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Champs", value: champs.length, icon: "🗺️", color: "bg-green-50 border-green-100" },
              { label: "Cultures actives", value: culturesActives, icon: "🌾", color: "bg-blue-50 border-blue-100" },
              { label: "Surface totale", value: `${surfaceTotale.toFixed(1)} ha`, icon: "📐", color: "bg-amber-50 border-amber-100" },
              { label: "Dépenses intrants", value: fmtMoney(totalDepenses), icon: "💰", color: "bg-red-50 border-red-100" },
            ].map(k => (
              <div key={k.label} className={`rounded-xl p-4 border ${k.color}`}>
                <div className="text-2xl mb-1">{k.icon}</div>
                <div className="text-xl font-extrabold text-slate-800">{k.value}</div>
                <div className="text-xs text-slate-500 font-medium mt-0.5">{k.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Cultures */}
        {(tab === "apercu" || tab === "cultures") && cultures.length > 0 && (
          <div>
            <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-4">🌾 Cultures</h3>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Culture</th><th>Variété</th><th>Champ</th>
                  <th>Date semis</th><th>Récolte prévue</th><th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {cultures.slice(0, tab === "apercu" ? 5 : 100).map(c => (
                  <tr key={c.id}>
                    <td className="font-semibold">{c.type_culture}</td>
                    <td className="text-slate-500">{c.variete ?? "—"}</td>
                    <td>{(c.champs as any)?.nom ?? "—"}</td>
                    <td>{fmtDate(c.date_semis)}</td>
                    <td>{fmtDate(c.date_recolte_prevue)}</td>
                    <td>
                      <span className={`badge text-[10px] ${
                        c.statut === "en_cours"   ? "badge-green" :
                        c.statut === "planifiee"  ? "badge-blue"  :
                        c.statut === "recoltee"   ? "badge-slate" : "badge-amber"
                      }`}>
                        {c.statut === "en_cours"  ? "En cours" :
                         c.statut === "planifiee" ? "Planifiée" :
                         c.statut === "recoltee"  ? "Récoltée" : c.statut}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Intrants */}
        {(tab === "apercu" || tab === "intrants") && intrants.length > 0 && (
          <div>
            <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-4">🧪 Intrants utilisés</h3>
            <table className="data-table">
              <thead>
                <tr><th>Produit</th><th>Catégorie</th><th>Quantité</th><th>Date</th><th>Coût</th></tr>
              </thead>
              <tbody>
                {intrants.slice(0, tab === "apercu" ? 5 : 100).map(i => (
                  <tr key={i.id}>
                    <td className="font-semibold">{i.produit}</td>
                    <td><span className="badge badge-blue text-[10px]">{i.categorie}</span></td>
                    <td className="text-slate-500">{i.quantite ?? "—"}</td>
                    <td>{fmtDate(i.date_application)}</td>
                    <td className="font-bold text-green-700">{fmtMoney(i.cout ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className="font-bold text-slate-700 text-right pr-4">Total dépenses :</td>
                  <td className="font-extrabold text-green-700">{fmtMoney(totalDepenses)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Rapports agents */}
        {(tab === "apercu" || tab === "agents") && rapports.length > 0 && (
          <div>
            <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wider mb-4">👷 Rapports terrain</h3>
            <table className="data-table">
              <thead>
                <tr><th>Titre</th><th>Agent</th><th>Champ</th><th>Date</th></tr>
              </thead>
              <tbody>
                {rapports.slice(0, tab === "apercu" ? 5 : 100).map(r => (
                  <tr key={r.id}>
                    <td className="font-semibold">{r.titre}</td>
                    <td className="text-slate-500">{(r.profils as any)?.nom_complet ?? "—"}</td>
                    <td>{(r.champs as any)?.nom ?? "—"}</td>
                    <td>{fmtDate(r.date_intervention)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pied de page */}
        <div className="border-t border-slate-100 pt-4 flex justify-between items-center text-xs text-slate-400">
          <span>AgriSaaS · {org?.nom}</span>
          <span>Rapport généré le {new Date().toLocaleDateString("fr-FR")}</span>
          <span>agri-saas-five.vercel.app</span>
        </div>
      </div>
    </div>
  );
}

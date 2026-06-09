"use client";
import { useState } from "react";

function fmtMoney(v: number) {
  return new Intl.NumberFormat("fr-FR").format(Math.round(v)) + " FCFA";
}
function jrsRestants(dateFin: string) {
  if (!dateFin) return null;
  const diff = new Date(dateFin).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

interface Props {
  abonnement: any;
  paiements: any[];
  org: any;
  profil: any;
  orgId: string;
}

export default function AbonnementClient({ abonnement, paiements, org, profil, orgId }: Props) {
  const [showPaiement, setShowPaiement] = useState(false);
  const [telephone, setTelephone] = useState(profil?.telephone ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const montant = abonnement?.montant_mensuel ?? 5000;
  const jrs = abonnement?.date_fin ? jrsRestants(abonnement.date_fin) : null;

  async function payerOrangeMoney() {
    if (!telephone) { setMessage({ text: "Entrez votre numéro Orange Money", ok: false }); return; }
    setLoading(true); setMessage(null);

    const res = await fetch("/api/paiement/initier", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telephone_om: telephone, montant, organisation_id: orgId }),
    });
    const data = await res.json();
    setLoading(false);

    if (data.sandbox) {
      setMessage({ text: "✅ Mode test : paiement simulé avec succès ! L'abonnement sera renouvelé.", ok: true });
      setShowPaiement(false);
      return;
    }
    if (data.payment_url) {
      window.location.href = data.payment_url;
      return;
    }
    setMessage({ text: data.error ?? "Erreur lors du paiement", ok: false });
  }

  const statutColor = {
    actif:     { bg: "bg-green-50 border-green-200", badge: "badge-green", dot: "active" },
    en_retard: { bg: "bg-amber-50 border-amber-200", badge: "badge-amber", dot: "warning" },
    suspendu:  { bg: "bg-red-50 border-red-200",     badge: "badge-red",   dot: "danger" },
    resilie:   { bg: "bg-slate-50 border-slate-200", badge: "badge-slate", dot: "idle" },
  }[abonnement?.statut ?? "actif"] ?? { bg: "bg-slate-50 border-slate-200", badge: "badge-slate", dot: "idle" };

  return (
    <div className="animate-fade-up space-y-6 max-w-3xl">
      {/* Header */}
      <div className="page-header">
        <h1 className="text-2xl font-extrabold text-slate-800">💳 Mon abonnement</h1>
        <p className="text-slate-500 text-sm">{org?.nom} — Plateforme AgriSaaS</p>
      </div>

      {/* Carte statut principal */}
      {abonnement ? (
        <div className={`section-card section-body border-2 ${statutColor.bg}`}>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="icon-box icon-green text-3xl">💳</div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-extrabold text-slate-800 text-xl capitalize">Plan {abonnement.plan}</h2>
                  <span className={`badge ${statutColor.badge}`}>
                    <span className={`status-dot ${statutColor.dot}`} />
                    {abonnement.statut === "actif" ? "Actif" :
                     abonnement.statut === "en_retard" ? "En retard" :
                     abonnement.statut === "suspendu" ? "Suspendu" : "Résilié"}
                  </span>
                </div>
                <p className="text-slate-500 text-sm mt-0.5">{fmtMoney(montant)} / mois</p>
              </div>
            </div>
            <button onClick={() => setShowPaiement(true)} className="btn-primary">
              📱 Payer via Orange Money
            </button>
          </div>

          {/* Barre de progression */}
          {jrs !== null && abonnement.statut === "actif" && (
            <div className="mt-5">
              <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                <span>Période en cours</span>
                <span className={jrs <= 5 ? "text-red-500 font-bold" : ""}>{jrs > 0 ? `${jrs} jours restants` : "Expiré"}</span>
              </div>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${Math.min(100, Math.max(0, (jrs / 30) * 100))}%` }} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-5">
            <div className="bg-white/70 rounded-xl p-3 border border-white">
              <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider mb-1">Début</div>
              <div className="font-bold text-slate-700 text-sm">
                {new Date(abonnement.date_debut).toLocaleDateString("fr-FR")}
              </div>
            </div>
            <div className="bg-white/70 rounded-xl p-3 border border-white">
              <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider mb-1">Fin / Renouvellement</div>
              <div className={`font-bold text-sm ${jrs !== null && jrs <= 5 ? "text-red-600" : "text-slate-700"}`}>
                {abonnement.date_fin ? new Date(abonnement.date_fin).toLocaleDateString("fr-FR") : "—"}
              </div>
            </div>
            <div className="bg-white/70 rounded-xl p-3 border border-white">
              <div className="text-[11px] text-slate-400 uppercase font-bold tracking-wider mb-1">Paiements</div>
              <div className="font-bold text-slate-700 text-sm">{paiements.length} effectué(s)</div>
            </div>
          </div>

          {/* Alertes */}
          {abonnement.statut === "en_retard" && (
            <div className="alert-warn mt-4 text-sm flex items-start gap-2">
              <span>⚠️</span>
              <div>
                <strong>Paiement en retard.</strong> Veuillez régler votre abonnement pour éviter la suspension de votre compte.
              </div>
            </div>
          )}
          {abonnement.statut === "suspendu" && (
            <div className="alert-urgent mt-4 text-sm flex items-start gap-2">
              <span>🚫</span>
              <div>
                <strong>Compte suspendu.</strong> Payez votre abonnement pour rétablir l'accès complet.
              </div>
            </div>
          )}
          {jrs !== null && jrs <= 5 && jrs > 0 && abonnement.statut === "actif" && (
            <div className="alert-warn mt-4 text-sm flex items-start gap-2">
              <span>⏰</span>
              <div>
                <strong>Abonnement expire dans {jrs} jour(s).</strong> Renouvelez maintenant pour ne pas perdre l'accès.
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="section-card section-body text-center py-12">
          <div className="text-5xl mb-4">💳</div>
          <h3 className="font-bold text-slate-700 text-lg">Aucun abonnement actif</h3>
          <p className="text-slate-400 text-sm mt-1 mb-5">Contactez Main Verte pour activer votre abonnement</p>
          <button onClick={() => setShowPaiement(true)} className="btn-primary">
            📱 Payer via Orange Money
          </button>
        </div>
      )}

      {/* Modal paiement Orange Money */}
      {showPaiement && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fade-up">
            {/* Header Orange */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-xl bg-orange-500 flex items-center justify-center text-white text-2xl font-black">
                OM
              </div>
              <div>
                <h3 className="font-extrabold text-slate-800 text-lg">Payer via Orange Money</h3>
                <p className="text-slate-500 text-sm">Paiement sécurisé depuis votre téléphone</p>
              </div>
            </div>

            {message && (
              <div className={`mb-4 p-3 rounded-xl text-sm font-medium ${message.ok ? "alert-success" : "alert-urgent"}`}>
                {message.text}
              </div>
            )}

            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 mb-5">
              <div className="flex justify-between items-center">
                <span className="text-slate-600 font-medium">Montant à payer</span>
                <span className="text-2xl font-extrabold text-orange-600">{fmtMoney(montant)}</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">Abonnement mensuel AgriSaaS — Plan {abonnement?.plan ?? "standard"}</div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="field-label">📱 Numéro Orange Money *</label>
                <input
                  className="input text-lg font-bold tracking-wider"
                  type="tel"
                  placeholder="Ex : +224 622 00 00 00"
                  value={telephone}
                  onChange={e => setTelephone(e.target.value)}
                />
                <p className="text-xs text-slate-400 mt-1">
                  Vous recevrez une notification de confirmation sur ce numéro
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-500 space-y-1">
                <div className="font-bold text-slate-600 mb-1">Comment ça marche :</div>
                <div>1️⃣ Entrez votre numéro Orange Money</div>
                <div>2️⃣ Cliquez sur "Confirmer le paiement"</div>
                <div>3️⃣ Vous recevrez une notification sur votre téléphone</div>
                <div>4️⃣ Confirmez avec votre code PIN Orange Money</div>
                <div>5️⃣ Votre abonnement est renouvelé automatiquement ✅</div>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={payerOrangeMoney}
                disabled={loading}
                className="btn-primary flex-1 justify-center py-3 bg-orange-500 hover:bg-orange-600"
                style={{ background: loading ? "#f97316" : "linear-gradient(135deg,#f97316,#ea580c)" }}
              >
                {loading ? (
                  <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Traitement…</>
                ) : "✅ Confirmer le paiement"}
              </button>
              <button onClick={() => setShowPaiement(false)} className="btn-secondary">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Historique paiements */}
      <div className="section-card overflow-hidden">
        <div className="section-header">
          <h2 className="font-bold text-slate-800 text-[15px]">🧾 Historique des paiements</h2>
        </div>
        {paiements.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">Aucun paiement enregistré</div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Montant</th>
                <th>Méthode</th>
                <th>Statut</th>
                <th>Référence</th>
              </tr>
            </thead>
            <tbody>
              {paiements.map((p: any) => (
                <tr key={p.id}>
                  <td>{new Date(p.created_at).toLocaleDateString("fr-FR")}</td>
                  <td className="font-bold text-green-700">{fmtMoney(p.montant)}</td>
                  <td>
                    <span className="badge badge-amber text-[11px]">
                      📱 {p.methode === "orange_money" ? "Orange Money" : p.methode ?? "—"}
                    </span>
                  </td>
                  <td>
                    <span className={`badge text-[11px] ${
                      p.statut === "reussi" || p.statut === "simule" ? "badge-green" :
                      p.statut === "initie" ? "badge-amber" : "badge-red"
                    }`}>
                      {p.statut === "reussi" ? "✅ Réussi" :
                       p.statut === "simule" ? "🧪 Test" :
                       p.statut === "initie" ? "⏳ En cours" : "❌ Échoué"}
                    </span>
                  </td>
                  <td className="text-slate-400 text-xs font-mono">{p.reference?.slice(-10) ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

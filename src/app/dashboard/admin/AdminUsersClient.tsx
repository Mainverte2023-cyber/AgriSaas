"use client";
import { useState } from "react";

const ROLES = [
  { value: "admin_client",   label: "Administrateur client" },
  { value: "agent_terrain",  label: "Agent terrain" },
  { value: "technicien",     label: "Technicien agricole" },
  { value: "comptable",      label: "Comptable" },
  { value: "observateur",    label: "Observateur" },
];

const ROLE_BADGES: Record<string, string> = {
  super_admin:   "badge-red",
  admin_client:  "badge-green",
  agent_terrain: "badge-amber",
  technicien:    "badge-blue",
  comptable:     "badge-blue",
  observateur:   "badge-slate",
};

interface Props {
  utilisateurs: any[];
  organisations: any[];
}

export default function AdminUsersClient({ utilisateurs, organisations }: Props) {
  const [mode, setMode] = useState<"email" | "telephone" | "manuel">("telephone");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [form, setForm] = useState({
    email: "", telephone: "", password: "", nom_complet: "",
    role: "admin_client", organisation_id: organisations[0]?.id ?? "",
    nouvelle_org: "", pays: "Guinée",
  });
  const [creerOrg, setCreerOrg] = useState(false);

  function setField(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const res = await fetch("/api/admin/creer-utilisateur", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, mode, creerOrg }),
    });
    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      setMessage({ text: data.message ?? "Utilisateur créé avec succès !", ok: true });
      setForm((f) => ({ ...f, email: "", password: "", nom_complet: "", telephone: "", nouvelle_org: "" }));
      setTimeout(() => window.location.reload(), 1500);
    } else {
      setMessage({ text: data.error ?? "Une erreur est survenue.", ok: false });
    }
  }

  return (
    <div className="animate-fade-up space-y-8 max-w-6xl">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-800">⚙️ Administration</h1>
        <p className="text-slate-500 text-sm mt-0.5">Gérez les utilisateurs, clients et agents de la plateforme</p>
      </div>

      {/* Formulaire création utilisateur */}
      <div className="section-card section-body">
        <h2 className="font-bold text-slate-800 text-lg mb-5">➕ Créer un utilisateur</h2>

        {/* Choix du mode */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <button
            type="button"
            onClick={() => setMode("telephone")}
            className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${
              mode === "telephone"
                ? "border-green-500 bg-green-50 text-green-700"
                : "border-slate-200 text-slate-500 hover:border-slate-300"
            }`}
          >
            📱 Numéro de téléphone
            <div className="text-xs font-normal mt-0.5 opacity-70">⭐ Option recommandée</div>
          </button>
          <button
            type="button"
            onClick={() => setMode("email")}
            className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${
              mode === "email"
                ? "border-green-500 bg-green-50 text-green-700"
                : "border-slate-200 text-slate-500 hover:border-slate-300"
            }`}
          >
            📧 Email
            <div className="text-xs font-normal mt-0.5 opacity-70">Invitation automatique</div>
          </button>
          <button
            type="button"
            onClick={() => setMode("manuel")}
            className={`flex-1 min-w-[140px] py-3 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${
              mode === "manuel"
                ? "border-green-500 bg-green-50 text-green-700"
                : "border-slate-200 text-slate-500 hover:border-slate-300"
            }`}
          >
            🔑 Identifiant libre
            <div className="text-xs font-normal mt-0.5 opacity-70">Nom d'utilisateur personnalisé</div>
          </button>
        </div>

        {message && (
          <div className={`mb-5 p-3 rounded-xl text-sm font-medium ${message.ok ? "alert-success" : "alert-urgent"}`}>
            {message.ok ? "✅" : "❌"} {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Nom complet *</label>
              <input className="input" value={form.nom_complet} onChange={e => setField("nom_complet", e.target.value)} placeholder="Ex : Mamadou Diallo" required />
            </div>
            <div>
              <label className="field-label">Téléphone</label>
              <input className="input" value={form.telephone} onChange={e => setField("telephone", e.target.value)} placeholder="Ex : +224 6XX XXX XXX" />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {/* TÉLÉPHONE */}
            {mode === "telephone" && (
              <div>
                <label className="field-label">📱 Numéro de téléphone *</label>
                <input
                  className="input"
                  type="tel"
                  value={form.telephone}
                  onChange={e => setField("telephone", e.target.value)}
                  placeholder="Ex : +224 622 00 00 00"
                  required
                />
                <p className="text-xs text-slate-400 mt-1">
                  Ce numéro servira d'identifiant de connexion.
                </p>
              </div>
            )}

            {/* EMAIL */}
            {mode === "email" && (
              <div>
                <label className="field-label">📧 Email *</label>
                <input
                  className="input"
                  type="email"
                  value={form.email}
                  onChange={e => setField("email", e.target.value)}
                  placeholder="client@email.com"
                  required
                />
              </div>
            )}

            {/* IDENTIFIANT LIBRE */}
            {mode === "manuel" && (
              <div>
                <label className="field-label">🔑 Identifiant libre *</label>
                <input
                  className="input"
                  type="text"
                  value={form.email}
                  onChange={e => setField("email", e.target.value)}
                  placeholder="Ex : mamadou_diallo"
                  required
                />
                <p className="text-xs text-slate-400 mt-1">Sans espace, sans accent.</p>
              </div>
            )}

            {/* Mot de passe (toujours visible sauf email) */}
            <div>
              <label className="field-label">
                Mot de passe {mode === "email" ? "(optionnel)" : "*"}
              </label>
              <input
                className="input"
                type="text"
                value={form.password}
                onChange={e => setField("password", e.target.value)}
                placeholder={mode === "telephone" ? "Ex : 0000 ou MainVerte2026!" : "Ex : MonMDP2026!"}
                required={mode !== "email"}
              />
              {mode === "telephone" && (
                <p className="text-xs text-slate-400 mt-1">
                  💡 Tu peux mettre un mot de passe simple (ex: les 4 derniers chiffres du numéro).
                </p>
              )}
              {mode !== "email" && (
                <p className="text-xs text-amber-600 mt-1 font-medium">
                  📋 Note bien ce mot de passe pour le donner à ton client !
                </p>
              )}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="field-label">Rôle *</label>
              <select className="input" value={form.role} onChange={e => setField("role", e.target.value)}>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Organisation</label>
              <div className="flex gap-2">
                {!creerOrg ? (
                  <select className="input flex-1" value={form.organisation_id} onChange={e => setField("organisation_id", e.target.value)}>
                    {organisations.map(o => <option key={o.id} value={o.id}>{o.nom}</option>)}
                  </select>
                ) : (
                  <input className="input flex-1" value={form.nouvelle_org} onChange={e => setField("nouvelle_org", e.target.value)} placeholder="Nom de la nouvelle organisation" required={creerOrg} />
                )}
                <button
                  type="button"
                  onClick={() => setCreerOrg(c => !c)}
                  className="btn-secondary px-3 text-xs whitespace-nowrap"
                >
                  {creerOrg ? "← Existante" : "+ Nouvelle"}
                </button>
              </div>
            </div>
          </div>

          {creerOrg && (
            <div>
              <label className="field-label">Pays de l'organisation</label>
              <input className="input" value={form.pays} onChange={e => setField("pays", e.target.value)} placeholder="Ex : Guinée, Sénégal, Côte d'Ivoire..." />
            </div>
          )}

          <div className="pt-2">
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Création en cours…</>
              ) : mode === "email" ? "📧 Envoyer l'invitation" : mode === "telephone" ? "📱 Créer le compte" : "🔑 Créer le compte"}
            </button>
          </div>
        </form>
      </div>

      {/* Liste des utilisateurs */}
      <div className="section-card overflow-hidden">
        <div className="section-header">
          <h2 className="font-bold text-slate-800 text-[15px]">👥 Tous les utilisateurs ({utilisateurs.length})</h2>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Organisation</th>
              <th>Rôle</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {utilisateurs.length > 0 ? utilisateurs.map((u: any) => (
              <tr key={u.id}>
                <td>
                  <div className="font-semibold text-slate-800">{u.nom_complet ?? "—"}</div>
                  <div className="text-xs text-slate-400">{u.telephone ?? ""}</div>
                </td>
                <td>
                  <span className="badge badge-slate text-[11px]">{u.organisations?.nom ?? "—"}</span>
                </td>
                <td>
                  <span className={`badge ${ROLE_BADGES[u.role] ?? "badge-slate"} text-[11px]`}>
                    {u.role?.replace("_", " ")}
                  </span>
                </td>
                <td>
                  <span className={`badge ${u.actif ? "badge-green" : "badge-slate"} text-[11px]`}>
                    {u.actif ? "Actif" : "Inactif"}
                  </span>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={4} className="text-center py-8 text-slate-400">Aucun utilisateur</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

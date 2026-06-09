"use client";
export const dynamic = "force-dynamic";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

// Convertit un identifiant (email ou téléphone) en email Supabase
function toLoginEmail(identifiant: string): string {
  const s = identifiant.trim();
  // Si c'est un email réel, on l'utilise tel quel
  if (s.includes("@")) return s;
  // Si c'est un numéro de téléphone (commence par + ou chiffres)
  const isPhone = /^[+\d]/.test(s);
  if (isPhone) {
    const clean = s.replace(/[\s\-().]/g, "").replace("+", "");
    return `tel.${clean}@agrisaas.app`;
  }
  // Identifiant libre
  return `user.${s.replace(/\s+/g, ".").toLowerCase()}@agrisaas.app`;
}

export default function LoginPage() {
  const [identifiant, setIdentifiant] = useState("");
  const [password, setPassword]       = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const loginEmail = toLoginEmail(identifiant);
    const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
    if (error) {
      setError("Identifiant ou mot de passe incorrect.");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  async function handleReset() {
    const s = identifiant.trim();
    if (!s) { setError("Entrez d'abord votre email."); return; }
    if (!s.includes("@")) { setError("La réinitialisation est disponible uniquement pour les comptes email."); return; }
    await supabase.auth.resetPasswordForEmail(s, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setError("");
    alert("Email de réinitialisation envoyé. Vérifiez votre boîte mail.");
  }

  return (
    <div className="min-h-screen flex">
      {/* Panneau gauche — image & branding */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 text-white relative overflow-hidden"
        style={{
          background: "linear-gradient(145deg, #14532d 0%, #166534 40%, #15803d 70%, #16a34a 100%)",
          backgroundSize: "200% 200%",
          animation: "gradientFlow 12s ease infinite",
        }}
      >
        {/* Décoration */}
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full opacity-10"
              style={{
                width: `${120 + i * 60}px`, height: `${120 + i * 60}px`,
                background: "white",
                top: `${[10,60,30,70,15,50][i]}%`,
                left: `${[60,10,80,40,20,70][i]}%`,
                transform: "translate(-50%,-50%)",
              }}
            />
          ))}
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-2xl">🌿</div>
            <span className="font-bold text-xl tracking-tight">AgriSaaS</span>
          </div>
          <div className="inline-block bg-white/15 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-medium">
            Plateforme agricole africaine
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl font-extrabold leading-tight">
            Gérez vos champs.<br />
            Suivez vos cultures.<br />
            <span className="text-green-200">Partout, en temps réel.</span>
          </h1>
          <p className="text-white/80 text-lg leading-relaxed">
            Une plateforme SaaS conçue pour les entreprises agricoles africaines —
            agents terrain, directeurs et techniciens connectés sur un seul outil.
          </p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: "🌾", label: "Cultures suivies" },
              { icon: "📍", label: "GPS parcelles" },
              { icon: "📊", label: "Rapports PDF" },
            ].map(({ icon, label }) => (
              <div key={label} className="bg-white/10 rounded-xl p-3 text-center backdrop-blur-sm">
                <div className="text-2xl mb-1">{icon}</div>
                <div className="text-xs text-white/80 font-medium">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-white/50 text-sm">
          © 2026 AgriSaaS · Solution SaaS agricole africaine
        </div>
      </div>

      {/* Panneau droit — formulaire */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white">
        <div className="w-full max-w-md animate-fade-up">
          {/* Mobile brand */}
          <div className="flex lg:hidden items-center gap-2 mb-8 justify-center">
            <div className="w-9 h-9 bg-green-600 rounded-xl flex items-center justify-center text-white text-xl">🌿</div>
            <span className="font-bold text-xl text-green-800">AgriSaaS</span>
          </div>

          <h2 className="text-2xl font-extrabold text-slate-800 mb-1">Connexion</h2>
          <p className="text-slate-500 text-sm mb-8">
            Accédez à votre espace de gestion agricole
          </p>

          {error && (
            <div className="alert-urgent mb-5 text-sm flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="field-label">Téléphone ou email</label>
              <input
                className="input"
                type="text"
                placeholder="Ex : +224 622 00 00 00 ou email@..."
                value={identifiant}
                onChange={(e) => setIdentifiant(e.target.value)}
                required
                autoComplete="username"
              />
              <p className="text-xs text-slate-400 mt-1">Entrez votre numéro de téléphone ou votre adresse email</p>
            </div>
            <div>
              <label className="field-label">Mot de passe</label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3 text-base"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Connexion…
                </>
              ) : "Se connecter →"}
            </button>
          </form>

          <button
            onClick={handleReset}
            className="mt-4 text-sm text-green-700 hover:text-green-900 underline underline-offset-2 transition-colors"
          >
            Mot de passe oublié ?
          </button>

          <div className="mt-10 pt-6 border-t border-slate-100 text-center text-xs text-slate-400">
            Besoin d'un compte ? Contactez votre administrateur AgriSaaS.
          </div>
        </div>
      </div>
    </div>
  );
}

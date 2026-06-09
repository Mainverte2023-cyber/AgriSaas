"use client";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const ROLE_COLORS: Record<string, string> = {
  super_admin: "badge-red", admin_client: "badge-green",
  agent_terrain: "badge-amber", technicien: "badge-blue",
  comptable: "badge-blue", observateur: "badge-slate", client: "badge-teal",
};

interface Props {
  messages: any[]; membres: any[];
  userId: string; orgId: string; profil: any;
}

export default function MessagesClient({ messages: initialMessages, membres, userId, orgId, profil }: Props) {
  const supabase = createClient();
  const [messages, setMessages] = useState(initialMessages);
  const [texte, setTexte] = useState("");
  const [sending, setSending] = useState(false);
  const [destinataire, setDestinataire] = useState<string>("tous");
  const bottomRef = useRef<HTMLDivElement>(null);

  // Scroll auto en bas
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Temps réel avec Supabase Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`messages_${orgId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `organisation_id=eq.${orgId}`,
      }, async (payload) => {
        // Récupérer le profil de l'expéditeur
        const { data: exp } = await supabase
          .from("profils")
          .select("nom_complet, role")
          .eq("id", payload.new.expediteur_id)
          .single();
        setMessages(prev => [...prev, { ...payload.new, profils: exp }]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [orgId]);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if (!texte.trim()) return;
    setSending(true);

    await supabase.from("messages").insert({
      organisation_id: orgId,
      expediteur_id: userId,
      texte: texte.trim(),
      destinataire_id: destinataire !== "tous" ? destinataire : null,
      type: destinataire === "tous" ? "groupe" : "prive",
    });

    setTexte("");
    setSending(false);
  }

  const msgFiltres = messages.filter(m =>
    m.type === "groupe" ||
    m.expediteur_id === userId ||
    m.destinataire_id === userId ||
    m.destinataire_id === null
  );

  function initiales(nom: string) {
    return nom?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) ?? "??";
  }

  function isMyMsg(m: any) { return m.expediteur_id === userId; }

  const colors = ["bg-green-500","bg-blue-500","bg-purple-500","bg-amber-500","bg-teal-500","bg-red-500","bg-pink-500"];
  function getColor(id: string) {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash + id.charCodeAt(i)) % colors.length;
    return colors[hash];
  }

  return (
    <div className="animate-fade-up flex flex-col h-[calc(100vh-120px)] max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">💬 Messagerie</h1>
          <p className="text-slate-500 text-sm">{membres.length} membre(s) dans votre équipe</p>
        </div>
        {/* Membres en ligne */}
        <div className="flex -space-x-2">
          {membres.slice(0, 5).map(m => (
            <div
              key={m.id}
              data-tip={m.nom_complet}
              className={`w-8 h-8 rounded-full ${getColor(m.id)} flex items-center justify-center text-white text-xs font-bold border-2 border-white`}
            >
              {initiales(m.nom_complet)}
            </div>
          ))}
          {membres.length > 5 && (
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold border-2 border-white">
              +{membres.length - 5}
            </div>
          )}
        </div>
      </div>

      {/* Zone messages */}
      <div className="flex-1 section-card overflow-hidden flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {msgFiltres.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 text-center py-12">
              <div className="text-5xl mb-3">💬</div>
              <h3 className="font-bold text-slate-600">Aucun message</h3>
              <p className="text-sm mt-1">Commencez la conversation avec votre équipe !</p>
            </div>
          ) : (
            msgFiltres.map((m: any) => {
              const mine = isMyMsg(m);
              const nom  = mine ? "Vous" : (m.profils?.nom_complet ?? "Agent");
              const role = m.profils?.role ?? "";
              return (
                <div key={m.id} className={`flex gap-2 ${mine ? "flex-row-reverse" : ""}`}>
                  {!mine && (
                    <div className={`w-8 h-8 rounded-full ${getColor(m.expediteur_id)} flex items-center justify-center text-white text-xs font-bold shrink-0 mt-1`}>
                      {initiales(nom)}
                    </div>
                  )}
                  <div className={`max-w-[75%] space-y-1 ${mine ? "items-end" : "items-start"} flex flex-col`}>
                    {!mine && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-600">{nom}</span>
                        <span className={`badge ${ROLE_COLORS[role] ?? "badge-slate"} text-[9px] py-0`}>
                          {role?.replace("_", " ")}
                        </span>
                      </div>
                    )}
                    <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      mine
                        ? "bg-green-600 text-white rounded-tr-sm"
                        : "bg-slate-100 text-slate-800 rounded-tl-sm"
                    }`}>
                      {m.texte}
                    </div>
                    <span className="text-[10px] text-slate-400 px-1">
                      {new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      {m.type === "prive" && " · Message privé 🔒"}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Zone saisie */}
        <div className="border-t border-slate-100 p-3">
          <form onSubmit={envoyer} className="flex gap-2">
            <select
              className="input w-40 text-xs py-2"
              value={destinataire}
              onChange={e => setDestinataire(e.target.value)}
            >
              <option value="tous">👥 Groupe</option>
              {membres.filter(m => m.id !== userId).map(m => (
                <option key={m.id} value={m.id}>🔒 {m.nom_complet}</option>
              ))}
            </select>
            <input
              className="input flex-1"
              value={texte}
              onChange={e => setTexte(e.target.value)}
              placeholder={destinataire === "tous" ? "Écrire à toute l'équipe…" : "Message privé…"}
              autoComplete="off"
            />
            <button type="submit" disabled={sending || !texte.trim()} className="btn-primary px-4">
              {sending ? "…" : "➤"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

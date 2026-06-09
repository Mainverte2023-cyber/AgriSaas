export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import MessagesClient from "./MessagesClient";

export default async function MessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profil } = await supabase.from("profils").select("organisation_id, role, nom_complet").eq("id", user!.id).single();
  const orgId = (profil as any)?.organisation_id;

  const [{ data: messages }, { data: membres }] = await Promise.all([
    supabase.from("messages")
      .select("*, profils!messages_expediteur_id_fkey(nom_complet, role)")
      .eq("organisation_id", orgId)
      .order("created_at", { ascending: true })
      .limit(100),
    supabase.from("profils")
      .select("id, nom_complet, role, telephone")
      .eq("organisation_id", orgId)
      .eq("actif", true),
  ]);

  return (
    <MessagesClient
      messages={messages ?? []}
      membres={membres ?? []}
      userId={user!.id}
      orgId={orgId}
      profil={profil as any}
    />
  );
}

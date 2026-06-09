export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import AbonnementClient from "./AbonnementClient";

export default async function AbonnementPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profil } = await supabase
    .from("profils")
    .select("organisation_id, nom_complet, telephone, role")
    .eq("id", user!.id)
    .single();

  const orgId = (profil as any)?.organisation_id;

  const [{ data: abonnement }, { data: paiements }, { data: org }] = await Promise.all([
    supabase.from("abonnements").select("*").eq("organisation_id", orgId).single(),
    supabase.from("paiements").select("*").eq("organisation_id", orgId).order("created_at", { ascending: false }).limit(15),
    supabase.from("organisations").select("nom, pays").eq("id", orgId).single(),
  ]);

  return (
    <AbonnementClient
      abonnement={abonnement}
      paiements={paiements ?? []}
      org={org}
      profil={profil as any}
      orgId={orgId}
    />
  );
}

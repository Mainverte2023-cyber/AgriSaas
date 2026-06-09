export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import ComptabiliteClient from "./ComptabiliteClient";

export default async function ComptabilitePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profil } = await supabase.from("profils").select("organisation_id, role").eq("id", user!.id).single();
  const orgId = (profil as any)?.organisation_id;

  const [
    { data: ventes },
    { data: depenses },
    { data: cultures },
  ] = await Promise.all([
    supabase.from("ventes").select("*, cultures(type_culture), champs(nom)").eq("organisation_id", orgId).order("date_vente", { ascending: false }),
    supabase.from("applications_intrants").select("*").eq("organisation_id", orgId).order("date_application", { ascending: false }),
    supabase.from("cultures").select("id, type_culture, champs(nom)").eq("organisation_id", orgId).order("type_culture"),
  ]);

  return (
    <ComptabiliteClient
      ventes={ventes ?? []}
      depenses={depenses ?? []}
      cultures={cultures ?? []}
      orgId={orgId}
      userId={user!.id}
    />
  );
}

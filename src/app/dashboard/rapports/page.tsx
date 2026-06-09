export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import RapportsClient from "./RapportsClient";

export default async function RapportsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profil } = await supabase.from("profils").select("organisation_id, role, nom_complet").eq("id", user!.id).single();
  const orgId = (profil as any)?.organisation_id;
  const role  = (profil as any)?.role;

  const isSuperAdmin = role === "super_admin";

  const [
    { data: champs },
    { data: cultures },
    { data: intrants },
    { data: rapports },
    { data: org },
    { data: orgs },
  ] = await Promise.all([
    supabase.from("champs").select("*").eq("organisation_id", orgId).order("nom"),
    supabase.from("cultures").select("*, champs(nom)").eq("organisation_id", orgId).order("created_at", { ascending: false }),
    supabase.from("applications_intrants").select("*").eq("organisation_id", orgId).order("date_application", { ascending: false }),
    supabase.from("rapports_terrain").select("*, profils(nom_complet), champs(nom)").eq("organisation_id", orgId).order("created_at", { ascending: false }).limit(20),
    supabase.from("organisations").select("nom, pays").eq("id", orgId).single(),
    isSuperAdmin
      ? supabase.from("organisations").select("id, nom, pays").order("nom")
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <RapportsClient
      champs={champs ?? []}
      cultures={cultures ?? []}
      intrants={intrants ?? []}
      rapports={rapports ?? []}
      org={org}
      orgs={(orgs as any) ?? []}
      isSuperAdmin={isSuperAdmin}
      orgId={orgId}
    />
  );
}

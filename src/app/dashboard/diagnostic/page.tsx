export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import DiagnosticClient from "./DiagnosticClient";

export default async function DiagnosticPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profil } = await supabase.from("profils").select("organisation_id, role").eq("id", user!.id).single();

  const orgId = (profil as any)?.organisation_id;
  const role = (profil as any)?.role;

  // Super admin voit tout, sinon filtre par organisation
  let query = supabase
    .from("diagnostics")
    .select("*, profils(nom_complet), champs(nom), organisations(nom)")
    .order("created_at", { ascending: false })
    .limit(50);

  if (role !== "super_admin") {
    query = query.eq("organisation_id", orgId);
  }

  const { data: diagnostics } = await query;

  const { data: champs } = await supabase
    .from("champs")
    .select("id, nom")
    .eq("organisation_id", orgId)
    .order("nom");

  return (
    <DiagnosticClient
      diagnostics={diagnostics ?? []}
      champs={champs ?? []}
      userId={user!.id}
      orgId={orgId}
      role={role}
    />
  );
}

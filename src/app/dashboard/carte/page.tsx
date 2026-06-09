export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import CarteClient from "./CarteClient";

export default async function CartePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profil } = await supabase.from("profils").select("organisation_id, role").eq("id", user!.id).single();
  const orgId = (profil as any)?.organisation_id;
  const role  = (profil as any)?.role;

  let query = supabase.from("champs").select("*, cultures(type_culture, statut), organisations(nom)");
  if (role !== "super_admin") query = query.eq("organisation_id", orgId);

  const { data: champs } = await query.order("nom");

  return <CarteClient champs={champs ?? []} role={role} />;
}

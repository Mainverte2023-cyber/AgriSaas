export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import CultureDetailClient from "./CultureDetailClient";

export default async function CultureDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profil } = await supabase.from("profils").select("organisation_id, role").eq("id", user!.id).single();

  const role  = (profil as any)?.role;
  const orgId = (profil as any)?.organisation_id;

  const { data: culture } = await supabase
    .from("cultures")
    .select("*, champs(nom, localisation, organisation_id), organisations(nom)")
    .eq("id", id)
    .single();

  if (!culture) return notFound();

  // Vérifier accès
  const champOrgId = (culture.champs as any)?.organisation_id;
  if (role !== "super_admin" && champOrgId !== orgId) return notFound();

  const [
    { data: intrants },
    { data: ventes },
    { data: depenses_main_oeuvre },
    { data: rapports },
  ] = await Promise.all([
    supabase.from("applications_intrants").select("*").eq("culture_id", id).order("date_application", { ascending: false }),
    supabase.from("ventes").select("*").eq("culture_id", id).order("date_vente", { ascending: false }),
    supabase.from("depenses_culture").select("*").eq("culture_id", id).order("date_depense", { ascending: false }),
    supabase.from("rapports_terrain").select("*, profils(nom_complet)").eq("culture_id", id).order("created_at", { ascending: false }),
  ]);

  return (
    <CultureDetailClient
      culture={culture}
      intrants={intrants ?? []}
      ventes={ventes ?? []}
      depensesCulture={depenses_main_oeuvre ?? []}
      rapports={rapports ?? []}
      orgId={orgId}
      userId={user!.id}
      role={role}
    />
  );
}

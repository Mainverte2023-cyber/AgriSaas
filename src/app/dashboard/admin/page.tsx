export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminUsersClient from "./AdminUsersClient";

export default async function AdminPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profil } = await supabase.from("profils").select("role, organisation_id").eq("id", user!.id).single();

  // Seul le super_admin peut accéder
  if ((profil as any)?.role !== "super_admin") redirect("/dashboard");

  // Charger tous les utilisateurs et organisations
  const { data: utilisateurs } = await supabase
    .from("profils")
    .select("*, organisations(nom)")
    .order("created_at", { ascending: false });

  const { data: organisations } = await supabase
    .from("organisations")
    .select("id, nom, statut")
    .order("nom");

  return (
    <AdminUsersClient
      utilisateurs={utilisateurs ?? []}
      organisations={organisations ?? []}
    />
  );
}

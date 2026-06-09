export const dynamic = "force-dynamic";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Profil + organisation
  const { data: profil } = await supabase
    .from("profils")
    .select("*, organisations(nom, statut)")
    .eq("id", user.id)
    .single();

  // Abonnement suspendu → page d'information
  const orgStatut = (profil as any)?.organisations?.statut;
  if (orgStatut === "suspendu") redirect("/abonnement-suspendu");

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar role={(profil as any)?.role ?? "observateur"} orgNom={(profil as any)?.organisations?.nom ?? ""} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar user={user} profil={profil as any} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

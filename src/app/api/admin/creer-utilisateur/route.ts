import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Client admin avec la service role key (accès total)
function getAdminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(request: Request) {
  try {
    // Vérifier que l'appelant est super_admin
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { data: profil } = await supabase.from("profils").select("role").eq("id", user.id).single();
    if ((profil as any)?.role !== "super_admin") {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const body = await request.json();
    const { mode, email, password, nom_complet, telephone, role, organisation_id, creerOrg, nouvelle_org, pays } = body;

    const admin = getAdminClient();

    // Créer une nouvelle organisation si demandé
    let orgId = organisation_id;
    if (creerOrg && nouvelle_org) {
      const { data: newOrg, error: orgErr } = await admin
        .from("organisations")
        .insert({ nom: nouvelle_org, pays: pays ?? "", statut: "actif" })
        .select("id")
        .single();
      if (orgErr) return NextResponse.json({ error: `Erreur organisation : ${orgErr.message}` }, { status: 400 });
      orgId = newOrg.id;

      // Créer un abonnement de base pour cette organisation
      await admin.from("abonnements").insert({
        organisation_id: orgId, plan: "standard",
        montant_mensuel: 5000, statut: "actif", date_debut: new Date().toISOString().split("T")[0],
      });
    }

    // Construire l'email interne selon le mode
    let loginEmail: string;
    if (mode === "email") {
      loginEmail = email;
    } else if (mode === "telephone") {
      // Nettoyer le numéro : garder seulement les chiffres et le +
      const telClean = telephone.replace(/[\s\-().]/g, "");
      loginEmail = `tel.${telClean.replace("+", "")}@agrisaas.app`;
    } else {
      // Mode manuel : identifiant libre
      loginEmail = `user.${email.replace(/\s+/g, ".").toLowerCase()}@agrisaas.app`;
    }

    // Créer l'utilisateur dans Supabase Auth
    const { data: newUser, error: authErr } = await admin.auth.admin.createUser({
      email: loginEmail,
      password: password ?? Math.random().toString(36).slice(-10) + "A1!",
      email_confirm: true, // pas besoin de confirmer l'email
      user_metadata: { nom_complet, telephone },
    });

    if (authErr) return NextResponse.json({ error: `Erreur auth : ${authErr.message}` }, { status: 400 });

    // Créer le profil dans notre table profils
    const { error: profilErr } = await admin.from("profils").insert({
      id: newUser.user.id,
      organisation_id: orgId,
      nom_complet,
      telephone: telephone ?? null,
      role,
      actif: true,
    });

    if (profilErr) return NextResponse.json({ error: `Erreur profil : ${profilErr.message}` }, { status: 400 });

    // Si mode email → envoyer invitation
    if (mode === "email") {
      await admin.auth.admin.inviteUserByEmail(loginEmail);
      return NextResponse.json({
        message: `✅ Invitation envoyée à ${email}. L'utilisateur recevra un email pour définir son mot de passe.`,
      });
    }

    const identifiantAffiche = mode === "telephone" ? telephone : email;
    return NextResponse.json({
      message: `✅ Compte créé ! Identifiant : ${identifiantAffiche} · Mot de passe : ${password}`,
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Erreur inconnue" }, { status: 500 });
  }
}

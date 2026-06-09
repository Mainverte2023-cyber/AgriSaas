import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

// Orange Money appelle cette URL après paiement
export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("Webhook Orange Money reçu:", body);

    const { status, order_id, txnid, amount } = body;

    if (!order_id) {
      return NextResponse.json({ error: "order_id manquant" }, { status: 400 });
    }

    const admin = adminClient();

    // Mettre à jour le paiement
    const { data: paiement } = await admin
      .from("paiements")
      .update({
        statut: status === "SUCCESS" ? "reussi" : "echoue",
        om_transaction_id: txnid ?? null,
        confirme_le: status === "SUCCESS" ? new Date().toISOString() : null,
      })
      .eq("reference", order_id)
      .select("organisation_id, montant")
      .single();

    // Si paiement réussi → renouveler l'abonnement
    if (status === "SUCCESS" && paiement) {
      const dateDebut = new Date();
      const dateFin   = new Date();
      dateFin.setMonth(dateFin.getMonth() + 1);

      // Chercher l'abonnement existant
      const { data: abo } = await admin
        .from("abonnements")
        .select("id")
        .eq("organisation_id", paiement.organisation_id)
        .single();

      if (abo) {
        // Renouveler
        await admin.from("abonnements").update({
          statut:     "actif",
          date_debut: dateDebut.toISOString().split("T")[0],
          date_fin:   dateFin.toISOString().split("T")[0],
        }).eq("id", abo.id);
      } else {
        // Créer
        await admin.from("abonnements").insert({
          organisation_id: paiement.organisation_id,
          plan:            "standard",
          montant_mensuel: paiement.montant,
          statut:          "actif",
          date_debut:      dateDebut.toISOString().split("T")[0],
          date_fin:        dateFin.toISOString().split("T")[0],
        });
      }

      // Enregistrer dans l'historique des paiements
      await admin.from("paiements_abonnement").insert({
        abonnement_id: abo?.id ?? null,
        montant:       paiement.montant,
        methode:       "orange_money",
        statut:        "reussi",
        reference:     order_id,
      }).select();
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Orange Money peut aussi faire des GET pour vérifier
export async function GET() {
  return NextResponse.json({ status: "webhook actif" });
}

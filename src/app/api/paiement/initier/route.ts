import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdmin } from "@supabase/supabase-js";

function adminClient() {
  return createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });

    const { telephone_om, montant, organisation_id } = await req.json();

    if (!telephone_om || !montant) {
      return NextResponse.json({ error: "Numéro Orange Money et montant requis" }, { status: 400 });
    }

    // Nettoyer le numéro : garder seulement les chiffres
    const telClean = telephone_om.replace(/[\s\-().+]/g, "");

    // Référence unique pour ce paiement
    const reference = `AGRI-${Date.now()}-${Math.random().toString(36).slice(-4).toUpperCase()}`;

    // ── Appel Orange Money API ──
    // Orange Money Guinée utilise l'API Orange Developer
    // Documentation : https://developer.orange.com/apis/om-webpay-gn/
    const omResponse = await fetch("https://api.orange.com/orange-money-webpay/gn/v1/webpayment", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.ORANGE_MONEY_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        merchant_key:    process.env.ORANGE_MONEY_MERCHANT_KEY,
        currency:        "GNF",
        order_id:        reference,
        amount:          montant,
        return_url:      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/abonnement?paiement=success`,
        cancel_url:      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/abonnement?paiement=cancel`,
        notif_url:       `${process.env.NEXT_PUBLIC_APP_URL}/api/paiement/webhook`,
        lang:            "fr",
        reference:       reference,
      }),
    });

    const omData = await omResponse.json();

    if (!omResponse.ok || omData.status === "FAILED") {
      console.error("Orange Money error:", omData);
      // Mode simulation si l'API n'est pas encore configurée
      if (process.env.ORANGE_MONEY_SANDBOX === "true") {
        // Enregistrer paiement en simulation
        const admin = adminClient();
        await admin.from("paiements").insert({
          organisation_id,
          montant,
          telephone: telClean,
          reference,
          methode: "orange_money",
          statut: "simule",
          notes: "Mode sandbox — paiement simulé",
        });
        return NextResponse.json({
          sandbox: true,
          message: "✅ Mode test : paiement simulé avec succès",
          reference,
        });
      }
      return NextResponse.json({ error: omData.message ?? "Erreur Orange Money" }, { status: 400 });
    }

    // Enregistrer le paiement initié
    const admin = adminClient();
    await admin.from("paiements").insert({
      organisation_id,
      montant,
      telephone: telClean,
      reference,
      methode: "orange_money",
      statut: "initie",
      om_pay_token: omData.pay_token ?? null,
    });

    return NextResponse.json({
      success: true,
      payment_url: omData.payment_url,
      reference,
      message: "Redirection vers Orange Money...",
    });

  } catch (err: any) {
    console.error("Erreur paiement:", err);
    return NextResponse.json({ error: err.message ?? "Erreur serveur" }, { status: 500 });
  }
}

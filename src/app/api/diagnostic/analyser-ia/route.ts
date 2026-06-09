import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { imageBase64, symptome, culture } = await req.json();

    if (!imageBase64) {
      return NextResponse.json({ error: "Image requise" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        error: "Clé API IA non configurée. Contactez l'administrateur."
      }, { status: 503 });
    }

    // Appel à Claude (Anthropic) pour analyser la photo
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-opus-4-5",
        max_tokens: 600,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: `Tu es un expert agronome spécialisé en agriculture africaine, particulièrement au Mali.

Analyse cette photo de culture agricole. Le producteur signale : "${symptome}"${culture ? ` sur une culture de ${culture}` : ""}.

Donne une réponse courte et pratique (max 5 lignes) avec :
1. 🔍 Le diagnostic probable (nom de la maladie/problème)
2. 💊 Le traitement recommandé (produits disponibles en Afrique)
3. ⚠️ L'urgence de l'action

Réponds en français simple, adapté à un agriculteur malien.`,
            },
          ],
        }],
      }),
    });

    if (!response.ok) {
      const err = await response.json();
      console.error("Anthropic error:", err);
      return NextResponse.json({ error: "Erreur du service IA" }, { status: 500 });
    }

    const data = await response.json();
    const analyse = data.content?.[0]?.text ?? "Analyse non disponible";

    return NextResponse.json({ analyse });

  } catch (err: any) {
    console.error("IA error:", err);
    return NextResponse.json({ error: err.message ?? "Erreur serveur" }, { status: 500 });
  }
}

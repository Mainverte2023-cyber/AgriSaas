#!/bin/bash
# ============================================================
#  AgriSaaS — Lanceur Mac
#  Double-cliquez pour démarrer l'application.
#  Fermez cette fenêtre pour arrêter le serveur.
# ============================================================

cd "$(dirname "$0")"

PORT=3000
export PATH="/usr/local/bin:/usr/bin:/bin:$PATH"

clear
echo "============================================================"
echo "  🌿  AgriSaaS — Plateforme agricole africaine"
echo "============================================================"
echo ""

# ── Vérifier Node.js ─────────────────────────────────────────
if ! command -v node >/dev/null 2>&1; then
  echo "❌  Node.js est introuvable."
  echo "    Installez-le depuis https://nodejs.org puis réessayez."
  read -p "Appuyez sur Entrée pour fermer..."
  exit 1
fi
echo "✅  Node.js $(node -v) détecté"

# ── Vérifier les dépendances ──────────────────────────────────
if [ ! -d "node_modules" ]; then
  echo ""
  echo "📦  Installation des dépendances (première fois seulement)..."
  npm install --silent
  echo "✅  Dépendances installées"
fi

# ── Vérifier si le port est déjà utilisé ─────────────────────
if lsof -i :$PORT -sTCP:LISTEN >/dev/null 2>&1; then
  echo ""
  echo "⚠️   Le port $PORT est déjà utilisé."
  echo "     Une instance d'AgriSaaS tourne peut-être déjà."
  echo ""
  read -p "Ouvrir quand même le navigateur ? (o/n) : " rep
  if [[ "$rep" == "o" || "$rep" == "O" ]]; then
    open "http://localhost:$PORT"
  fi
  read -p "Appuyez sur Entrée pour fermer..."
  exit 0
fi

# ── Démarrage du serveur ──────────────────────────────────────
echo ""
echo "🚀  Démarrage du serveur AgriSaaS sur http://localhost:$PORT"
echo "    (peut prendre 3 à 10 secondes...)"
echo ""

npm run dev &
SERVER_PID=$!

# ── Attendre que le serveur soit prêt ─────────────────────────
MAX_WAIT=30
WAITED=0
while ! curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT" | grep -q "200\|307"; do
  sleep 1
  WAITED=$((WAITED + 1))
  if [ $WAITED -ge $MAX_WAIT ]; then
    echo "❌  Délai dépassé. Le serveur n'a pas démarré à temps."
    kill $SERVER_PID 2>/dev/null
    read -p "Appuyez sur Entrée pour fermer..."
    exit 1
  fi
done

# ── Ouvrir le navigateur ──────────────────────────────────────
echo "✅  AgriSaaS est prêt !"
echo ""
echo "============================================================"
echo "  🌐  http://localhost:$PORT"
echo "============================================================"
echo ""
echo "  ⚠️  NE FERMEZ PAS cette fenêtre tant que vous utilisez"
echo "      l'application. Fermez-la pour arrêter le serveur."
echo ""
echo "============================================================"
echo ""

open "http://localhost:$PORT"

# ── Maintenir le serveur actif ────────────────────────────────
trap "echo ''; echo '🛑  Arrêt du serveur AgriSaaS...'; kill $SERVER_PID 2>/dev/null; echo '✅  Serveur arrêté. À bientôt !'; exit 0" INT TERM

# Afficher les logs en temps réel
wait $SERVER_PID
echo ""
echo "Le serveur s'est arrêté."
read -p "Appuyez sur Entrée pour fermer..."

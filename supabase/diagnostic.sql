-- Table diagnostics
CREATE TABLE IF NOT EXISTS diagnostics (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id  UUID REFERENCES organisations(id) ON DELETE CASCADE,
  agent_id         UUID REFERENCES auth.users(id),
  champ_id         UUID REFERENCES champs(id),
  symptome         TEXT NOT NULL,
  description      TEXT,
  culture_affectee TEXT,
  gravite          TEXT DEFAULT 'modere' CHECK (gravite IN ('faible','modere','severe','critique')),
  photo_url        TEXT,
  statut           TEXT DEFAULT 'en_attente' CHECK (statut IN ('en_attente','en_cours','resolu')),
  reponse          TEXT,       -- réponse de l'expert / IA
  repondu_par      UUID REFERENCES auth.users(id),
  repondu_le       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE diagnostics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "diagnostics_select" ON diagnostics FOR SELECT
  USING (
    organisation_id = (SELECT organisation_id FROM profils WHERE id = auth.uid())
    OR EXISTS (SELECT 1 FROM profils WHERE id = auth.uid() AND role = 'super_admin')
  );

CREATE POLICY "diagnostics_insert" ON diagnostics FOR INSERT
  WITH CHECK (
    organisation_id = (SELECT organisation_id FROM profils WHERE id = auth.uid())
  );

CREATE POLICY "diagnostics_update" ON diagnostics FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM profils WHERE id = auth.uid() AND role IN ('super_admin','technicien','admin_client'))
  );

-- Bucket photos (à créer manuellement dans Supabase Storage)
-- Nom du bucket : agrisaas-photos
-- Public : oui

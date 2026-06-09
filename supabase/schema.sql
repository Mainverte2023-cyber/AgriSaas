-- =====================================================================
-- AgriSaaS — Schéma de base de données multi-tenant (PostgreSQL / Supabase)
-- À exécuter dans l'éditeur SQL de votre projet Supabase.
-- Active Row Level Security (RLS) pour isoler les données de chaque client.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. ORGANISATIONS (les "clients" / tenants de la plateforme SaaS)
-- ---------------------------------------------------------------------
create table organisations (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  pays text,
  telephone text,
  email text,
  logo_url text,
  statut text not null default 'actif' check (statut in ('actif', 'suspendu', 'essai')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 2. PROFILS UTILISATEUR (étend auth.users de Supabase)
--    Rôles : super_admin (notre entreprise), admin_client, agent_terrain,
--            comptable, technicien, observateur
-- ---------------------------------------------------------------------
create table profils (
  id uuid primary key references auth.users(id) on delete cascade,
  organisation_id uuid references organisations(id) on delete cascade,
  nom_complet text,
  telephone text,
  role text not null default 'observateur'
    check (role in ('super_admin','admin_client','agent_terrain','comptable','technicien','observateur')),
  actif boolean not null default true,
  created_at timestamptz not null default now()
);

-- Accès du super-admin (notre entreprise) à un compte client : doit être
-- explicitement autorisé par le client, et révocable à tout moment.
create table autorisations_acces (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  super_admin_id uuid not null references profils(id) on delete cascade,
  autorise boolean not null default true,
  autorise_le timestamptz not null default now(),
  revoque_le timestamptz
);

-- ---------------------------------------------------------------------
-- 3. ABONNEMENTS SaaS
-- ---------------------------------------------------------------------
create table abonnements (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  plan text not null default 'standard',          -- standard / premium / entreprise
  montant_mensuel numeric not null default 5000,  -- FCFA
  statut text not null default 'actif' check (statut in ('actif','en_retard','suspendu','resilie')),
  date_debut date not null default current_date,
  prochaine_echeance date,
  created_at timestamptz not null default now()
);

create table paiements_abonnement (
  id uuid primary key default gen_random_uuid(),
  abonnement_id uuid not null references abonnements(id) on delete cascade,
  montant numeric not null,
  methode text,                                    -- mobile_money / virement / especes
  reference text,
  date_paiement date not null default current_date,
  periode_couverte text,                           -- ex: '2026-06'
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 4. CHAMPS / PARCELLES
-- ---------------------------------------------------------------------
create table champs (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  nom text not null,
  surface_ha numeric,
  gps_lat double precision,
  gps_lng double precision,
  localisation text,
  photo_url text,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 5. CULTURES (suivi agricole par champ)
-- ---------------------------------------------------------------------
create table cultures (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  champ_id uuid not null references champs(id) on delete cascade,
  type_culture text not null,
  variete text,
  date_semis date,
  quantite_semences text,
  date_recolte_prevue date,
  rendement_estime numeric,
  rendement_reel numeric,
  statut text not null default 'en_cours' check (statut in ('planifiee','en_cours','recoltee','abandonnee')),
  created_at timestamptz not null default now()
);

-- Calendrier cultural / historique des travaux
create table travaux_culturaux (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  culture_id uuid not null references cultures(id) on delete cascade,
  type_travail text not null,                      -- semis / sarclage / traitement / recolte / autre
  date_prevue date,
  date_realisation date,
  statut text not null default 'planifie' check (statut in ('planifie','realise','annule')),
  agent_id uuid references profils(id),
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 6. INTRANTS (engrais, phytosanitaires, herbicides, insecticides...)
-- ---------------------------------------------------------------------
create table applications_intrants (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  culture_id uuid not null references cultures(id) on delete cascade,
  categorie text not null check (categorie in ('engrais','herbicide','insecticide','fongicide','autre_phyto')),
  produit text not null,
  quantite text,
  date_application date not null default current_date,
  cout numeric default 0,
  agent_id uuid references profils(id),
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 7. IRRIGATION
-- ---------------------------------------------------------------------
create table systemes_irrigation (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  champ_id uuid not null references champs(id) on delete cascade,
  type_irrigation text,                            -- goutte_a_goutte / aspersion / gravitaire / autre
  notes text,
  created_at timestamptz not null default now()
);

create table releves_irrigation (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  systeme_id uuid not null references systemes_irrigation(id) on delete cascade,
  date date not null default current_date,
  consommation_m3 numeric,
  type_evenement text not null default 'irrigation' check (type_evenement in ('irrigation','maintenance','panne')),
  cout numeric default 0,
  notes text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 8. RAPPORTS DE TERRAIN (agents)
-- ---------------------------------------------------------------------
create table rapports_terrain (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  agent_id uuid not null references profils(id),
  champ_id uuid references champs(id),
  culture_id uuid references cultures(id),
  titre text not null,
  description text,
  gps_lat double precision,
  gps_lng double precision,
  photo_avant_url text,
  photo_apres_url text,
  date_intervention timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 9. DÉPENSES
-- ---------------------------------------------------------------------
create table depenses (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  champ_id uuid references champs(id),
  culture_id uuid references cultures(id),
  categorie text not null,                         -- intrants / main_oeuvre / equipement / irrigation / autre
  montant numeric not null,
  date date not null default current_date,
  description text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 10. ALERTES & NOTIFICATIONS
-- ---------------------------------------------------------------------
create table alertes (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  champ_id uuid references champs(id),
  culture_id uuid references cultures(id),
  type_alerte text not null,                       -- traitement / irrigation / maladie / calendrier / abonnement
  titre text not null,
  message text,
  niveau text not null default 'info' check (niveau in ('info','attention','urgent')),
  lue boolean not null default false,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- ROW LEVEL SECURITY — isolation stricte des données par organisation
-- =====================================================================
alter table organisations enable row level security;
alter table profils enable row level security;
alter table autorisations_acces enable row level security;
alter table abonnements enable row level security;
alter table paiements_abonnement enable row level security;
alter table champs enable row level security;
alter table cultures enable row level security;
alter table travaux_culturaux enable row level security;
alter table applications_intrants enable row level security;
alter table systemes_irrigation enable row level security;
alter table releves_irrigation enable row level security;
alter table rapports_terrain enable row level security;
alter table depenses enable row level security;
alter table alertes enable row level security;

-- Fonctions utilitaires : organisation et rôle de l'utilisateur connecté
create or replace function mon_organisation_id() returns uuid as $$
  select organisation_id from profils where id = auth.uid()
$$ language sql stable security definer;

create or replace function mon_role() returns text as $$
  select role from profils where id = auth.uid()
$$ language sql stable security definer;

create or replace function est_super_admin() returns boolean as $$
  select mon_role() = 'super_admin'
$$ language sql stable security definer;

-- Le super-admin voit les organisations pour lesquelles un accès est autorisé ;
-- chaque utilisateur voit sa propre organisation.
create policy "Lecture organisation autorisée"
  on organisations for select
  using (
    id = mon_organisation_id()
    or (est_super_admin() and exists (
      select 1 from autorisations_acces a
      where a.organisation_id = organisations.id
        and a.super_admin_id = auth.uid()
        and a.autorise = true
        and a.revoque_le is null
    ))
  );

create policy "Lecture profils de mon organisation"
  on profils for select
  using (organisation_id = mon_organisation_id() or id = auth.uid() or est_super_admin());

-- Politique générique appliquée à toutes les tables métier "tenant-scoped" :
-- visible/modifiable si l'utilisateur appartient à l'organisation, OU si
-- le super-admin a un accès autorisé et non révoqué sur cette organisation.
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'champs','cultures','travaux_culturaux','applications_intrants',
    'systemes_irrigation','releves_irrigation','rapports_terrain',
    'depenses','alertes','abonnements'
  ])
  loop
    execute format($f$
      create policy "tenant_isolation_select_%1$s" on %1$s for select
        using (
          organisation_id = mon_organisation_id()
          or (est_super_admin() and exists (
            select 1 from autorisations_acces a
            where a.organisation_id = %1$s.organisation_id
              and a.super_admin_id = auth.uid()
              and a.autorise = true and a.revoque_le is null
          ))
        );
    $f$, t);
    execute format($f$
      create policy "tenant_isolation_write_%1$s" on %1$s for all
        using (organisation_id = mon_organisation_id())
        with check (organisation_id = mon_organisation_id());
    $f$, t);
  end loop;
end $$;

-- Politique spécifique pour paiements_abonnement (pas de organisation_id direct)
create policy "Lecture paiements abonnement"
  on paiements_abonnement for select
  using (
    abonnement_id in (
      select id from abonnements where organisation_id = mon_organisation_id()
    )
    or est_super_admin()
  );

create policy "Ecriture paiements abonnement"
  on paiements_abonnement for all
  using (
    abonnement_id in (
      select id from abonnements where organisation_id = mon_organisation_id()
    )
  )
  with check (
    abonnement_id in (
      select id from abonnements where organisation_id = mon_organisation_id()
    )
  );

-- Un client peut gérer ses propres autorisations d'accès (autoriser/révoquer)
create policy "Client gère ses autorisations"
  on autorisations_acces for all
  using (organisation_id = mon_organisation_id())
  with check (organisation_id = mon_organisation_id());

create policy "Super-admin voit ses autorisations"
  on autorisations_acces for select
  using (super_admin_id = auth.uid());

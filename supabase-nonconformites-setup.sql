-- ============================================
-- SETUP COMPLET SUPABASE - NON-CONFORMITÉS
-- ============================================

-- 1. SUPPRESSION DES ANCIENNES TABLES
DROP TABLE IF EXISTS public.defauts CASCADE;
DROP TABLE IF EXISTS public.rapports CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.types_defauts CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 2. TABLE DES PROFILS UTILISATEURS
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABLE DES CLIENTS
CREATE TABLE public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. TABLE DES NON-CONFORMITÉS
CREATE TABLE public.nonconformites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero TEXT UNIQUE NOT NULL,
    ordre_fabrication TEXT NOT NULL,
    phase TEXT NOT NULL,
    reference TEXT NOT NULL,
    designation TEXT,
    client_id UUID REFERENCES public.clients(id),
    client_nom TEXT,
    quantite_non_conforme INTEGER NOT NULL,
    type_defaut TEXT NOT NULL,
    description TEXT,
    photos JSONB DEFAULT '[]',

    -- Informations de création
    controleur_id UUID REFERENCES public.profiles(id),
    controleur_name TEXT NOT NULL,
    date_creation TIMESTAMPTZ DEFAULT NOW(),

    -- Statut et workflow
    statut TEXT NOT NULL DEFAULT 'en_attente' CHECK (statut IN ('en_attente', 'en_cours', 'attente_client', 'cloture')),

    -- Réponse client
    reponse_client TEXT,
    date_reponse_client TIMESTAMPTZ,
    action_corrective TEXT,
    delai_correction DATE,

    -- Clôture
    date_cloture TIMESTAMPTZ,
    valide_par UUID REFERENCES public.profiles(id),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABLE DES TYPES DE DÉFAUTS (pour référence)
CREATE TABLE public.types_defauts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nom TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ACTIVATION DE RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nonconformites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.types_defauts ENABLE ROW LEVEL SECURITY;

-- 7. POLITIQUES RLS - PROFILES
CREATE POLICY "Lecture profils pour tous authentifiés"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Création profil pour utilisateurs authentifiés"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

CREATE POLICY "Mise à jour son propre profil"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id);

-- 8. POLITIQUES RLS - CLIENTS
CREATE POLICY "Lecture clients pour tous"
ON public.clients FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Gestion clients pour admins"
ON public.clients FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- 9. POLITIQUES RLS - NON-CONFORMITÉS
CREATE POLICY "Lecture NC pour tous"
ON public.nonconformites FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Création NC pour tous"
ON public.nonconformites FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = controleur_id);

CREATE POLICY "Modification NC par créateur si en_attente"
ON public.nonconformites FOR UPDATE
TO authenticated
USING (
    auth.uid() = controleur_id
    AND statut = 'en_attente'
);

CREATE POLICY "Modification NC par admin"
ON public.nonconformites FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Suppression NC par admin"
ON public.nonconformites FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- 10. POLITIQUES RLS - TYPES DÉFAUTS
CREATE POLICY "Lecture types défauts pour tous"
ON public.types_defauts FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Gestion types défauts pour admins"
ON public.types_defauts FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- 11. DONNÉES INITIALES - CLIENTS
INSERT INTO public.clients (nom) VALUES
('Client A'),
('Client B'),
('Client C')
ON CONFLICT (nom) DO NOTHING;

-- 12. DONNÉES INITIALES - TYPES DÉFAUTS
INSERT INTO public.types_defauts (nom) VALUES
('Défaut dimensionnel'),
('Défaut d''aspect'),
('Défaut de matière'),
('Défaut d''assemblage'),
('Non-conformité documentaire'),
('Autre')
ON CONFLICT (nom) DO NOTHING;

-- 13. FONCTION DE MISE À JOUR AUTOMATIQUE DU TIMESTAMP
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 14. TRIGGER POUR UPDATED_AT
DROP TRIGGER IF EXISTS update_nonconformites_updated_at ON public.nonconformites;
CREATE TRIGGER update_nonconformites_updated_at
    BEFORE UPDATE ON public.nonconformites
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ✅ SETUP TERMINÉ !
-- Vérifications :
SELECT 'Profiles' as table_name, COUNT(*) as count FROM public.profiles
UNION ALL
SELECT 'Clients', COUNT(*) FROM public.clients
UNION ALL
SELECT 'Types Défauts', COUNT(*) FROM public.types_defauts
UNION ALL
SELECT 'Non-conformités', COUNT(*) FROM public.nonconformites;

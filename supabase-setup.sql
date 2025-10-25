-- ============================================
-- INSTALLATION SUPABASE - RAPPORT DE CONTRÔLE
-- ============================================
-- Exécutez ce script dans Supabase SQL Editor

-- ============================================
-- 1. CRÉER LES TABLES
-- ============================================

-- Table des profils utilisateurs
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des rapports
CREATE TABLE IF NOT EXISTS public.rapports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    numero TEXT UNIQUE NOT NULL,
    ordre_fabrication TEXT NOT NULL,
    phase TEXT,
    reference TEXT,
    designation TEXT,
    client TEXT,
    controleur_id UUID REFERENCES public.profiles(id) NOT NULL,
    controleur_name TEXT NOT NULL,
    date_controle TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'en_attente' CHECK (status IN ('en_attente', 'traite', 'resolu')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des défauts
CREATE TABLE IF NOT EXISTS public.defauts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rapport_id UUID REFERENCES public.rapports(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL,
    quantite INTEGER NOT NULL,
    commentaire TEXT,
    photos JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des clients
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nom TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table des types de défauts
CREATE TABLE IF NOT EXISTS public.types_defauts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nom TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- 2. ACTIVER RLS (Row Level Security)
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rapports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defauts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.types_defauts ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. CRÉER LES POLITIQUES RLS
-- ============================================

-- Profils : Lecture pour tous authentifiés, insertion pour anon/authenticated, modifications pour admins
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete" ON public.profiles;

CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_insert" ON public.profiles FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "profiles_update" ON public.profiles FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "profiles_delete" ON public.profiles FOR DELETE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Rapports : Lecture pour tous, création par l'utilisateur, modifications par admins
DROP POLICY IF EXISTS "rapports_select" ON public.rapports;
DROP POLICY IF EXISTS "rapports_insert" ON public.rapports;
DROP POLICY IF EXISTS "rapports_update" ON public.rapports;
DROP POLICY IF EXISTS "rapports_delete" ON public.rapports;

CREATE POLICY "rapports_select" ON public.rapports FOR SELECT TO authenticated USING (true);
CREATE POLICY "rapports_insert" ON public.rapports FOR INSERT TO authenticated WITH CHECK (controleur_id = auth.uid());
CREATE POLICY "rapports_update" ON public.rapports FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "rapports_delete" ON public.rapports FOR DELETE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Défauts : Lecture pour tous, création par propriétaire du rapport, modifications par admins
DROP POLICY IF EXISTS "defauts_select" ON public.defauts;
DROP POLICY IF EXISTS "defauts_insert" ON public.defauts;
DROP POLICY IF EXISTS "defauts_update" ON public.defauts;
DROP POLICY IF EXISTS "defauts_delete" ON public.defauts;

CREATE POLICY "defauts_select" ON public.defauts FOR SELECT TO authenticated USING (true);
CREATE POLICY "defauts_insert" ON public.defauts FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.rapports WHERE id = rapport_id AND controleur_id = auth.uid()));
CREATE POLICY "defauts_update" ON public.defauts FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "defauts_delete" ON public.defauts FOR DELETE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Clients : Lecture pour tous, gestion par admins
DROP POLICY IF EXISTS "clients_select" ON public.clients;
DROP POLICY IF EXISTS "clients_all" ON public.clients;

CREATE POLICY "clients_select" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "clients_all" ON public.clients FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Types de défauts : Lecture pour tous, gestion par admins
DROP POLICY IF EXISTS "types_defauts_select" ON public.types_defauts;
DROP POLICY IF EXISTS "types_defauts_all" ON public.types_defauts;

CREATE POLICY "types_defauts_select" ON public.types_defauts FOR SELECT TO authenticated USING (true);
CREATE POLICY "types_defauts_all" ON public.types_defauts FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================
-- 4. INSÉRER LES DONNÉES DE BASE
-- ============================================

INSERT INTO public.clients (nom) VALUES
    ('Client A'),
    ('Client B'),
    ('Client C')
ON CONFLICT (nom) DO NOTHING;

INSERT INTO public.types_defauts (nom) VALUES
    ('Rayure'),
    ('Bosselure'),
    ('Peinture défectueuse'),
    ('Dimension incorrecte')
ON CONFLICT (nom) DO NOTHING;

-- ============================================
-- ✅ INSTALLATION TERMINÉE
-- ============================================

-- Vérification :
SELECT 'Profils' as table_name, COUNT(*) as count FROM public.profiles
UNION ALL
SELECT 'Rapports', COUNT(*) FROM public.rapports
UNION ALL
SELECT 'Clients', COUNT(*) FROM public.clients
UNION ALL
SELECT 'Types défauts', COUNT(*) FROM public.types_defauts;

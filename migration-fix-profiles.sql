-- ============================================
-- MIGRATION : Correction de la table profiles
-- ============================================
-- Ce script corrige la structure de la table profiles
-- et supprime la colonne email qui n'est plus nécessaire

-- ÉTAPE 1 : Vérifier la structure actuelle
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- ÉTAPE 2 : Supprimer les anciennes politiques RLS
DROP POLICY IF EXISTS "Les profils sont visibles par tous les utilisateurs authentifiés" ON public.profiles;
DROP POLICY IF EXISTS "Seuls les admins peuvent modifier les profils" ON public.profiles;
DROP POLICY IF EXISTS "Profils visibles" ON public.profiles;
DROP POLICY IF EXISTS "Admins gèrent profils" ON public.profiles;

-- ÉTAPE 3 : Supprimer l'ancien trigger et fonction si ils existent
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- ÉTAPE 4 : Recréer la table profiles avec la bonne structure
DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ÉTAPE 5 : Activer RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ÉTAPE 6 : Créer les politiques RLS
CREATE POLICY "Profils visibles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins gèrent profils"
    ON public.profiles FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ÉTAPE 7 : Vérifier que tout est OK
SELECT * FROM public.profiles;

-- ============================================
-- CRÉER VOTRE PREMIER ADMIN
-- ============================================

-- Maintenant, créez l'utilisateur dans Authentication → Users :
-- Email: admin@rapportcontrole.app
-- Password: votre_mot_de_passe
-- Auto Confirm: OUI

-- Puis récupérez l'UUID et exécutez :
/*
SELECT id, email FROM auth.users WHERE email = 'admin@rapportcontrole.app';

-- Remplacez l'UUID ci-dessous
INSERT INTO public.profiles (id, username, full_name, role)
VALUES (
    'VOTRE-UUID-ICI',
    'admin',
    'Administrateur',
    'admin'
);
*/

-- Vérifier que l'admin a été créé
SELECT p.*, u.email
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.username = 'admin';

-- ✅ Vous devriez voir une ligne avec username='admin'

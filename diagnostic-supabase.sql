-- ============================================
-- DIAGNOSTIC COMPLET SUPABASE
-- ============================================
-- Exécutez ce script pour identifier le problème

-- 1. Vérifier la structure de la table profiles
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- ✅ Résultat attendu : id, username, full_name, role, created_at (PAS de email)

-- 2. Vérifier s'il existe des triggers sur auth.users
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'auth'
  AND event_object_table = 'users';

-- ⚠️ S'il y a un trigger 'on_auth_user_created', c'est lui qui cause le problème

-- 3. Vérifier s'il existe la fonction handle_new_user
SELECT
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name LIKE '%handle%user%';

-- 4. Vérifier les politiques RLS sur profiles
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'profiles';

-- 5. Lister tous les utilisateurs auth existants
SELECT id, email, created_at, confirmed_at, email_confirmed_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 10;

-- 6. Vérifier les profils existants
SELECT * FROM public.profiles;

-- ============================================
-- NETTOYAGE COMPLET
-- ============================================
-- Exécutez cette partie SEULEMENT si vous voulez tout effacer et recommencer

/*
-- Supprimer TOUS les triggers sur auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Supprimer TOUTES les fonctions handle_new_user
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user(auth.users) CASCADE;

-- Supprimer tous les utilisateurs Auth (⚠️ ATTENTION : Cela supprime TOUT)
DELETE FROM auth.users;

-- Supprimer toutes les politiques RLS sur profiles
DROP POLICY IF EXISTS "Les profils sont visibles par tous les utilisateurs authentifiés" ON public.profiles;
DROP POLICY IF EXISTS "Seuls les admins peuvent modifier les profils" ON public.profiles;
DROP POLICY IF EXISTS "Profils visibles" ON public.profiles;
DROP POLICY IF EXISTS "Admins gèrent profils" ON public.profiles;

-- Supprimer et recréer la table profiles
DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activer RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Recréer les politiques RLS
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

-- Vérifier que tout est propre
SELECT * FROM information_schema.triggers
WHERE event_object_table = 'users' AND event_object_schema = 'auth';
-- ✅ Devrait être vide (pas de triggers)

SELECT * FROM information_schema.columns
WHERE table_name = 'profiles' AND table_schema = 'public';
-- ✅ Devrait montrer : id, username, full_name, role, created_at
*/

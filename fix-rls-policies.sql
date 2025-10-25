-- ============================================
-- FIX COMPLET : Politiques RLS pour inscription
-- ============================================
-- Le problème "Failed to fetch" vient des politiques RLS
-- qui bloquent l'accès aux utilisateurs NON authentifiés

-- ============================================
-- ÉTAPE 1 : DÉSACTIVER TEMPORAIREMENT RLS
-- ============================================
-- Pour tester si le problème vient bien de RLS

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Maintenant essayez de créer un utilisateur via test-create-user.html
-- Si ça fonctionne → le problème était bien RLS
-- Si ça ne fonctionne toujours pas → le problème est ailleurs

-- ============================================
-- ÉTAPE 2 : RÉACTIVER RLS AVEC LES BONNES POLITIQUES
-- ============================================
-- Une fois que vous avez confirmé que RLS était le problème

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Supprimer TOUTES les anciennes politiques
DROP POLICY IF EXISTS "Les profils sont visibles par tous les utilisateurs authentifiés" ON public.profiles;
DROP POLICY IF EXISTS "Seuls les admins peuvent modifier les profils" ON public.profiles;
DROP POLICY IF EXISTS "Profils visibles" ON public.profiles;
DROP POLICY IF EXISTS "Admins gèrent profils" ON public.profiles;
DROP POLICY IF EXISTS "Permettre insertion profils" ON public.profiles;
DROP POLICY IF EXISTS "Permettre lecture profils" ON public.profiles;

-- ============================================
-- POLITIQUES RLS CORRECTES
-- ============================================

-- 1. Lecture : Tous les utilisateurs AUTHENTIFIÉS peuvent lire les profils
CREATE POLICY "lecture_profils_authentifies"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (true);

-- 2. Insertion : Permettre l'insertion lors de l'inscription (anon + authenticated)
CREATE POLICY "insertion_nouveau_profil"
    ON public.profiles
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- 3. Mise à jour : Seuls les admins peuvent modifier
CREATE POLICY "maj_profils_admin"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 4. Suppression : Seuls les admins peuvent supprimer
CREATE POLICY "suppression_profils_admin"
    ON public.profiles
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ============================================
-- VÉRIFICATION
-- ============================================

-- Lister toutes les politiques actives sur profiles
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

-- Résultat attendu : 4 politiques
-- 1. lecture_profils_authentifies (SELECT, authenticated)
-- 2. insertion_nouveau_profil (INSERT, anon + authenticated)
-- 3. maj_profils_admin (UPDATE, authenticated)
-- 4. suppression_profils_admin (DELETE, authenticated)

-- ============================================
-- CONFIGURATION SUPABASE À VÉRIFIER
-- ============================================

/*
Vérifiez dans Supabase Dashboard :

1. Authentication → Providers → Email
   ❌ DÉCOCHEZ "Enable email confirmations"
   ❌ DÉCOCHEZ "Enable email signups" (si vous voulez)

2. Authentication → URL Configuration
   Site URL: https://labelh.github.io/RapportDeControle
   Redirect URLs:
   - https://labelh.github.io/**
   - http://localhost:*

3. Settings → API
   Vérifiez que l'URL et la clé correspondent à config.js

4. Database → Tables → profiles
   Vérifiez que RLS est ACTIVÉ (Enable RLS)
*/

-- ============================================
-- TEST FINAL
-- ============================================

-- Une fois les politiques créées, testez avec :
-- https://labelh.github.io/RapportDeControle/test-create-user.html

-- Les logs devraient maintenant montrer :
-- ✅ Étape 1: Vérification username existant... OK
-- ✅ Étape 3: Création du compte Auth... OK
-- ✅ Étape 5: Création du profil... OK

-- ============================================
-- SI ÇA NE FONCTIONNE TOUJOURS PAS
-- ============================================

/*
Vérifiez dans Supabase → Logs :

1. Logs → PostgreSQL
   Regardez s'il y a des erreurs de permission

2. Logs → API
   Regardez les requêtes qui échouent

3. Dans la console du navigateur (F12)
   Regardez l'onglet Network pour voir la vraie erreur HTTP
*/

-- ============================================
-- SOLUTION TEMPORAIRE : DÉSACTIVER COMPLÈTEMENT RLS
-- ============================================

/*
Si vous voulez juste que ça fonctionne MAINTENANT :

ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

⚠️ ATTENTION : Cela désactive la sécurité !
Utilisez seulement pour tester, puis réactivez RLS après.
*/

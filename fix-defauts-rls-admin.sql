-- ============================================
-- CORRECTION POLITIQUE RLS - TABLE DEFAUTS
-- ============================================
-- Problème : Les admins ne peuvent pas insérer de défauts lors de la modification d'un rapport
-- Solution : Permettre l'insertion si l'utilisateur est admin OU propriétaire du rapport

-- Supprimer l'ancienne politique d'insertion
DROP POLICY IF EXISTS "defauts_insert" ON public.defauts;

-- Créer la nouvelle politique : insertion autorisée pour le propriétaire du rapport OU pour les admins
CREATE POLICY "defauts_insert" ON public.defauts FOR INSERT TO authenticated
    WITH CHECK (
        -- Soit l'utilisateur est le contrôleur du rapport
        EXISTS (SELECT 1 FROM public.rapports WHERE id = rapport_id AND controleur_id = auth.uid())
        OR
        -- Soit l'utilisateur est admin
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ============================================
-- ✅ CORRECTION APPLIQUÉE
-- ============================================
-- Les admins peuvent maintenant :
-- 1. Modifier n'importe quel rapport (déjà fonctionnel)
-- 2. Supprimer les anciens défauts (déjà fonctionnel)
-- 3. Insérer de nouveaux défauts (CORRIGÉ)

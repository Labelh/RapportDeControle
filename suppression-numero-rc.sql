-- ============================================
-- SUPPRESSION COLONNE 'numero' (RC) + AJOUT STATUT
-- ============================================
-- Ce script supprime la colonne 'numero' qui contenait les numéros RC
-- car on utilise maintenant directement l'OF interne (ordre_fabrication)
-- ET ajoute le nouveau statut 'en_attente_reponse'

-- 1. Supprimer la contrainte CHECK actuelle sur le statut
ALTER TABLE public.rapports DROP CONSTRAINT IF EXISTS rapports_status_check;

-- 2. Ajouter la nouvelle contrainte CHECK avec le statut 'en_attente_reponse'
ALTER TABLE public.rapports ADD CONSTRAINT rapports_status_check
    CHECK (status IN ('en_attente', 'en_attente_reponse', 'traite', 'resolu'));

-- 3. Supprimer la contrainte d'unicité sur 'numero' si elle existe
ALTER TABLE public.rapports DROP CONSTRAINT IF EXISTS rapports_numero_key;

-- 4. Supprimer la colonne 'numero'
ALTER TABLE public.rapports DROP COLUMN IF EXISTS numero;

-- ============================================
-- ✅ MODIFICATIONS APPLIQUÉES
-- ============================================
-- 1. Le numéro RC n'est plus utilisé
-- 2. L'OF interne (ordre_fabrication) est maintenant affiché partout
-- 3. Nouveau statut 'en_attente_reponse' disponible (appliqué quand on ouvre Gmail)

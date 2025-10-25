-- ============================================
-- MIGRATION RAPIDE - AJOUTER COLONNES NC
-- ============================================
-- Exécutez ce script dans Supabase SQL Editor
-- pour transformer les rapports en non-conformités

-- 1. Ajouter les nouvelles colonnes aux rapports existants
ALTER TABLE public.rapports
ADD COLUMN IF NOT EXISTS reponse_client TEXT,
ADD COLUMN IF NOT EXISTS date_reponse_client TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS action_corrective TEXT,
ADD COLUMN IF NOT EXISTS delai_correction DATE,
ADD COLUMN IF NOT EXISTS date_cloture TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS valide_par UUID REFERENCES public.profiles(id);

-- 2. Mettre à jour les statuts pour correspondre au nouveau workflow
-- en_attente reste en_attente
-- traite → en_cours
-- resolu → cloture
UPDATE public.rapports
SET status = 'en_cours'
WHERE status = 'traite';

UPDATE public.rapports
SET status = 'cloture'
WHERE status = 'resolu';

-- 3. Ajouter le statut "attente_client" aux statuts autorisés
ALTER TABLE public.rapports
DROP CONSTRAINT IF EXISTS rapports_status_check;

ALTER TABLE public.rapports
ADD CONSTRAINT rapports_status_check
CHECK (status IN ('en_attente', 'en_cours', 'attente_client', 'cloture'));

-- 4. Vérification
SELECT
    'Rapports totaux' as description,
    COUNT(*) as nombre
FROM public.rapports
UNION ALL
SELECT
    'En attente',
    COUNT(*)
FROM public.rapports
WHERE status = 'en_attente'
UNION ALL
SELECT
    'En cours',
    COUNT(*)
FROM public.rapports
WHERE status = 'en_cours'
UNION ALL
SELECT
    'Attente client',
    COUNT(*)
FROM public.rapports
WHERE status = 'attente_client'
UNION ALL
SELECT
    'Clôturés',
    COUNT(*)
FROM public.rapports
WHERE status = 'cloture';

-- ✅ Migration terminée !
-- L'application peut maintenant gérer les réponses clients

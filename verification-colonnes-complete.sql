-- ============================================
-- VÉRIFICATION ET AJOUT COLONNES COMPLÈTES
-- ============================================
-- Exécutez ce script dans Supabase SQL Editor
-- pour vous assurer que toutes les colonnes nécessaires existent

-- 1. Ajouter toutes les colonnes manquantes
ALTER TABLE public.rapports
ADD COLUMN IF NOT EXISTS of_client TEXT,
ADD COLUMN IF NOT EXISTS numero_commande TEXT,
ADD COLUMN IF NOT EXISTS reponse_client TEXT;

-- 2. Vérifier que les colonnes existent
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'rapports'
AND column_name IN ('of_client', 'numero_commande', 'reponse_client')
ORDER BY column_name;

-- 3. Vérifier la contrainte de statut
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'rapports_status_check';

-- Si la contrainte n'inclut pas 'traite', la mettre à jour :
ALTER TABLE public.rapports
DROP CONSTRAINT IF EXISTS rapports_status_check;

ALTER TABLE public.rapports
ADD CONSTRAINT rapports_status_check
CHECK (status IN ('en_attente', 'en_cours', 'attente_client', 'traite', 'cloture'));

-- ✅ Toutes les colonnes sont maintenant en place !

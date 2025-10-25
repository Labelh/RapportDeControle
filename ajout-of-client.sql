-- ============================================
-- AJOUT COLONNE OF CLIENT
-- ============================================
-- Exécutez ce script dans Supabase SQL Editor

-- Ajouter la colonne of_client
ALTER TABLE public.rapports
ADD COLUMN IF NOT EXISTS of_client TEXT;

-- Vérification
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'rapports'
AND column_name = 'of_client';

-- ✅ Colonne ajoutée !

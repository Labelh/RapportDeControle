-- ============================================
-- AJOUT COLONNE RÉPONSE CLIENT
-- ============================================
-- Exécutez ce script dans Supabase SQL Editor

-- Ajouter la colonne reponse_client si elle n'existe pas
ALTER TABLE public.rapports
ADD COLUMN IF NOT EXISTS reponse_client TEXT;

-- Vérification
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'rapports'
AND column_name = 'reponse_client';

-- ✅ Colonne ajoutée !

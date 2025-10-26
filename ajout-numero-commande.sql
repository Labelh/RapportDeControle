-- ============================================
-- AJOUT COLONNE NUMÉRO COMMANDE
-- ============================================
-- Exécutez ce script dans Supabase SQL Editor

-- Ajouter la colonne numero_commande
ALTER TABLE public.rapports
ADD COLUMN IF NOT EXISTS numero_commande TEXT;

-- Vérification
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'rapports'
AND column_name = 'numero_commande';

-- ✅ Colonne ajoutée !

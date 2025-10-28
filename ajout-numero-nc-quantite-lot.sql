-- ============================================
-- AJOUT COLONNES N° NC ET QUANTITÉ LOT
-- ============================================
-- Exécutez ce script dans Supabase SQL Editor

-- Ajouter la colonne numero_nc
ALTER TABLE public.rapports
ADD COLUMN IF NOT EXISTS numero_nc TEXT;

-- Ajouter la colonne quantite_lot
ALTER TABLE public.rapports
ADD COLUMN IF NOT EXISTS quantite_lot INTEGER;

-- Vérification
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'rapports'
AND column_name IN ('numero_nc', 'quantite_lot');

-- ✅ Colonnes ajoutées !

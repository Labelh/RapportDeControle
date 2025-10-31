-- Migration pour ajouter la colonne email_genere à la table rapports
-- Cette colonne permet de tracker si un email a été généré pour le rapport
-- et ainsi afficher le bon statut ("À Traiter" vs "En attente de réponse")

-- Ajouter la colonne email_genere (par défaut false)
ALTER TABLE rapports
ADD COLUMN IF NOT EXISTS email_genere BOOLEAN DEFAULT false;

-- Commenter la colonne pour documentation
COMMENT ON COLUMN rapports.email_genere IS 'Indique si un email a été généré pour ce rapport';

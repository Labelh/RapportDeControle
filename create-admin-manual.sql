-- ============================================
-- CRÉER UN ADMIN MANUELLEMENT
-- ============================================
-- Utilisez ce script si create-admin.html ne fonctionne pas
-- à cause de problèmes de configuration Supabase

-- ÉTAPE 1 : Créer l'utilisateur dans Auth
-- Allez dans Authentication → Users → Add user
-- Email: admin@rapportcontrole.app
-- Password: votre_mot_de_passe_choisi
-- Auto Confirm: OUI (cochez la case)
-- Cliquez sur "Create user"

-- ÉTAPE 2 : Récupérer l'UUID de l'utilisateur créé
SELECT id, email, created_at
FROM auth.users
WHERE email = 'admin@rapportcontrole.app';

-- RÉSULTAT : Notez l'UUID (exemple: a1b2c3d4-e5f6-7890-abcd-ef1234567890)

-- ÉTAPE 3 : Créer le profil
-- Remplacez 'VOTRE-UUID-ICI' par l'UUID obtenu à l'étape 2
INSERT INTO public.profiles (id, username, full_name, role)
VALUES (
    'VOTRE-UUID-ICI',  -- ⚠️ REMPLACEZ PAR L'UUID RÉEL
    'admin',
    'Administrateur',
    'admin'
)
ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role;

-- ÉTAPE 4 : Vérifier que le profil a été créé
SELECT * FROM public.profiles WHERE username = 'admin';

-- ✅ Si vous voyez une ligne avec username='admin', c'est bon !

-- ÉTAPE 5 : Tester la connexion
-- Allez sur https://labelh.github.io/RapportDeControle/
-- Username: admin
-- Password: le mot de passe que vous avez défini à l'étape 1

-- ============================================
-- CRÉER D'AUTRES UTILISATEURS
-- ============================================

-- Pour créer un utilisateur normal :
-- 1. Créez dans Auth: username@rapportcontrole.app
-- 2. Exécutez (en remplaçant les valeurs) :

/*
INSERT INTO public.profiles (id, username, full_name, role)
VALUES (
    'UUID-DE-L-UTILISATEUR',
    'nom_utilisateur',
    'Nom Complet',
    'user'  -- ou 'admin'
);
*/

-- ============================================
-- SOLUTION IMMÉDIATE - DÉBLOQUER LA CONNEXION
-- ============================================
-- Exécutez ce script MAINTENANT dans Supabase SQL Editor

-- 1. DÉSACTIVER COMPLÈTEMENT RLS (temporairement)
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.rapports DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.defauts DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.types_defauts DISABLE ROW LEVEL SECURITY;

-- 2. VÉRIFIER QUE L'ADMIN EXISTE
SELECT * FROM public.profiles WHERE username = 'admin';

-- Si la requête ci-dessus ne retourne RIEN, créez l'admin :
-- (Décommentez les lignes suivantes si besoin)

/*
-- D'abord, trouvez l'UUID de l'utilisateur dans auth.users
SELECT id, email FROM auth.users WHERE email LIKE '%admin%';

-- Puis insérez le profil (REMPLACEZ L'UUID)
INSERT INTO public.profiles (id, username, full_name, role)
VALUES (
    'VOTRE-UUID-ICI',
    'admin',
    'Administrateur',
    'admin'
)
ON CONFLICT (id) DO NOTHING;
*/

-- 3. VÉRIFICATION FINALE
SELECT
    p.username,
    p.full_name,
    p.role,
    u.email
FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.username = 'admin';

-- ✅ Si cette dernière requête retourne une ligne, vous pouvez vous connecter !

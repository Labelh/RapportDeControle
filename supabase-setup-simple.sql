-- ============================================
-- CONFIGURATION SUPABASE - RAPPORT DE CONTRÔLE
-- Système d'authentification simplifié (comme GestionDesStocks)
-- ============================================

-- 1. Créer la table des profils utilisateurs
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Créer la table des rapports
CREATE TABLE IF NOT EXISTS public.rapports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    numero TEXT UNIQUE NOT NULL,
    ordre_fabrication TEXT NOT NULL,
    phase TEXT,
    reference TEXT,
    designation TEXT,
    client TEXT,
    controleur_id UUID REFERENCES public.profiles(id) NOT NULL,
    controleur_name TEXT NOT NULL,
    date_controle TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'en_attente' CHECK (status IN ('en_attente', 'traite', 'resolu')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Créer la table des défauts
CREATE TABLE IF NOT EXISTS public.defauts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rapport_id UUID REFERENCES public.rapports(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL,
    quantite INTEGER NOT NULL,
    commentaire TEXT,
    photos JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Créer la table des clients
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nom TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Créer la table des types de défauts
CREATE TABLE IF NOT EXISTS public.types_defauts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nom TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Activer Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rapports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defauts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.types_defauts ENABLE ROW LEVEL SECURITY;

-- 7. Politiques RLS pour profiles
DROP POLICY IF EXISTS "Profils visibles" ON public.profiles;
CREATE POLICY "Profils visibles"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Admins gèrent profils" ON public.profiles;
CREATE POLICY "Admins gèrent profils"
    ON public.profiles FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 8. Politiques RLS pour rapports
DROP POLICY IF EXISTS "Rapports visibles" ON public.rapports;
CREATE POLICY "Rapports visibles"
    ON public.rapports FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Créer rapports" ON public.rapports;
CREATE POLICY "Créer rapports"
    ON public.rapports FOR INSERT
    TO authenticated
    WITH CHECK (controleur_id = auth.uid());

DROP POLICY IF EXISTS "Admins modifient rapports" ON public.rapports;
CREATE POLICY "Admins modifient rapports"
    ON public.rapports FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins suppriment rapports" ON public.rapports;
CREATE POLICY "Admins suppriment rapports"
    ON public.rapports FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 9. Politiques RLS pour défauts
DROP POLICY IF EXISTS "Défauts visibles" ON public.defauts;
CREATE POLICY "Défauts visibles"
    ON public.defauts FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Créer défauts" ON public.defauts;
CREATE POLICY "Créer défauts"
    ON public.defauts FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.rapports
            WHERE id = rapport_id AND controleur_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Admins modifient défauts" ON public.defauts;
CREATE POLICY "Admins modifient défauts"
    ON public.defauts FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

DROP POLICY IF EXISTS "Admins suppriment défauts" ON public.defauts;
CREATE POLICY "Admins suppriment défauts"
    ON public.defauts FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 10. Politiques RLS pour clients
DROP POLICY IF EXISTS "Clients visibles" ON public.clients;
CREATE POLICY "Clients visibles"
    ON public.clients FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Admins gèrent clients" ON public.clients;
CREATE POLICY "Admins gèrent clients"
    ON public.clients FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 11. Politiques RLS pour types_defauts
DROP POLICY IF EXISTS "Types défauts visibles" ON public.types_defauts;
CREATE POLICY "Types défauts visibles"
    ON public.types_defauts FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Admins gèrent types défauts" ON public.types_defauts;
CREATE POLICY "Admins gèrent types défauts"
    ON public.types_defauts FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 12. Insérer des données de base
INSERT INTO public.clients (nom) VALUES
    ('Client A'),
    ('Client B'),
    ('Client C')
ON CONFLICT (nom) DO NOTHING;

INSERT INTO public.types_defauts (nom) VALUES
    ('Rayure'),
    ('Bosselure'),
    ('Peinture défectueuse'),
    ('Dimension incorrecte')
ON CONFLICT (nom) DO NOTHING;

-- ============================================
-- GUIDE D'UTILISATION
-- ============================================

/*
ÉTAPE 1 : Exécutez ce script complet dans l'éditeur SQL de Supabase

ÉTAPE 2 : Créer un utilisateur admin
Utilisez le code JavaScript ci-dessous dans votre console navigateur ou dans l'app :

```javascript
// Se connecter à Supabase
const { createClient } = supabase;
const client = createClient('VOTRE_URL', 'VOTRE_ANON_KEY');

// Créer un admin
async function createAdmin() {
  const username = 'admin';
  const password = 'votre_mot_de_passe';
  const fullName = 'Administrateur';

  // Créer le compte auth
  const email = `${username}@rapportcontrole.app`;
  const { data: authData, error: authError } = await client.auth.signUp({
    email,
    password,
  });

  if (authError) {
    console.error('Erreur:', authError);
    return;
  }

  // Créer le profil
  const { error: profileError } = await client
    .from('profiles')
    .insert([{
      id: authData.user.id,
      username: username,
      full_name: fullName,
      role: 'admin'
    }]);

  if (profileError) {
    console.error('Erreur profil:', profileError);
  } else {
    console.log('✅ Admin créé avec succès!');
    console.log('Username:', username);
    console.log('Password:', password);
  }
}

createAdmin();
```

ÉTAPE 3 : Se connecter avec le username et password
*/

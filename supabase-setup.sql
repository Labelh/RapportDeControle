-- Script SQL pour configurer votre base de données Supabase
-- Exécutez ces commandes dans l'éditeur SQL de Supabase

-- 1. Créer la table des profils utilisateurs (extension de auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Créer la table des rapports
CREATE TABLE public.rapports (
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
CREATE TABLE public.defauts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    rapport_id UUID REFERENCES public.rapports(id) ON DELETE CASCADE NOT NULL,
    type TEXT NOT NULL,
    quantite INTEGER NOT NULL,
    commentaire TEXT,
    photos JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Créer la table des clients
CREATE TABLE public.clients (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nom TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Créer la table des types de défauts
CREATE TABLE public.types_defauts (
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
-- Tout le monde peut lire les profils
CREATE POLICY "Les profils sont visibles par tous les utilisateurs authentifiés"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

-- Seuls les admins peuvent créer/modifier/supprimer des profils
CREATE POLICY "Seuls les admins peuvent modifier les profils"
    ON public.profiles FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 8. Politiques RLS pour rapports
-- Tout le monde peut voir tous les rapports
CREATE POLICY "Les rapports sont visibles par tous"
    ON public.rapports FOR SELECT
    TO authenticated
    USING (true);

-- Les utilisateurs peuvent créer des rapports
CREATE POLICY "Les utilisateurs peuvent créer des rapports"
    ON public.rapports FOR INSERT
    TO authenticated
    WITH CHECK (controleur_id = auth.uid());

-- Les admins peuvent modifier tous les rapports
CREATE POLICY "Les admins peuvent modifier les rapports"
    ON public.rapports FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- Les admins peuvent supprimer les rapports
CREATE POLICY "Les admins peuvent supprimer les rapports"
    ON public.rapports FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 9. Politiques RLS pour défauts
CREATE POLICY "Les défauts sont visibles par tous"
    ON public.defauts FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Les utilisateurs peuvent créer des défauts"
    ON public.defauts FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.rapports
            WHERE id = rapport_id AND controleur_id = auth.uid()
        )
    );

CREATE POLICY "Les admins peuvent modifier les défauts"
    ON public.defauts FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Les admins peuvent supprimer les défauts"
    ON public.defauts FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 10. Politiques RLS pour clients
CREATE POLICY "Les clients sont visibles par tous"
    ON public.clients FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Seuls les admins peuvent gérer les clients"
    ON public.clients FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 11. Politiques RLS pour types_defauts
CREATE POLICY "Les types de défauts sont visibles par tous"
    ON public.types_defauts FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Seuls les admins peuvent gérer les types de défauts"
    ON public.types_defauts FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- 12. Fonction pour créer automatiquement un profil lors de l'inscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username, email, full_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'username', NEW.email),
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'user')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Trigger pour créer le profil automatiquement
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- 14. Insérer des données de base
INSERT INTO public.clients (nom) VALUES
    ('Client A'),
    ('Client B'),
    ('Client C');

INSERT INTO public.types_defauts (nom) VALUES
    ('Rayure'),
    ('Bosselure'),
    ('Peinture défectueuse'),
    ('Dimension incorrecte');

-- 15. Créer un utilisateur admin par défaut (à exécuter après avoir créé l'utilisateur dans Supabase Auth)
-- Remplacez 'EMAIL_ADMIN' par l'email de votre compte admin
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'EMAIL_ADMIN';

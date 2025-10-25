# 🚀 Installation et Configuration - Rapport de Contrôle Qualité

## ⚠️ IMPORTANT : Installation complète depuis zéro

Si vous avez l'erreur **"Failed to create user: Database error"**, suivez ces étapes dans l'ordre :

---

## 📋 Étape 1 : Nettoyer complètement la base de données

Allez dans **Supabase** → **SQL Editor** et exécutez :

```sql
-- Supprimer toutes les tables existantes
DROP TABLE IF EXISTS public.defauts CASCADE;
DROP TABLE IF EXISTS public.rapports CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;
DROP TABLE IF EXISTS public.types_defauts CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Supprimer les anciennes fonctions et triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Nettoyer les utilisateurs Auth (optionnel si vous voulez repartir de zéro)
-- ⚠️ Cela supprimera TOUS les utilisateurs !
-- DELETE FROM auth.users;
```

---

## 📋 Étape 2 : Créer les tables avec la bonne structure

Exécutez le fichier **`supabase-setup-simple.sql`** complet dans SQL Editor.

Ou copiez-collez ce script :

```sql
-- 1. Créer la table des profils (SANS colonne email)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

-- 6. Activer RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rapports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defauts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.types_defauts ENABLE ROW LEVEL SECURITY;

-- 7. Politiques RLS pour profiles
CREATE POLICY "Profils visibles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins gèrent profils" ON public.profiles FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 8. Politiques RLS pour rapports
CREATE POLICY "Rapports visibles" ON public.rapports FOR SELECT TO authenticated USING (true);
CREATE POLICY "Créer rapports" ON public.rapports FOR INSERT TO authenticated WITH CHECK (controleur_id = auth.uid());
CREATE POLICY "Admins modifient rapports" ON public.rapports FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins suppriment rapports" ON public.rapports FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 9. Politiques RLS pour défauts
CREATE POLICY "Défauts visibles" ON public.defauts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Créer défauts" ON public.defauts FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.rapports WHERE id = rapport_id AND controleur_id = auth.uid()));
CREATE POLICY "Admins modifient défauts" ON public.defauts FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admins suppriment défauts" ON public.defauts FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 10. Politiques RLS pour clients
CREATE POLICY "Clients visibles" ON public.clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins gèrent clients" ON public.clients FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 11. Politiques RLS pour types_defauts
CREATE POLICY "Types défauts visibles" ON public.types_defauts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins gèrent types défauts" ON public.types_defauts FOR ALL TO authenticated
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 12. Données de base
INSERT INTO public.clients (nom) VALUES ('Client A'), ('Client B'), ('Client C');
INSERT INTO public.types_defauts (nom) VALUES ('Rayure'), ('Bosselure'), ('Peinture défectueuse'), ('Dimension incorrecte');
```

---

## 📋 Étape 3 : Configurer l'authentification Supabase

1. **Authentication** → **Providers** → **Email**
   - ❌ **DÉSACTIVEZ** "Enable email confirmations"
   - ✅ Cliquez sur **Save**

2. **Authentication** → **URL Configuration**
   - **Site URL** : `https://labelh.github.io`
   - **Redirect URLs** : Ajoutez :
     - `https://labelh.github.io/RapportDeControle/*`
     - `http://localhost:*`
   - ✅ Cliquez sur **Save**

---

## 📋 Étape 4 : Créer le premier administrateur

### Méthode manuelle (recommandée) :

1. **Authentication** → **Users** → **Add user** → **Create new user**
2. Remplissez :
   - **Email** : `admin@rapportcontrole.app`
   - **Password** : votre mot de passe (ex: `Admin123!`)
   - ✅ **COCHEZ** "Auto Confirm User"
3. Cliquez sur **Create user**
4. **Copiez l'UUID** affiché (ex: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

5. Allez dans **SQL Editor** et exécutez :

```sql
-- Vérifier l'UUID de l'utilisateur créé
SELECT id, email, created_at FROM auth.users WHERE email = 'admin@rapportcontrole.app';

-- Créer le profil (remplacez l'UUID)
INSERT INTO public.profiles (id, username, full_name, role)
VALUES (
    'VOTRE-UUID-ICI',  -- ⚠️ Remplacez par l'UUID ci-dessus
    'admin',
    'Administrateur',
    'admin'
);

-- Vérifier que ça a fonctionné
SELECT p.*, u.email FROM public.profiles p
JOIN auth.users u ON p.id = u.id
WHERE p.username = 'admin';
```

✅ Vous devriez voir une ligne avec `username = 'admin'`

---

## 📋 Étape 5 : Tester la connexion

1. Allez sur : **https://labelh.github.io/RapportDeControle/**
2. Connectez-vous avec :
   - **Username** : `admin`
   - **Password** : le mot de passe défini à l'étape 4
3. ✅ **Ça devrait fonctionner !**

---

## 🎯 Ajouter d'autres utilisateurs

Une fois connecté en tant qu'admin, vous pouvez ajouter des utilisateurs via :

1. **Menu** → **Utilisateurs** (visible uniquement pour les admins)
2. Remplissez le formulaire
3. Cliquez sur **Ajouter l'utilisateur**

---

## ❓ Problèmes courants

### Erreur : "Failed to create user: Database error"
➡️ La table `profiles` a encore l'ancienne structure avec la colonne `email`. Exécutez `migration-fix-profiles.sql`

### Erreur : "Failed to fetch"
➡️ La confirmation d'email est activée. Allez dans Authentication → Providers → Email et désactivez "Enable email confirmations"

### Erreur : "Identifiant incorrect"
➡️ Le profil n'existe pas dans la table `profiles`. Vérifiez avec :
```sql
SELECT * FROM public.profiles WHERE username = 'admin';
```

### Erreur : "Mot de passe incorrect"
➡️ Le mot de passe du compte Auth est différent. Réinitialisez-le dans Authentication → Users

---

## 📞 Support

Si vous avez toujours des problèmes, vérifiez :
1. Que la table `profiles` n'a PAS de colonne `email`
2. Que la confirmation d'email est désactivée
3. Que l'utilisateur existe dans `auth.users` ET `public.profiles`
